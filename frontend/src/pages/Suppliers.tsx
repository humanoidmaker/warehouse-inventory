import { useState, useEffect, useCallback } from 'react';
import { Truck, Plus, Search, Loader2, X, Edit2, Phone, Mail, Eye } from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [purchaseHistory, setPurchaseHistory] = useState<any[] | null>(null);
  const [historySupplier, setHistorySupplier] = useState<any>(null);

  const [form, setForm] = useState({
    name: '', company: '', phone: '', email: '', gstin: '',
    address: '', city: '', state: '', notes: '',
  });

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/suppliers');
      let list = data.suppliers || [];
      if (search) {
        const q = search.toLowerCase();
        list = list.filter((s: any) =>
          s.name?.toLowerCase().includes(q) || s.company?.toLowerCase().includes(q) ||
          s.phone?.includes(q) || s.email?.toLowerCase().includes(q)
        );
      }
      setSuppliers(list);
    } catch { toast.error('Failed to load suppliers'); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', company: '', phone: '', email: '', gstin: '', address: '', city: '', state: '', notes: '' });
    setShowModal(true);
  };

  const openEdit = (s: any) => {
    setEditing(s);
    setForm({
      name: s.name || '', company: s.company || '', phone: s.phone || '',
      email: s.email || '', gstin: s.gstin || '', address: s.address || '',
      city: s.city || '', state: s.state || '', notes: s.notes || '',
    });
    setShowModal(true);
  };

  const saveSupplier = async () => {
    if (!form.name) { toast.error('Supplier name is required'); return; }
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/suppliers/${editing.id}`, form);
        toast.success('Supplier updated');
      } else {
        await api.post('/suppliers', form);
        toast.success('Supplier added');
      }
      setShowModal(false);
      fetchSuppliers();
    } catch (e: any) { toast.error(e.response?.data?.detail || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const viewPurchaseHistory = async (supplier: any) => {
    setHistorySupplier(supplier);
    try {
      const { data } = await api.get('/purchase-orders', { params: { supplier_id: supplier.id } });
      setPurchaseHistory(data.purchase_orders || data.orders || []);
    } catch {
      setPurchaseHistory([]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Truck className="h-6 w-6 text-accent" /> Suppliers
        </h2>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:opacity-90">
          <Plus className="h-4 w-4" /> Add Supplier
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search suppliers..."
          className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-accent/30 outline-none" />
      </div>

      {/* Suppliers Table */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-gray-500">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Company</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">GSTIN</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map(s => (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{s.name}</td>
                    <td className="px-4 py-3 text-gray-600">{s.company || '-'}</td>
                    <td className="px-4 py-3">
                      {s.phone ? (
                        <span className="flex items-center gap-1 text-gray-600">
                          <Phone className="h-3 w-3" /> {s.phone}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      {s.email ? (
                        <span className="flex items-center gap-1 text-gray-600">
                          <Mail className="h-3 w-3" /> {s.email}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{s.gstin || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => viewPurchaseHistory(s)} title="Purchase History"
                          className="p-1.5 text-gray-400 hover:text-accent rounded hover:bg-gray-100">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button onClick={() => openEdit(s)} title="Edit"
                          className="p-1.5 text-gray-400 hover:text-accent rounded hover:bg-gray-100">
                          <Edit2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {suppliers.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-12 text-gray-400">No suppliers found.</td></tr>
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
              <h3 className="text-lg font-bold">{editing ? 'Edit Supplier' : 'Add Supplier'}</h3>
              <button onClick={() => setShowModal(false)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                <input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label>
                <input value={form.gstin} onChange={e => setForm({ ...form, gstin: e.target.value })} placeholder="22AAAAA0000A1Z5"
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input value={form.state} onChange={e => setForm({ ...form, state: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/30" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
              <button onClick={saveSupplier} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-[#1e293b] text-white rounded-lg text-sm font-medium disabled:opacity-50">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} {editing ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Purchase History Modal */}
      {purchaseHistory !== null && historySupplier && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold">Purchase History</h3>
                <p className="text-sm text-gray-500">{historySupplier.name} {historySupplier.company ? `(${historySupplier.company})` : ''}</p>
              </div>
              <button onClick={() => { setPurchaseHistory(null); setHistorySupplier(null); }}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            {purchaseHistory.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No purchase orders found for this supplier.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 font-medium">PO #</th>
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Items</th>
                    <th className="pb-2 font-medium text-right">Total</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseHistory.map((po: any) => (
                    <tr key={po.id} className="border-b last:border-0">
                      <td className="py-2 font-mono text-xs">{po.po_number || po.id?.slice(-6)}</td>
                      <td className="py-2">{formatDate(po.created_at)}</td>
                      <td className="py-2">{(po.items || []).length} item(s)</td>
                      <td className="py-2 text-right font-medium">{formatCurrency(po.total || 0)}</td>
                      <td className="py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          po.status === 'received' ? 'bg-emerald-50 text-emerald-700' :
                          po.status === 'ordered' ? 'bg-blue-50 text-blue-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>{po.status || 'draft'}</span>
                      </td>
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
