import { useState, useEffect } from 'react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Table } from '../components/common/Table';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { Pagination } from '../components/common/Pagination';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Plus, Search, Download, Upload, Edit, Trash2, Package, Wrench } from 'lucide-react';
import { productsApi } from '../services/api';
import toast from 'react-hot-toast';

interface ProductForm {
  name: string;
  sku: string;
  type: string;
  description: string;
  price: string;
  cost: string;
  account: string;
  taxRate: string;
  trackInventory: boolean;
}

const emptyForm: ProductForm = {
  name: '',
  sku: '',
  type: 'service',
  description: '',
  price: '',
  cost: '',
  account: '',
  taxRate: '',
  trackInventory: false,
};

const productTypeOptions = [
  { value: 'service', label: 'Service' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'non-inventory', label: 'Non-Inventory' },
  { value: 'bundle', label: 'Bundle' },
];

export function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);

  const fetchProducts = async (page = 1) => {
    setLoading(true);
    try {
      const res = await productsApi.list({ page, limit: 25, search, type: typeFilter || undefined });
      setProducts(res.data.data || []);
      setPagination(res.data.pagination || { page: 1, limit: 25, total: 0, totalPages: 0 });
    } catch {
      toast.error('Failed to load products');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, [search, typeFilter]);

  const handleCreate = async () => {
    try {
      await productsApi.create({
        ...form,
        price: parseFloat(form.price) || 0,
        cost: parseFloat(form.cost) || 0,
      });
      toast.success('Product created');
      setShowCreate(false);
      setForm(emptyForm);
      fetchProducts();
    } catch {
      toast.error('Failed to create product');
    }
  };

  const handleUpdate = async () => {
    if (!editingProduct) return;
    try {
      await productsApi.update(editingProduct.id, {
        ...form,
        price: parseFloat(form.price) || 0,
        cost: parseFloat(form.cost) || 0,
      });
      toast.success('Product updated');
      setEditingProduct(null);
      setForm(emptyForm);
      fetchProducts();
    } catch {
      toast.error('Failed to update product');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await productsApi.delete(id);
      toast.success('Product deleted');
      fetchProducts();
    } catch {
      toast.error('Failed to delete product');
    }
  };

  const openEdit = (product: any) => {
    setEditingProduct(product);
    setForm({
      name: product.name || '',
      sku: product.sku || '',
      type: product.type || 'service',
      description: product.description || '',
      price: String(product.sell_price || product.price || ''),
      cost: String(product.buy_price || product.cost || ''),
      account: product.account || '',
      taxRate: String(product.tax_rate || ''),
      trackInventory: product.track_inventory || false,
    });
  };

  const getTypeBadge = (type: string) => {
    const variants: Record<string, 'info' | 'success' | 'warning' | 'default'> = {
      service: 'info',
      inventory: 'success',
      'non-inventory': 'warning',
      bundle: 'default',
    };
    const labels: Record<string, string> = {
      service: 'Service',
      inventory: 'Inventory',
      'non-inventory': 'Non-Inventory',
      bundle: 'Bundle',
      product: 'Product',
    };
    return <Badge variant={variants[type] || 'default'}>{labels[type] || type}</Badge>;
  };

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (p: any) => (
        <div className="flex items-center gap-2">
          {p.type === 'service' ? (
            <Wrench size={16} className="text-purple-500" />
          ) : (
            <Package size={16} className="text-blue-500" />
          )}
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{p.name}</p>
            {p.description && (
              <p className="text-xs text-gray-500 truncate max-w-xs">{p.description}</p>
            )}
          </div>
        </div>
      ),
    },
    { key: 'sku', header: 'SKU', render: (p: any) => p.sku || <span className="text-gray-400">No SKU</span> },
    { key: 'type', header: 'Type', render: (p: any) => getTypeBadge(p.type) },
    {
      key: 'sell_price',
      header: 'Price',
      render: (p: any) => `AED ${parseFloat(p.sell_price || p.price || 0).toFixed(2)}`,
    },
    {
      key: 'buy_price',
      header: 'Cost',
      render: (p: any) => `AED ${parseFloat(p.buy_price || p.cost || 0).toFixed(2)}`,
    },
    {
      key: 'quantity_on_hand',
      header: 'Qty on Hand',
      render: (p: any) =>
        p.type === 'inventory' ? (
          <span
            className={`font-medium ${
              (p.quantity_on_hand || 0) <= (p.reorder_point || 5)
                ? 'text-red-600'
                : 'text-gray-900 dark:text-white'
            }`}
          >
            {p.quantity_on_hand ?? 0}
          </span>
        ) : (
          <span className="text-gray-400">N/A</span>
        ),
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (p: any) => (
        <Badge variant={p.is_active !== false ? 'success' : 'default'}>
          {p.is_active !== false ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (p: any) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              openEdit(p);
            }}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Edit"
          >
            <Edit size={14} className="text-gray-500" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(p.id);
            }}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Delete"
          >
            <Trash2 size={14} className="text-red-500" />
          </button>
        </div>
      ),
    },
  ];

  const renderForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Name"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <Input
          label="SKU"
          value={form.sku}
          onChange={(e) => setForm({ ...form, sku: e.target.value })}
        />
      </div>
      <Select
        label="Type"
        required
        options={productTypeOptions}
        value={form.type}
        onChange={(e) => setForm({ ...form, type: e.target.value })}
      />
      <Input
        label="Description"
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
      />
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Selling Price"
          type="number"
          step="0.01"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
        />
        <Input
          label="Cost Price"
          type="number"
          step="0.01"
          value={form.cost}
          onChange={(e) => setForm({ ...form, cost: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Income Account"
          value={form.account}
          onChange={(e) => setForm({ ...form, account: e.target.value })}
        />
        <Input
          label="Tax Rate (%)"
          type="number"
          step="0.01"
          value={form.taxRate}
          onChange={(e) => setForm({ ...form, taxRate: e.target.value })}
        />
      </div>
      {form.type === 'inventory' && (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.trackInventory}
            onChange={(e) => setForm({ ...form, trackInventory: e.target.checked })}
            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">Track inventory quantity</span>
        </label>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Products & Services</h1>
          <p className="text-gray-500 mt-1">Manage your product catalog and service offerings</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Upload size={16} className="mr-1" /> Import
          </Button>
          <Button variant="outline" size="sm">
            <Download size={16} className="mr-1" /> Export
          </Button>
          <Button
            onClick={() => {
              setForm(emptyForm);
              setShowCreate(true);
            }}
          >
            <Plus size={16} className="mr-1" /> New Product
          </Button>
        </div>
      </div>

      <Card padding={false}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-4">
          <div className="relative max-w-sm flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <Select
            options={[{ value: '', label: 'All Types' }, ...productTypeOptions]}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-44"
          />
        </div>
        <Table
          columns={columns}
          data={products}
          loading={loading}
          emptyMessage="No products or services yet. Create your first one!"
        />
        {pagination.totalPages > 1 && (
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            limit={pagination.limit}
            onPageChange={fetchProducts}
          />
        )}
      </Card>

      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="New Product / Service"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>Create Product</Button>
          </>
        }
      >
        {renderForm()}
      </Modal>

      <Modal
        isOpen={!!editingProduct}
        onClose={() => {
          setEditingProduct(null);
          setForm(emptyForm);
        }}
        title="Edit Product / Service"
        size="lg"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setEditingProduct(null);
                setForm(emptyForm);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdate}>Save Changes</Button>
          </>
        }
      >
        {renderForm()}
      </Modal>
    </div>
  );
}
