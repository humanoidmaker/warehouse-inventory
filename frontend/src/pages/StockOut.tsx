import { useState, useEffect } from 'react';
import { ArrowUpFromLine, Search, Loader2, CheckCircle, X, AlertTriangle } from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

const REASONS = ['Dispatch', 'Consumption', 'Damage', 'Return', 'Other'];

export default function StockOut() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<any>(null);

  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('Dispatch');
  const [notes, setNotes] = useState('');
  const [reference, setReference] = useState('');

  useEffect(() => {
    api.get('/products').then(r => setProducts(r.data.products || []))
      .catch(() => toast.error('Failed to load products'))
      .finally(() => setLoading(false));
  }, []);

  const handleSearch = (q: string) => {
    setSearch(q);
    if (q.length < 2) { setSearchResults([]); return; }
    const lower = q.toLowerCase();
    setSearchResults(
      products.filter(p =>
        p.name?.toLowerCase().includes(lower) || p.sku?.toLowerCase().includes(lower)
      ).slice(0, 8)
    );
  };

  const selectProduct = (product: any) => {
    setSelectedProduct(product);
    setSearch('');
    setSearchResults([]);
    setQuantity('');
  };

  const qtyNum = parseInt(quantity) || 0;
  const stock = selectedProduct?.stock_quantity || 0;
  const overStock = qtyNum > stock;

  const handleSubmit = async () => {
    if (!selectedProduct) { toast.error('Please select a product'); return; }
    if (qtyNum <= 0) { toast.error('Quantity must be greater than 0'); return; }
    if (overStock) { toast.error(`Only ${stock} available in stock`); return; }

    setSubmitting(true);
    try {
      await api.post('/stock/out', {
        product_id: selectedProduct.id,
        quantity: qtyNum,
        reason,
        notes,
        reference,
      });
      setSuccess({
        product_name: selectedProduct.name,
        sku: selectedProduct.sku,
        quantity: qtyNum,
        reason,
        remaining: stock - qtyNum,
      });
      // Update local product stock
      setProducts(prev => prev.map(p =>
        p.id === selectedProduct.id ? { ...p, stock_quantity: stock - qtyNum } : p
      ));
      setSelectedProduct(null);
      setQuantity('');
      setReason('Dispatch');
      setNotes('');
      setReference('');
      toast.success('Stock out recorded');
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Failed to record stock out');
    } finally { setSubmitting(false); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
        <ArrowUpFromLine className="h-6 w-6 text-accent" /> Stock Out
      </h2>

      {/* Success */}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-6 w-6 text-emerald-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-emerald-800">Stock Out Recorded</h3>
              <div className="text-sm text-emerald-700 mt-2 space-y-1">
                <p>Product: {success.product_name} ({success.sku})</p>
                <p>Quantity removed: {success.quantity}</p>
                <p>Reason: {success.reason}</p>
                <p>Remaining stock: {success.remaining}</p>
              </div>
            </div>
            <button onClick={() => setSuccess(null)} className="text-emerald-400 hover:text-emerald-600"><X className="h-4 w-4" /></button>
          </div>
        </div>
      )}

      {/* Search Product */}
      <div className="bg-white rounded-xl border p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Select Product</h3>
        {selectedProduct ? (
          <div className="flex items-center justify-between p-3 bg-[#3b82f6]/5 border border-[#3b82f6]/20 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">{selectedProduct.name}</p>
              <p className="text-xs text-gray-500">SKU: {selectedProduct.sku} | Available: <span className="font-medium">{stock}</span> {selectedProduct.unit || 'pcs'}</p>
            </div>
            <button onClick={() => setSelectedProduct(null)}
              className="text-sm text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
          </div>
        ) : (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="text" value={search} onChange={e => handleSearch(e.target.value)}
              placeholder="Search product by name or SKU..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-accent/30 outline-none" />
            {searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
                {searchResults.map(p => (
                  <button key={p.id} onClick={() => selectProduct(p)}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex justify-between items-center border-b last:border-0">
                    <div>
                      <span className="font-medium">{p.name}</span>
                      <span className="text-gray-400 text-xs ml-2">({p.sku})</span>
                    </div>
                    <span className={`text-xs font-medium ${(p.stock_quantity || 0) === 0 ? 'text-red-500' : 'text-gray-500'}`}>
                      Stock: {p.stock_quantity || 0}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quantity & Reason */}
      {selectedProduct && (
        <div className="bg-white rounded-xl border p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
            <input type="number" min="1" max={stock} value={quantity}
              onChange={e => setQuantity(e.target.value)} placeholder={`Max: ${stock}`}
              className={`w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 ${overStock ? 'border-red-300 focus:ring-red-200' : 'focus:ring-accent/30'}`} />
            {overStock && (
              <p className="flex items-center gap-1 mt-1 text-xs text-red-600">
                <AlertTriangle className="h-3 w-3" /> Exceeds available stock ({stock})
              </p>
            )}
            {qtyNum > 0 && !overStock && (
              <p className="text-xs text-gray-400 mt-1">After removal: {stock - qtyNum} remaining</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
            <div className="flex flex-wrap gap-2">
              {REASONS.map(r => (
                <button key={r} onClick={() => setReason(r)}
                  className={`px-4 py-2 rounded-lg text-sm border transition-colors ${
                    reason === r
                      ? 'bg-[#1e293b] text-white border-[#1e293b]'
                      : 'hover:bg-gray-50'
                  }`}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
            <input value={reference} onChange={e => setReference(e.target.value)}
              placeholder="Dispatch order / reference number"
              className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Additional details..."
              className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
          </div>

          <div className="flex justify-end pt-2">
            <button onClick={handleSubmit} disabled={submitting || overStock || qtyNum <= 0}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#1e293b] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpFromLine className="h-4 w-4" />}
              Record Stock Out
            </button>
          </div>
        </div>
      )}

      {/* Quick Stock Out History hint */}
      {!selectedProduct && !success && (
        <div className="bg-gray-50 rounded-xl border border-dashed p-8 text-center">
          <ArrowUpFromLine className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Search and select a product above to record stock out.</p>
          <p className="text-gray-400 text-xs mt-1">Stock out is used for dispatches, consumption, damage write-offs, and returns.</p>
        </div>
      )}
    </div>
  );
}
