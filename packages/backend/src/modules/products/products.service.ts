import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../database/connection';
import { AppError } from '../../utils/app-error';
import { createAuditLog } from '../../utils/audit';
import { paginate } from '../../utils/pagination';
import { ServiceContext } from '../../types';

export class ProductsService {
  private db = getDatabase();

  async list(schema: string, options: any) {
    let query = this.db.withSchema(schema).table('products').where({ is_deleted: false });
    if (options.type) query = query.where({ type: options.type });
    if (options.search) {
      query = query.where(function() {
        this.where('name', 'ilike', `%${options.search}%`)
          .orWhere('sku', 'ilike', `%${options.search}%`);
      });
    }
    return paginate(query, { page: options.page, limit: options.limit, sortBy: 'name', sortOrder: 'asc' });
  }

  async getById(schema: string, id: string) {
    const product = await this.db.withSchema(schema).table('products')
      .where({ id, is_deleted: false }).first();
    if (!product) throw new AppError('Product not found', 404, 'NOT_FOUND');
    return product;
  }

  async create(ctx: ServiceContext, data: any) {
    const id = uuidv4();
    const sku = data.sku || `SKU-${Date.now()}`;

    await this.db.withSchema(ctx.tenantSchema).table('products').insert({
      id, name: data.name, sku, type: data.type,
      sale_description: data.saleDescription, purchase_description: data.purchaseDescription,
      category_id: data.categoryId, sale_price: data.salePrice || 0,
      purchase_cost: data.purchaseCost || 0, income_account_id: data.incomeAccountId,
      expense_account_id: data.expenseAccountId, asset_account_id: data.assetAccountId,
      tax_code_id: data.taxCodeId, images: JSON.stringify(data.images || []),
      quantity_on_hand: data.quantityOnHand || 0, reorder_point: data.reorderPoint,
      preferred_vendor_id: data.preferredVendorId,
      price_tiers: JSON.stringify(data.priceTiers || []),
      bundle_items: JSON.stringify(data.bundleItems || []),
      created_by: ctx.userId, updated_by: ctx.userId,
    });

    // Record price history
    await this.db.withSchema(ctx.tenantSchema).table('price_history').insert({
      id: uuidv4(), product_id: id, price: data.salePrice || 0,
      effective_date: new Date().toISOString().split('T')[0],
    });

    await createAuditLog(this.db, {
      userId: ctx.userId, userName: ctx.userName,
      ipAddress: ctx.ipAddress, tenantSchema: ctx.tenantSchema,
    }, 'create', 'product', id, [{ field: 'name', newValue: data.name }]);

    return this.getById(ctx.tenantSchema, id);
  }

  async update(ctx: ServiceContext, id: string, data: any) {
    const existing = await this.getById(ctx.tenantSchema, id);
    const updates: Record<string, any> = { updated_at: new Date(), updated_by: ctx.userId };

    const fields: Record<string, string> = {
      name: 'name', saleDescription: 'sale_description', purchaseDescription: 'purchase_description',
      salePrice: 'sale_price', purchaseCost: 'purchase_cost', incomeAccountId: 'income_account_id',
      expenseAccountId: 'expense_account_id', taxCodeId: 'tax_code_id',
      reorderPoint: 'reorder_point', isActive: 'is_active',
    };

    for (const [key, dbField] of Object.entries(fields)) {
      if (data[key] !== undefined) updates[dbField] = data[key];
    }

    if (data.images) updates.images = JSON.stringify(data.images);
    if (data.priceTiers) updates.price_tiers = JSON.stringify(data.priceTiers);

    // Track price changes
    if (data.salePrice && data.salePrice !== String(existing.sale_price)) {
      await this.db.withSchema(ctx.tenantSchema).table('price_history').insert({
        id: uuidv4(), product_id: id, price: data.salePrice,
        effective_date: new Date().toISOString().split('T')[0],
      });
    }

    await this.db.withSchema(ctx.tenantSchema).table('products').where({ id }).update(updates);
    return this.getById(ctx.tenantSchema, id);
  }

  async delete(ctx: ServiceContext, id: string) {
    await this.db.withSchema(ctx.tenantSchema).table('products').where({ id }).update({
      is_deleted: true, deleted_at: new Date(), updated_by: ctx.userId,
    });
  }

  async importProducts(ctx: ServiceContext, products: any[]) {
    let imported = 0;
    for (const p of products) { await this.create(ctx, p); imported++; }
    return { imported, total: products.length };
  }

  async exportProducts(schema: string) {
    return this.db.withSchema(schema).table('products')
      .where({ is_deleted: false }).orderBy('name', 'asc');
  }
}
