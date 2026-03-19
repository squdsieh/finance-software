import { useState } from 'react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Table } from '../components/common/Table';
import { Plus, Search, Package, AlertTriangle, TrendingDown, TrendingUp, BarChart3 } from 'lucide-react';

export function InventoryPage() {
  const [search, setSearch] = useState('');

  const inventory = [
    { sku: 'PRD-001', name: 'Wireless Keyboard', category: 'Electronics', quantity: 145, reorderPoint: 50, unitCost: 85.00, totalValue: 12325.00, status: 'in_stock' },
    { sku: 'PRD-002', name: 'USB-C Hub', category: 'Electronics', quantity: 23, reorderPoint: 30, unitCost: 120.00, totalValue: 2760.00, status: 'low_stock' },
    { sku: 'PRD-003', name: 'Office Chair Pro', category: 'Furniture', quantity: 0, reorderPoint: 10, unitCost: 850.00, totalValue: 0, status: 'out_of_stock' },
    { sku: 'PRD-004', name: 'Monitor Stand', category: 'Furniture', quantity: 67, reorderPoint: 20, unitCost: 195.00, totalValue: 13065.00, status: 'in_stock' },
    { sku: 'PRD-005', name: 'Ethernet Cable 5m', category: 'Cables', quantity: 312, reorderPoint: 100, unitCost: 15.00, totalValue: 4680.00, status: 'in_stock' },
    { sku: 'PRD-006', name: 'Webcam HD', category: 'Electronics', quantity: 8, reorderPoint: 15, unitCost: 250.00, totalValue: 2000.00, status: 'low_stock' },
  ];

  const statusConfig: Record<string, { variant: string; label: string }> = {
    in_stock: { variant: 'success', label: 'In Stock' },
    low_stock: { variant: 'warning', label: 'Low Stock' },
    out_of_stock: { variant: 'danger', label: 'Out of Stock' },
  };

  const columns = [
    { key: 'sku', header: 'SKU', render: (item: any) => <span className="font-mono text-sm">{item.sku}</span> },
    { key: 'name', header: 'Product', render: (item: any) => (
      <div className="flex items-center gap-2">
        <Package size={14} className="text-gray-400" />
        <div>
          <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
          <p className="text-xs text-gray-500">{item.category}</p>
        </div>
      </div>
    )},
    { key: 'quantity', header: 'Qty on Hand', render: (item: any) => (
      <div className="flex items-center gap-2">
        <span className={`font-medium ${item.quantity <= item.reorderPoint ? 'text-red-600' : ''}`}>{item.quantity}</span>
        {item.quantity <= item.reorderPoint && <AlertTriangle size={14} className="text-yellow-500" />}
      </div>
    )},
    { key: 'reorderPoint', header: 'Reorder Point' },
    { key: 'unitCost', header: 'Unit Cost', render: (item: any) => `AED ${item.unitCost.toFixed(2)}` },
    { key: 'totalValue', header: 'Total Value', render: (item: any) => `AED ${item.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
    { key: 'status', header: 'Status', render: (item: any) => {
      const config = statusConfig[item.status];
      return <Badge variant={config?.variant as any || 'default'}>{config?.label || item.status}</Badge>;
    }},
  ];

  const totalValue = inventory.reduce((s, i) => s + i.totalValue, 0);
  const lowStockCount = inventory.filter(i => i.status === 'low_stock').length;
  const outOfStockCount = inventory.filter(i => i.status === 'out_of_stock').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventory</h1>
          <p className="text-gray-500 mt-1">Monitor stock levels, track movements, and manage reorders</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><TrendingDown size={16} className="mr-1" /> Stock Out</Button>
          <Button variant="outline" size="sm"><TrendingUp size={16} className="mr-1" /> Stock In</Button>
          <Button><Plus size={16} className="mr-1" /> Add Product</Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-500 text-sm"><Package size={16} /> Total Products</div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{inventory.length}</p>
        </div>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-500 text-sm"><BarChart3 size={16} /> Total Value</div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">AED {totalValue.toLocaleString()}</p>
        </div>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-yellow-200 dark:border-yellow-900 bg-yellow-50 dark:bg-yellow-900/10">
          <div className="flex items-center gap-2 text-yellow-600 text-sm"><AlertTriangle size={16} /> Low Stock</div>
          <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400 mt-1">{lowStockCount} items</p>
        </div>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/10">
          <div className="flex items-center gap-2 text-red-600 text-sm"><Package size={16} /> Out of Stock</div>
          <p className="text-2xl font-bold text-red-700 dark:text-red-400 mt-1">{outOfStockCount} items</p>
        </div>
      </div>

      <Card padding={false}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative max-w-sm">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text" placeholder="Search inventory..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
        <Table columns={columns} data={inventory} loading={false} emptyMessage="No inventory items yet." />
      </Card>
    </div>
  );
}
