import { BaseEntity } from './common.types';

export interface InventoryItem extends BaseEntity {
  productId: string;
  productName: string;
  sku: string;
  quantityOnHand: number;
  quantityCommitted: number;
  quantityOnOrder: number;
  availableQuantity: number;
  reorderPoint?: number;
  valuationMethod: 'fifo' | 'average_cost';
  averageCost: string;
  totalValue: string;
  locationQuantities: LocationQuantity[];
}

export interface LocationQuantity {
  locationId: string;
  locationName: string;
  quantity: number;
}

export interface InventoryAdjustment extends BaseEntity {
  date: string;
  productId: string;
  productName: string;
  locationId?: string;
  quantityChange: number;
  newQuantity: number;
  adjustmentAccountId: string;
  reasonCode: 'damage' | 'theft' | 'count_correction' | 'obsolescence' | 'other';
  reference?: string;
  memo?: string;
}

export interface InventoryTransfer extends BaseEntity {
  date: string;
  productId: string;
  fromLocationId: string;
  toLocationId: string;
  quantity: number;
  memo?: string;
}

export interface Assembly extends BaseEntity {
  productId: string;
  productName: string;
  components: AssemblyComponent[];
  assemblyCost: string;
}

export interface AssemblyComponent {
  componentProductId: string;
  componentName: string;
  quantity: number;
  unitCost: string;
}

export interface AssemblyBuild extends BaseEntity {
  assemblyId: string;
  date: string;
  quantityBuilt: number;
  totalCost: string;
  memo?: string;
}

export interface StockTakeWorksheet {
  productId: string;
  productName: string;
  sku: string;
  locationId?: string;
  locationName?: string;
  systemQuantity: number;
  physicalCount?: number;
  variance?: number;
}
