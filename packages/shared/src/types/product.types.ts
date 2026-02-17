import { BaseEntity } from './common.types';

export type ProductType = 'inventory' | 'non_inventory' | 'service' | 'bundle';

export type InventoryValuationMethod = 'fifo' | 'average_cost';

export interface Product extends BaseEntity {
  name: string;
  sku: string;
  type: ProductType;
  saleDescription?: string;
  purchaseDescription?: string;
  categoryId?: string;
  salePrice: string;
  purchaseCost: string;
  incomeAccountId: string;
  expenseAccountId?: string;
  assetAccountId?: string;
  taxCodeId?: string;
  isActive: boolean;
  images: string[];
  quantityOnHand: number;
  quantityOnOrder: number;
  reorderPoint?: number;
  preferredVendorId?: string;
  barcode?: string;
  priceTiers?: PriceTier[];
  bundleItems?: BundleItem[];
}

export interface PriceTier {
  minQuantity: number;
  maxQuantity?: number;
  price: string;
}

export interface BundleItem {
  productId: string;
  quantity: number;
}

export interface ProductCategory extends BaseEntity {
  name: string;
  parentCategoryId?: string;
  isActive: boolean;
}

export interface PriceHistory {
  id: string;
  productId: string;
  price: string;
  effectiveDate: string;
  createdAt: string;
}
