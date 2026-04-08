import { useState, useEffect, useCallback } from 'react';
import { ClipboardList, Plus, Search, Loader2, X, Trash2, CheckCircle2 } from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  ordered: 'bg-blue-50 text-blue-700',
  received: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-red-50 text-red-600',
};

export default function PurchaseOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [receiving, setReceiving] = useState<string | null>(null);

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [items, setItems] = useState<{ product_id: string; product_name: string; quantity: string; unit_price: string }[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState<any[]>([]);
  const [poNotes, setPoNotes] = useState('');

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/purchase-orders');
      let list = data.purchase_orders || data.orders || [];
      if (search) {
        const q = search.toLowerCase();
        list = list.filter((o: any) =>
          o.po_number?.toLowerCase().includes(q) || o.supplier_name?.toLowerCase().includes(q)
        );
      }
      if (statusFilter) {
        list = list.filter((o: any) => o.status === statusFilter);
      }
      setOrders(list);
    } catch { toast.error('Failed to load purchase orders'); }
    finally { setLoading(false); }
  }, [search, statusFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  useEffect(() => {
    Promise.all([
      api.get('/suppliers').then(r => r.data.suppliers || []),
      api.get('/products').then(r => r.data.products || []),
    ]).then(([s, p]) => { setSuppliers(s); setProducts(p); }).catch(() => {});
  }, []);

  const openCreate = () => {
    setSupplierId('');
    setItems([]);
    setPoNotes('');
    setShowCreate(true);
  };

  const searchProduct = (q: string) => {
    setProductSearch(q);
    if (q.length < 2) { setProductResults([]); return; }
    const lower = q.toLowerCase();
    const existing = new Set(items.map(i => i.product_id));
    setProductResults(
      products.filter(p => !existing.has(p.id) && (p.name?.toLowerCase().includes(lower) || p.sku?.toLowerCase().includes(lower))).slice(0, 6)
    );
  };

  const addItem = (product: any) => {
    setItems([...items, {
      product_id: product.id,
      product_name: `${product.name} (${product.sku})`,
      quantity: '1',
      unit_price: String(product.cost_price || ''),
    }]);
    setProductSearch('');
    setProductResults([]);
  };

  const updateItem = (i: number, field: string, val: string) => {
    const updated = [...items];
    updated[i] = { ...updated[i], [field]: val };
    setItems(updated);
  };

  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));

  const total = items.reduce((s, i) => s + (parseFloat(i.quantity) || 0) * (parseFloat(i.unit_price) || 0), 0);

  const createPO = async () => {
    if (!supplierId) { toast.error('Select a supplier'); return; }
    if (items.length === 0) { toast.error('Add at least one item'); return; }
    setSaving(true);
    try {
      await api.post('/purchase-orders', {
        supplier_id: supplierId,
        items: items.map(i => ({
          product_id: i.product_id,
          quantity: parseInt(i.quantity) || 1,
          unit_price: parseFloat(i.unit_price) || 0,
        })),
        notes: poNotes,
      });
      toast.success('Purchase order created');
      setShowCreate(false);
      fetchOrders();
    } catch (e: any) { toast.error(e.response?.data?.detail || 'Failed to create PO'); }
    finally { setSaving(false); }
  };

  const markReceived = async (orderId: string) => {
    if (!confirm('Mark this order as received? This will update stock levels.')) return;
    setReceiving(orderId);
    try {
      await api.post(`/purchase-orders/${orderId}/receive`);
      toast.success('Order marked as received');
      fetchOrders();
    } catch (e: any) { toast.error(e.response?.data?.detail || 'Failed to receive order'); }
    finally { setReceiving(null); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-accent" /> Purchase Orders
        </h2>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:opacity-90">
          <Plus className="h-4 w-4" /> Create PO
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search PO# or supplier..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-accent/30 outline-none" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30">
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="ordered">Ordered</option>
          <option value="received">Received</option>
        </select>
      </div>

      {/* Orders Table */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-gray-500">
                  <th className="px-4 py-3 font-medium">PO #</th>
                  <th className="px-4 py-3 font-medium">Supplier</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium text-center">Items</th>
                  <th className="px-4 py-3 font-medium text-right">Total</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs font-medium">{o.po_number || `PO-${o.id?.slice(-6)}`}</td>
                    <td className="px-4 py-3">{o.supplier_name || '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(o.created_at)}</td>
                    <td className="px-4 py-3 text-center">{(o.items || []).length}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(o.total || 0)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[o.status] || STATUS_STYLES.draft}`}>
                        {o.status || 'draft'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {(o.status === 'ordered' || o.status === 'draft') && (
                        <button onClick={() => markReceived(o.id)} disabled={receiving === o.id}
                          className="flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 rounded text-xs font-medium hover:bg-emerald-100 disabled:opacity-50">
                          {receiving === o.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                          Mark Received
                        </button>
                      )}
                      {o.status === 'received' && (
                        <span className="text-xs text-gray-400">Completed</span>
                      )}
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-12 text-gray-400">No purchase orders found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create PO Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Create Purchase Order</h3>
              <button onClick={() => setShowCreate(false)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              {/* Supplier */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier *</label>
                <select value={supplierId} onChange={e => setSupplierId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30">
                  <option value="">Select supplier...</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} {s.company ? `(${s.company})` : ''}</option>)}
                </select>
              </div>

              {/* Product search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Add Products</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input type="text" value={productSearch} onChange={e => searchProduct(e.target.value)}
                    placeholder="Search product..."
                    className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-accent/30 outline-none" />
                  {productResults.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border rounded-lg shadow-lg max-h-40 overflow-y-auto z-10">
                      {productResults.map(p => (
                        <button key={p.id} onClick={() => addItem(p)}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 border-b last:border-0">
                          {p.name} <span className="text-gray-400">({p.sku})</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Items list */}
              {items.length > 0 && (
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 px-1">
                    <span className="col-span-5">Product</span>
                    <span className="col-span-3 text-right">Qty</span>
                    <span className="col-span-3 text-right">Unit Price</span>
                    <span className="col-span-1"></span>
                  </div>
                  {items.map((item, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center bg-gray-50 rounded-lg p-2">
                      <p className="col-span-5 text-sm truncate">{item.product_name}</p>
                      <div className="col-span-3">
                        <input type="number" min="1" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)}
                          className="w-full px-2 py-1.5 border rounded text-sm text-right outline-none focus:ring-2 focus:ring-accent/30" />
                      </div>
                      <div className="col-span-3">
                        <input type="number" step="0.01" value={item.unit_price} onChange={e => updateItem(i, 'unit_price', e.target.value)}
                          className="w-full px-2 py-1.5 border rounded text-sm text-right outline-none focus:ring-2 focus:ring-accent/30" />
                      </div>
                      <div className="col-span-1 text-center">
                        <button onClick={() => removeItem(i)} className="p-1 text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-3 border-t">
                    <span className="text-sm text-gray-600">{items.length} item(s)</span>
                    <span className="text-lg font-bold text-[#1e293b]">{formatCurrency(total)}</span>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={poNotes} onChange={e => setPoNotes(e.target.value)} rows={2} placeholder="Optional notes..."
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
              <button onClick={createPO} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-[#1e293b] text-white rounded-lg text-sm font-medium disabled:opacity-50">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Create PO
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
