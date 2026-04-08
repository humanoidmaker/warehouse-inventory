import { useState, useEffect } from 'react';
import { ArrowDownToLine, Plus, Trash2, Loader2, Search, CheckCircle, X } from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function StockIn() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<any>(null);

  const [supplierId, setSupplierId] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [items, setItems] = useState<{ product_id: string; product_name: string; sku: string; quantity: string; unit_price: string }[]>([]);

  useEffect(() => {
    Promise.all([
      api.get('/suppliers').then(r => r.data.suppliers || []),
      api.get('/products').then(r => r.data.products || []),
    ]).then(([s, p]) => {
      setSuppliers(s);
      setProducts(p);
    }).catch(() => toast.error('Failed to load data'))
    .finally(() => setLoading(false));
  }, []);

  const searchProducts = (q: string) => {
    setProductSearch(q);
    if (q.length < 2) { setSearchResults([]); return; }
    const lower = q.toLowerCase();
    const existing = new Set(items.map(i => i.product_id));
    setSearchResults(
      products.filter(p =>
        !existing.has(p.id) &&
        (p.name?.toLowerCase().includes(lower) || p.sku?.toLowerCase().includes(lower))
      ).slice(0, 8)
    );
  };

  const addProduct = (product: any) => {
    setItems([...items, {
      product_id: product.id,
      product_name: product.name,
      sku: product.sku,
      quantity: '1',
      unit_price: String(product.cost_price || ''),
    }]);
    setProductSearch('');
    setSearchResults([]);
  };

  const updateItem = (index: number, field: string, value: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

  const totalAmount = items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0), 0);
  const totalQty = items.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);

  const handleSubmit = async () => {
    if (!supplierId) { toast.error('Please select a supplier'); return; }
    if (items.length === 0) { toast.error('Add at least one product'); return; }
    const invalid = items.find(i => !i.quantity || parseInt(i.quantity) <= 0);
    if (invalid) { toast.error('All quantities must be greater than 0'); return; }

    setSubmitting(true);
    try {
      const results: any[] = [];
      for (const item of items) {
        const { data } = await api.post('/stock/in', {
          product_id: item.product_id,
          quantity: parseInt(item.quantity),
          unit_price: parseFloat(item.unit_price) || 0,
          supplier_id: supplierId,
          reference,
          notes,
        });
        results.push({ ...item, ...data });
      }
      setSuccess({
        supplier: suppliers.find(s => s.id === supplierId)?.name || 'Unknown',
        reference,
        items: items.map(i => ({ ...i })),
        totalQty,
        totalAmount,
      });
      setItems([]);
      setSupplierId('');
      setReference('');
      setNotes('');
      toast.success('Stock in recorded successfully');
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Failed to record stock in');
    } finally { setSubmitting(false); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
        <ArrowDownToLine className="h-6 w-6 text-accent" /> Stock In
      </h2>

      {/* Success Confirmation */}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-6 w-6 text-emerald-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-emerald-800">Stock In Recorded Successfully</h3>
              <p className="text-sm text-emerald-700 mt-1">Supplier: {success.supplier} {success.reference && `| Ref: ${success.reference}`}</p>
              <div className="mt-3 space-y-1">
                {success.items.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm text-emerald-700">
                    <span>{item.product_name} ({item.sku})</span>
                    <span>+{item.quantity} x {formatCurrency(parseFloat(item.unit_price) || 0)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-3 pt-2 border-t border-emerald-200 text-sm font-medium text-emerald-800">
                <span>Total: {success.totalQty} items</span>
                <span>{formatCurrency(success.totalAmount)}</span>
              </div>
            </div>
            <button onClick={() => setSuccess(null)} className="text-emerald-400 hover:text-emerald-600"><X className="h-4 w-4" /></button>
          </div>
        </div>
      )}

      {/* Supplier Selection */}
      <div className="bg-white rounded-xl border p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Supplier</h3>
        <select value={supplierId} onChange={e => setSupplierId(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30">
          <option value="">Select Supplier...</option>
          {suppliers.map(s => (
            <option key={s.id} value={s.id}>{s.name} {s.company ? `(${s.company})` : ''}</option>
          ))}
        </select>
      </div>

      {/* Product Search & Items */}
      <div className="bg-white rounded-xl border p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Products</h3>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="text" value={productSearch} onChange={e => searchProducts(e.target.value)}
            placeholder="Search product by name or SKU..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-accent/30 outline-none" />
          {searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
              {searchResults.map(p => (
                <button key={p.id} onClick={() => addProduct(p)}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex justify-between items-center">
                  <span><span className="font-medium">{p.name}</span> <span className="text-gray-400 text-xs">({p.sku})</span></span>
                  <span className="text-xs text-gray-500">Stock: {p.stock_quantity || 0}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 ? (
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 px-1">
              <span className="col-span-5">Product</span>
              <span className="col-span-3 text-right">Quantity</span>
              <span className="col-span-3 text-right">Unit Price</span>
              <span className="col-span-1"></span>
            </div>
            {items.map((item, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center bg-gray-50 rounded-lg p-2">
                <div className="col-span-5">
                  <p className="text-sm font-medium">{item.product_name}</p>
                  <p className="text-xs text-gray-400">{item.sku}</p>
                </div>
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
            <div className="flex justify-between items-center pt-3 border-t mt-3">
              <span className="text-sm text-gray-600">Total: <span className="font-medium">{totalQty} items</span></span>
              <span className="text-lg font-bold text-[#1e293b]">{formatCurrency(totalAmount)}</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-6">Search and add products above.</p>
        )}
      </div>

      {/* Reference & Notes */}
      <div className="bg-white rounded-xl border p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reference Number</label>
            <input value={reference} onChange={e => setReference(e.target.value)} placeholder="Invoice / GRN / PO number"
              className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes"
              className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end">
        <button onClick={handleSubmit} disabled={submitting || items.length === 0}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#1e293b] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowDownToLine className="h-4 w-4" />}
          Record Stock In
        </button>
      </div>
    </div>
  );
}
