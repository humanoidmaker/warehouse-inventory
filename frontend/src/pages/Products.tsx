import { useState, useEffect, useCallback } from 'react';
import { Package, Plus, Search, Loader2, X, Eye, Edit2, MapPin, AlertTriangle } from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

const CATEGORIES = ['Electronics', 'Hardware', 'Packaging', 'Raw Materials', 'Tools', 'Safety', 'Cleaning', 'Office', 'Other'];

export default function Products() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [movements, setMovements] = useState<any[] | null>(null);
  const [movementProduct, setMovementProduct] = useState<any>(null);

  const [form, setForm] = useState({
    sku: '', name: '', category: 'Electronics', description: '',
    stock_quantity: '', min_stock_level: '',
    location_aisle: '', location_shelf: '', location_bin: '',
    cost_price: '', sell_price: '', unit: 'pcs',
  });

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = stockFilter === 'low' ? '/products/low-stock' : '/products';
      const { data } = await api.get(endpoint);
      let list = data.products || [];
      if (search) {
        const q = search.toLowerCase();
        list = list.filter((p: any) =>
          p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q)
        );
      }
      if (categoryFilter) {
        list = list.filter((p: any) => p.category === categoryFilter);
      }
      if (stockFilter === 'out') {
        list = list.filter((p: any) => (p.stock_quantity || 0) === 0);
      }
      setProducts(list);
    } catch { toast.error('Failed to load products'); }
    finally { setLoading(false); }
  }, [search, categoryFilter, stockFilter]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const openAdd = () => {
    setEditing(null);
    setForm({ sku: '', name: '', category: 'Electronics', description: '', stock_quantity: '0', min_stock_level: '10', location_aisle: '', location_shelf: '', location_bin: '', cost_price: '', sell_price: '', unit: 'pcs' });
    setShowModal(true);
  };

  const openEdit = (p: any) => {
    setEditing(p);
    setForm({
      sku: p.sku || '', name: p.name || '', category: p.category || 'Electronics',
      description: p.description || '',
      stock_quantity: String(p.stock_quantity ?? ''), min_stock_level: String(p.min_stock_level ?? ''),
      location_aisle: p.location_aisle || p.location?.aisle || '',
      location_shelf: p.location_shelf || p.location?.shelf || '',
      location_bin: p.location_bin || p.location?.bin || '',
      cost_price: String(p.cost_price ?? ''), sell_price: String(p.sell_price ?? ''),
      unit: p.unit || 'pcs',
    });
    setShowModal(true);
  };

  const saveProduct = async () => {
    if (!form.name || !form.sku) { toast.error('SKU and Name are required'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        stock_quantity: parseInt(form.stock_quantity) || 0,
        min_stock_level: parseInt(form.min_stock_level) || 0,
        cost_price: parseFloat(form.cost_price) || 0,
        sell_price: parseFloat(form.sell_price) || 0,
      };
      if (editing) {
        await api.put(`/products/${editing.id}`, payload);
        toast.success('Product updated');
      } else {
        await api.post('/products', payload);
        toast.success('Product created');
      }
      setShowModal(false);
      fetchProducts();
    } catch (e: any) { toast.error(e.response?.data?.detail || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const viewMovements = async (product: any) => {
    setMovementProduct(product);
    try {
      const { data } = await api.get('/stock/movements', { params: { product_id: product.id } });
      setMovements(data.movements || []);
    } catch {
      setMovements([]);
      toast.error('Failed to load movements');
    }
  };

  const getStockColor = (qty: number, min: number) => {
    if (qty <= 0) return { bar: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50' };
    if (qty <= min) return { bar: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-50' };
    if (qty <= min * 2) return { bar: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-50' };
    return { bar: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50' };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Package className="h-6 w-6 text-accent" /> Products
        </h2>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:opacity-90">
          <Plus className="h-4 w-4" /> Add Product
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search SKU or name..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-accent/30 outline-none" />
        </div>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30">
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={stockFilter} onChange={e => setStockFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30">
          <option value="all">All Stock</option>
          <option value="low">Low Stock</option>
          <option value="out">Out of Stock</option>
        </select>
      </div>

      {/* Products Table */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-gray-500">
                  <th className="px-4 py-3 font-medium">SKU</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Stock Level</th>
                  <th className="px-4 py-3 font-medium">Location</th>
                  <th className="px-4 py-3 font-medium text-right">Cost</th>
                  <th className="px-4 py-3 font-medium text-right">Sell</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => {
                  const qty = p.stock_quantity || 0;
                  const min = p.min_stock_level || 0;
                  const colors = getStockColor(qty, min);
                  const maxBar = Math.max(qty, min * 3, 1);
                  return (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs">{p.sku}</td>
                      <td className="px-4 py-3 font-medium">{p.name}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{p.category}</span>
                      </td>
                      <td className="px-4 py-3 min-w-[160px]">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${colors.text}`}>{qty}</span>
                          {qty <= min && qty > 0 && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                          {qty === 0 && <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${colors.bar}`} style={{ width: `${Math.min((qty / maxBar) * 100, 100)}%` }} />
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5">Min: {min}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <MapPin className="h-3 w-3" />
                          {p.location_aisle || p.location?.aisle || '-'}-{p.location_shelf || p.location?.shelf || '-'}-{p.location_bin || p.location?.bin || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">{formatCurrency(p.cost_price)}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(p.sell_price)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => viewMovements(p)} title="Movement History"
                            className="p-1.5 text-gray-400 hover:text-accent rounded hover:bg-gray-100">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button onClick={() => openEdit(p)} title="Edit"
                            className="p-1.5 text-gray-400 hover:text-accent rounded hover:bg-gray-100">
                            <Edit2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {products.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-12 text-gray-400">No products found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{editing ? 'Edit Product' : 'Add Product'}</h3>
              <button onClick={() => setShowModal(false)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKU *</label>
                  <input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30">
                    {['pcs', 'kg', 'ltr', 'mtr', 'box', 'set'].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2}
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock Qty</label>
                  <input type="number" value={form.stock_quantity} onChange={e => setForm({ ...form, stock_quantity: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Stock Level</label>
                  <input type="number" value={form.min_stock_level} onChange={e => setForm({ ...form, min_stock_level: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location (Aisle - Shelf - Bin)</label>
                <div className="grid grid-cols-3 gap-2">
                  <input placeholder="Aisle" value={form.location_aisle} onChange={e => setForm({ ...form, location_aisle: e.target.value })}
                    className="px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
                  <input placeholder="Shelf" value={form.location_shelf} onChange={e => setForm({ ...form, location_shelf: e.target.value })}
                    className="px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
                  <input placeholder="Bin" value={form.location_bin} onChange={e => setForm({ ...form, location_bin: e.target.value })}
                    className="px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price</label>
                  <input type="number" step="0.01" value={form.cost_price} onChange={e => setForm({ ...form, cost_price: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sell Price</label>
                  <input type="number" step="0.01" value={form.sell_price} onChange={e => setForm({ ...form, sell_price: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
              <button onClick={saveProduct} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-[#1e293b] text-white rounded-lg text-sm font-medium disabled:opacity-50">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} {editing ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Movement History Modal */}
      {movements !== null && movementProduct && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold">Movement History</h3>
                <p className="text-sm text-gray-500">{movementProduct.name} ({movementProduct.sku})</p>
              </div>
              <button onClick={() => { setMovements(null); setMovementProduct(null); }}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            {movements.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No stock movements recorded yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Type</th>
                    <th className="pb-2 font-medium text-right">Qty</th>
                    <th className="pb-2 font-medium">Reference</th>
                    <th className="pb-2 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m: any) => (
                    <tr key={m.id} className="border-b last:border-0">
                      <td className="py-2">{formatDate(m.created_at)}</td>
                      <td className="py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          m.type === 'in' ? 'bg-emerald-50 text-emerald-700' :
                          m.type === 'out' ? 'bg-red-50 text-red-700' :
                          'bg-blue-50 text-blue-700'
                        }`}>{m.type === 'in' ? 'Stock In' : m.type === 'out' ? 'Stock Out' : 'Adjust'}</span>
                      </td>
                      <td className={`py-2 text-right font-medium ${m.type === 'in' ? 'text-emerald-600' : m.type === 'out' ? 'text-red-600' : 'text-blue-600'}`}>
                        {m.type === 'in' ? '+' : m.type === 'out' ? '-' : ''}{m.quantity}
                      </td>
                      <td className="py-2 text-gray-500 font-mono text-xs">{m.reference || '-'}</td>
                      <td className="py-2 text-gray-500 text-xs">{m.notes || m.reason || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
