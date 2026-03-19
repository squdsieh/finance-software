import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../database/connection';
import { AppError } from '../../utils/app-error';
import { paginate } from '../../utils/pagination';
import { ServiceContext } from '../../types';

export class InventoryService {
  private db = getDatabase();

  async listItems(schema: string, options: any) {
    let query = this.db.withSchema(schema).table('inventory_items').where({ is_deleted: false });
    if (options.type) query = query.where({ item_type: options.type });
    if (options.category) query = query.where({ category: options.category });
    if (options.search) query = query.where('name', 'ilike', `%${options.search}%`);
    if (options.isActive !== undefined) query = query.where({ is_active: options.isActive === 'true' });
    return paginate(query, {
      page: parseInt(options.page) || 1, limit: parseInt(options.limit) || 25,
      sortBy: options.sortBy || 'name', sortOrder: options.sortOrder || 'asc',
    });
  }

  async getItem(schema: string, id: string) {
    const item = await this.db.withSchema(schema).table('inventory_items').where({ id, is_deleted: false }).first();
    if (!item) throw new AppError('Inventory item not found', 404);
    const stockByLocation = await this.db.withSchema(schema).table('inventory_stock')
      .where({ item_id: id })
      .leftJoin('inventory_locations', 'inventory_stock.location_id', 'inventory_locations.id')
      .select('inventory_stock.*', 'inventory_locations.name as location_name');
    const recentMovements = await this.db.withSchema(schema).table('inventory_movements')
      .where({ item_id: id }).orderBy('created_at', 'desc').limit(20);
    return { ...item, stockByLocation, recentMovements };
  }

  async createItem(ctx: ServiceContext, data: any) {
    const id = uuidv4();
    await this.db.withSchema(ctx.tenantSchema).table('inventory_items').insert({
      id, sku: data.sku || `SKU-${Date.now()}`, name: data.name, description: data.description,
      item_type: data.itemType || 'product', category: data.category,
      unit_of_measure: data.unitOfMeasure || 'each',
      cost_price: data.costPrice || 0, selling_price: data.sellingPrice || 0,
      reorder_point: data.reorderPoint || 0, reorder_quantity: data.reorderQuantity || 0,
      income_account_id: data.incomeAccountId, expense_account_id: data.expenseAccountId,
      asset_account_id: data.assetAccountId, tax_rate_id: data.taxRateId,
      is_tracked: data.isTracked !== undefined ? data.isTracked : true,
      is_sellable: data.isSellable !== undefined ? data.isSellable : true,
      is_purchasable: data.isPurchasable !== undefined ? data.isPurchasable : true,
      barcode: data.barcode, weight: data.weight, dimensions: data.dimensions,
      image_url: data.imageUrl, created_by: ctx.userId, updated_by: ctx.userId,
    });

    // Initialize stock at default location
    if (data.initialQuantity) {
      const defaultLocation = await this.db.withSchema(ctx.tenantSchema).table('inventory_locations')
        .where({ is_default: true }).first();
      if (defaultLocation) {
        await this.db.withSchema(ctx.tenantSchema).table('inventory_stock').insert({
          id: uuidv4(), item_id: id, location_id: defaultLocation.id,
          quantity_on_hand: data.initialQuantity, quantity_available: data.initialQuantity,
        });
        await this.recordMovement(ctx, id, defaultLocation.id, 'adjustment', data.initialQuantity, 'Initial stock');
      }
    }
    return { id };
  }

  async updateItem(ctx: ServiceContext, id: string, data: any) {
    const updates: Record<string, any> = { updated_at: new Date(), updated_by: ctx.userId };
    const fields: Record<string, string> = {
      name: 'name', description: 'description', category: 'category', sku: 'sku',
      costPrice: 'cost_price', sellingPrice: 'selling_price',
      reorderPoint: 'reorder_point', reorderQuantity: 'reorder_quantity',
      unitOfMeasure: 'unit_of_measure', isActive: 'is_active',
      incomeAccountId: 'income_account_id', expenseAccountId: 'expense_account_id',
      taxRateId: 'tax_rate_id', barcode: 'barcode', imageUrl: 'image_url',
    };
    Object.entries(fields).forEach(([camel, snake]) => {
      if (data[camel] !== undefined) updates[snake] = data[camel];
    });
    await this.db.withSchema(ctx.tenantSchema).table('inventory_items').where({ id }).update(updates);
    return { id };
  }

  async deleteItem(ctx: ServiceContext, id: string) {
    // Check if item has stock
    const stock = await this.db.withSchema(ctx.tenantSchema).table('inventory_stock')
      .where({ item_id: id }).sum('quantity_on_hand as total').first();
    if (parseFloat(stock?.total || '0') > 0) {
      throw new AppError('Cannot delete item with stock on hand. Adjust stock to 0 first.', 400);
    }
    await this.db.withSchema(ctx.tenantSchema).table('inventory_items').where({ id }).update({
      is_deleted: true, updated_at: new Date(), updated_by: ctx.userId,
    });
  }

  async getStockLevels(schema: string, options: any) {
    let query = this.db.withSchema(schema).table('inventory_stock')
      .leftJoin('inventory_items', 'inventory_stock.item_id', 'inventory_items.id')
      .leftJoin('inventory_locations', 'inventory_stock.location_id', 'inventory_locations.id')
      .where({ 'inventory_items.is_deleted': false });
    if (options.locationId) query = query.where({ 'inventory_stock.location_id': options.locationId });
    return query.select(
      'inventory_stock.*', 'inventory_items.name as item_name', 'inventory_items.sku',
      'inventory_locations.name as location_name'
    ).orderBy('inventory_items.name');
  }

  async getItemStock(schema: string, itemId: string) {
    return this.db.withSchema(schema).table('inventory_stock')
      .where({ item_id: itemId })
      .leftJoin('inventory_locations', 'inventory_stock.location_id', 'inventory_locations.id')
      .select('inventory_stock.*', 'inventory_locations.name as location_name');
  }

  async getLowStockAlerts(schema: string) {
    return this.db.withSchema(schema).table('inventory_items')
      .where({ is_deleted: false, is_tracked: true, is_active: true })
      .where('reorder_point', '>', 0)
      .leftJoin(
        this.db.withSchema(schema).table('inventory_stock')
          .select('item_id').sum('quantity_on_hand as total_stock').groupBy('item_id').as('stock'),
        'inventory_items.id', 'stock.item_id'
      )
      .whereRaw('COALESCE(stock.total_stock, 0) <= inventory_items.reorder_point')
      .select('inventory_items.*', this.db.raw('COALESCE(stock.total_stock, 0) as current_stock'));
  }

  async listAdjustments(schema: string, options: any) {
    let query = this.db.withSchema(schema).table('inventory_adjustments');
    if (options.itemId) query = query.where({ item_id: options.itemId });
    return paginate(query, {
      page: parseInt(options.page) || 1, limit: parseInt(options.limit) || 25,
      sortBy: 'created_at', sortOrder: 'desc',
    });
  }

  async createAdjustment(ctx: ServiceContext, data: any) {
    const id = uuidv4();
    await this.db.withSchema(ctx.tenantSchema).table('inventory_adjustments').insert({
      id, adjustment_number: `ADJ-${Date.now()}`, date: data.date || new Date(),
      reason: data.reason, notes: data.notes,
      account_id: data.accountId, status: 'completed', created_by: ctx.userId,
    });

    for (const line of (data.items || [])) {
      const stock = await this.db.withSchema(ctx.tenantSchema).table('inventory_stock')
        .where({ item_id: line.itemId, location_id: line.locationId }).first();

      const currentQty = stock ? parseFloat(stock.quantity_on_hand) : 0;
      const newQty = line.newQuantity !== undefined ? parseFloat(line.newQuantity) : currentQty + parseFloat(line.quantityChange || 0);
      const change = newQty - currentQty;

      if (stock) {
        await this.db.withSchema(ctx.tenantSchema).table('inventory_stock').where({ id: stock.id }).update({
          quantity_on_hand: newQty, quantity_available: newQty, updated_at: new Date(),
        });
      } else {
        await this.db.withSchema(ctx.tenantSchema).table('inventory_stock').insert({
          id: uuidv4(), item_id: line.itemId, location_id: line.locationId,
          quantity_on_hand: newQty, quantity_available: newQty,
        });
      }

      await this.recordMovement(ctx, line.itemId, line.locationId, 'adjustment', change,
        `Adjustment: ${data.reason || 'Manual adjustment'}`);

      await this.db.withSchema(ctx.tenantSchema).table('inventory_adjustment_lines').insert({
        id: uuidv4(), adjustment_id: id, item_id: line.itemId,
        location_id: line.locationId, quantity_before: currentQty,
        quantity_after: newQty, quantity_change: change,
        unit_cost: line.unitCost || 0,
      });
    }
    return { id };
  }

  async getAdjustment(schema: string, id: string) {
    const adjustment = await this.db.withSchema(schema).table('inventory_adjustments').where({ id }).first();
    if (!adjustment) throw new AppError('Adjustment not found', 404);
    const lines = await this.db.withSchema(schema).table('inventory_adjustment_lines')
      .where({ adjustment_id: id })
      .leftJoin('inventory_items', 'inventory_adjustment_lines.item_id', 'inventory_items.id')
      .select('inventory_adjustment_lines.*', 'inventory_items.name as item_name', 'inventory_items.sku');
    return { ...adjustment, lines };
  }

  async listTransfers(schema: string, options: any) {
    let query = this.db.withSchema(schema).table('inventory_transfers');
    if (options.status) query = query.where({ status: options.status });
    return query.orderBy('created_at', 'desc');
  }

  async createTransfer(ctx: ServiceContext, data: any) {
    const id = uuidv4();
    await this.db.withSchema(ctx.tenantSchema).table('inventory_transfers').insert({
      id, transfer_number: `TRF-${Date.now()}`, from_location_id: data.fromLocationId,
      to_location_id: data.toLocationId, date: data.date || new Date(),
      notes: data.notes, status: 'pending', created_by: ctx.userId,
    });

    for (const line of (data.items || [])) {
      // Reduce stock at source
      const stock = await this.db.withSchema(ctx.tenantSchema).table('inventory_stock')
        .where({ item_id: line.itemId, location_id: data.fromLocationId }).first();
      if (!stock || parseFloat(stock.quantity_on_hand) < parseFloat(line.quantity)) {
        throw new AppError(`Insufficient stock for item ${line.itemId}`, 400);
      }

      await this.db.withSchema(ctx.tenantSchema).table('inventory_stock').where({ id: stock.id }).update({
        quantity_on_hand: parseFloat(stock.quantity_on_hand) - parseFloat(line.quantity),
        quantity_available: parseFloat(stock.quantity_available) - parseFloat(line.quantity),
        updated_at: new Date(),
      });

      await this.db.withSchema(ctx.tenantSchema).table('inventory_transfer_lines').insert({
        id: uuidv4(), transfer_id: id, item_id: line.itemId,
        quantity: line.quantity, unit_cost: line.unitCost || 0,
      });

      await this.recordMovement(ctx, line.itemId, data.fromLocationId, 'transfer_out',
        -parseFloat(line.quantity), `Transfer to location`);
    }
    return { id };
  }

  async receiveTransfer(ctx: ServiceContext, id: string) {
    const transfer = await this.db.withSchema(ctx.tenantSchema).table('inventory_transfers').where({ id }).first();
    if (!transfer) throw new AppError('Transfer not found', 404);
    if (transfer.status === 'received') throw new AppError('Transfer already received', 400);

    const lines = await this.db.withSchema(ctx.tenantSchema).table('inventory_transfer_lines')
      .where({ transfer_id: id });

    for (const line of lines) {
      const stock = await this.db.withSchema(ctx.tenantSchema).table('inventory_stock')
        .where({ item_id: line.item_id, location_id: transfer.to_location_id }).first();

      if (stock) {
        await this.db.withSchema(ctx.tenantSchema).table('inventory_stock').where({ id: stock.id }).update({
          quantity_on_hand: parseFloat(stock.quantity_on_hand) + parseFloat(line.quantity),
          quantity_available: parseFloat(stock.quantity_available) + parseFloat(line.quantity),
          updated_at: new Date(),
        });
      } else {
        await this.db.withSchema(ctx.tenantSchema).table('inventory_stock').insert({
          id: uuidv4(), item_id: line.item_id, location_id: transfer.to_location_id,
          quantity_on_hand: line.quantity, quantity_available: line.quantity,
        });
      }

      await this.recordMovement(ctx, line.item_id, transfer.to_location_id, 'transfer_in',
        parseFloat(line.quantity), `Transfer received`);
    }

    await this.db.withSchema(ctx.tenantSchema).table('inventory_transfers').where({ id }).update({
      status: 'received', received_at: new Date(), received_by: ctx.userId, updated_at: new Date(),
    });
  }

  async listLocations(schema: string) {
    return this.db.withSchema(schema).table('inventory_locations')
      .where({ is_active: true }).orderBy('name');
  }

  async createLocation(ctx: ServiceContext, data: any) {
    const id = uuidv4();
    await this.db.withSchema(ctx.tenantSchema).table('inventory_locations').insert({
      id, name: data.name, address: data.address, is_default: data.isDefault || false,
      created_by: ctx.userId,
    });
    return { id };
  }

  async updateLocation(ctx: ServiceContext, id: string, data: any) {
    const updates: Record<string, any> = { updated_at: new Date() };
    if (data.name) updates.name = data.name;
    if (data.address) updates.address = data.address;
    if (data.isActive !== undefined) updates.is_active = data.isActive;
    await this.db.withSchema(ctx.tenantSchema).table('inventory_locations').where({ id }).update(updates);
    return { id };
  }

  async listAssemblies(schema: string) {
    return this.db.withSchema(schema).table('assemblies')
      .where({ is_active: true })
      .leftJoin('inventory_items', 'assemblies.output_item_id', 'inventory_items.id')
      .select('assemblies.*', 'inventory_items.name as output_item_name');
  }

  async createAssembly(ctx: ServiceContext, data: any) {
    const id = uuidv4();
    await this.db.withSchema(ctx.tenantSchema).table('assemblies').insert({
      id, name: data.name, output_item_id: data.outputItemId,
      output_quantity: data.outputQuantity || 1, notes: data.notes,
      created_by: ctx.userId,
    });

    for (const component of (data.components || [])) {
      await this.db.withSchema(ctx.tenantSchema).table('assembly_components').insert({
        id: uuidv4(), assembly_id: id, item_id: component.itemId,
        quantity: component.quantity,
      });
    }
    return { id };
  }

  async buildAssembly(ctx: ServiceContext, assemblyId: string, data: any) {
    const assembly = await this.db.withSchema(ctx.tenantSchema).table('assemblies').where({ id: assemblyId }).first();
    if (!assembly) throw new AppError('Assembly not found', 404);

    const components = await this.db.withSchema(ctx.tenantSchema).table('assembly_components')
      .where({ assembly_id: assemblyId });
    const locationId = data.locationId;
    const buildQuantity = data.quantity || 1;

    // Check and consume components
    for (const comp of components) {
      const requiredQty = parseFloat(comp.quantity) * buildQuantity;
      const stock = await this.db.withSchema(ctx.tenantSchema).table('inventory_stock')
        .where({ item_id: comp.item_id, location_id: locationId }).first();
      if (!stock || parseFloat(stock.quantity_on_hand) < requiredQty) {
        throw new AppError(`Insufficient stock for component ${comp.item_id}`, 400);
      }
      await this.db.withSchema(ctx.tenantSchema).table('inventory_stock').where({ id: stock.id }).update({
        quantity_on_hand: parseFloat(stock.quantity_on_hand) - requiredQty,
        quantity_available: parseFloat(stock.quantity_available) - requiredQty,
        updated_at: new Date(),
      });
      await this.recordMovement(ctx, comp.item_id, locationId, 'assembly_consume',
        -requiredQty, `Consumed for assembly: ${assembly.name}`);
    }

    // Add output item to stock
    const outputQty = parseFloat(assembly.output_quantity) * buildQuantity;
    const outputStock = await this.db.withSchema(ctx.tenantSchema).table('inventory_stock')
      .where({ item_id: assembly.output_item_id, location_id: locationId }).first();
    if (outputStock) {
      await this.db.withSchema(ctx.tenantSchema).table('inventory_stock').where({ id: outputStock.id }).update({
        quantity_on_hand: parseFloat(outputStock.quantity_on_hand) + outputQty,
        quantity_available: parseFloat(outputStock.quantity_available) + outputQty,
        updated_at: new Date(),
      });
    } else {
      await this.db.withSchema(ctx.tenantSchema).table('inventory_stock').insert({
        id: uuidv4(), item_id: assembly.output_item_id, location_id: locationId,
        quantity_on_hand: outputQty, quantity_available: outputQty,
      });
    }
    await this.recordMovement(ctx, assembly.output_item_id, locationId, 'assembly_produce',
      outputQty, `Produced from assembly: ${assembly.name}`);

    return { outputItemId: assembly.output_item_id, quantityProduced: outputQty };
  }

  async valuationReport(schema: string, _options: any) {
    const items = await this.db.withSchema(schema).table('inventory_items')
      .where({ is_deleted: false, is_tracked: true })
      .leftJoin(
        this.db.withSchema(schema).table('inventory_stock')
          .select('item_id').sum('quantity_on_hand as total_stock').groupBy('item_id').as('stock'),
        'inventory_items.id', 'stock.item_id'
      )
      .select('inventory_items.*', this.db.raw('COALESCE(stock.total_stock, 0) as total_stock'));

    const report = items.map((item: any) => ({
      id: item.id, sku: item.sku, name: item.name,
      quantityOnHand: parseFloat(item.total_stock || 0),
      costPrice: parseFloat(item.cost_price || 0),
      totalValue: parseFloat(item.total_stock || 0) * parseFloat(item.cost_price || 0),
    }));

    const totalValue = report.reduce((sum: number, item: any) => sum + item.totalValue, 0);
    return { items: report, totalValue: totalValue.toFixed(2) };
  }

  async movementReport(schema: string, options: any) {
    let query = this.db.withSchema(schema).table('inventory_movements')
      .leftJoin('inventory_items', 'inventory_movements.item_id', 'inventory_items.id')
      .leftJoin('inventory_locations', 'inventory_movements.location_id', 'inventory_locations.id');
    if (options.itemId) query = query.where({ 'inventory_movements.item_id': options.itemId });
    if (options.locationId) query = query.where({ 'inventory_movements.location_id': options.locationId });
    if (options.fromDate) query = query.where('inventory_movements.created_at', '>=', options.fromDate);
    if (options.toDate) query = query.where('inventory_movements.created_at', '<=', options.toDate);
    return query.select(
      'inventory_movements.*', 'inventory_items.name as item_name',
      'inventory_items.sku', 'inventory_locations.name as location_name'
    ).orderBy('inventory_movements.created_at', 'desc').limit(500);
  }

  private async recordMovement(ctx: ServiceContext, itemId: string, locationId: string,
    type: string, quantity: number, description: string) {
    await this.db.withSchema(ctx.tenantSchema).table('inventory_movements').insert({
      id: uuidv4(), item_id: itemId, location_id: locationId,
      movement_type: type, quantity, description, created_by: ctx.userId,
    });
  }
}
