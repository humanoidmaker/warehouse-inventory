import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, PieChart, Pie, Cell,
} from 'recharts';
import { BarChart3, Loader2, TrendingUp, TrendingDown, Package } from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

const COLORS = ['#1e293b', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      api.get('/products').then(r => r.data.products || []),
      api.get('/stock/movements').then(r => r.data.movements || []),
      api.get('/suppliers').then(r => r.data.suppliers || []),
      api.get('/purchase-orders').then(r => r.data.purchase_orders || r.data.orders || []),
    ]).then(([p, m, s, po]) => {
      setProducts(p);
      setMovements(m);
      setSuppliers(s);
      setPurchaseOrders(po);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;

  // Stock Valuation by Category
  const categoryValuation: Record<string, number> = {};
  products.forEach(p => {
    const cat = p.category || 'Uncategorized';
    categoryValuation[cat] = (categoryValuation[cat] || 0) + (p.stock_quantity || 0) * (p.cost_price || 0);
  });
  const valuationData = Object.entries(categoryValuation)
    .map(([name, value]) => ({ name, value: Math.round(value) }))
    .sort((a, b) => b.value - a.value);
  const totalValuation = valuationData.reduce((s, d) => s + d.value, 0);

  // Movement Trend (last 14 days)
  const trendMap: Record<string, { stock_in: number; stock_out: number }> = {};
  const today = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    trendMap[key] = { stock_in: 0, stock_out: 0 };
  }
  movements.forEach(m => {
    const day = (m.created_at || '').slice(0, 10);
    if (trendMap[day]) {
      if (m.type === 'in') trendMap[day].stock_in += m.quantity || 0;
      else if (m.type === 'out') trendMap[day].stock_out += m.quantity || 0;
    }
  });
  const trendData = Object.entries(trendMap).map(([date, vals]) => ({
    date: date.slice(5),
    'Stock In': vals.stock_in,
    'Stock Out': vals.stock_out,
  }));

  // Supplier Purchase Ranking
  const supplierPurchases: Record<string, { name: string; total: number; count: number }> = {};
  purchaseOrders.forEach(po => {
    const sid = po.supplier_id || 'unknown';
    if (!supplierPurchases[sid]) {
      supplierPurchases[sid] = { name: po.supplier_name || 'Unknown', total: 0, count: 0 };
    }
    supplierPurchases[sid].total += po.total || 0;
    supplierPurchases[sid].count += 1;
  });
  const supplierRanking = Object.values(supplierPurchases)
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  // Fast/Slow Movers
  const productMovement: Record<string, { name: string; sku: string; in: number; out: number; stock: number }> = {};
  products.forEach(p => {
    productMovement[p.id] = { name: p.name, sku: p.sku, in: 0, out: 0, stock: p.stock_quantity || 0 };
  });
  movements.forEach(m => {
    if (productMovement[m.product_id]) {
      if (m.type === 'in') productMovement[m.product_id].in += m.quantity || 0;
      if (m.type === 'out') productMovement[m.product_id].out += m.quantity || 0;
    }
  });
  const allMovers = Object.values(productMovement);
  const fastMovers = [...allMovers].sort((a, b) => b.out - a.out).slice(0, 5);
  const slowMovers = [...allMovers].filter(p => p.stock > 0).sort((a, b) => a.out - b.out).slice(0, 5);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
        <BarChart3 className="h-6 w-6 text-accent" /> Reports
      </h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-2xl font-bold text-[#1e293b]">{products.length}</p>
          <p className="text-sm text-gray-500">Total Products</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-2xl font-bold text-[#1e293b]">{formatCurrency(totalValuation)}</p>
          <p className="text-sm text-gray-500">Stock Valuation</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-2xl font-bold text-emerald-600">{movements.filter(m => m.type === 'in').length}</p>
          <p className="text-sm text-gray-500">Stock In Transactions</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-2xl font-bold text-red-600">{movements.filter(m => m.type === 'out').length}</p>
          <p className="text-sm text-gray-500">Stock Out Transactions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock Valuation by Category */}
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Stock Valuation by Category</h3>
          {valuationData.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No data available.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={valuationData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={11} angle={-20} textAnchor="end" height={60} />
                <YAxis fontSize={11} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(val: number) => formatCurrency(val)} />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Value" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Movement Trend */}
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Movement Trend (14 Days)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="Stock In" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Stock Out" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Supplier Purchase Ranking */}
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Supplier Purchase Ranking</h3>
          {supplierRanking.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No purchase data.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={supplierRanking.map(s => ({ name: s.name, value: Math.round(s.total) }))} cx="50%" cy="50%" outerRadius={90} dataKey="value"
                  label={({ name, percent }) => `${name.length > 12 ? name.slice(0, 12) + '..' : name} ${(percent * 100).toFixed(0)}%`}>
                  {supplierRanking.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(val: number) => formatCurrency(val)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Fast/Slow Movers */}
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Fast / Slow Movers</h3>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" /> Fast Movers (Top 5 by outflow)
              </p>
              <div className="space-y-1.5">
                {fastMovers.map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-gray-400 w-4">{i + 1}.</span>
                      <span className="text-gray-700 truncate max-w-[180px]">{p.name}</span>
                      <span className="text-[10px] text-gray-400">({p.sku})</span>
                    </div>
                    <span className="text-xs font-medium text-emerald-600">{p.out} out</span>
                  </div>
                ))}
                {fastMovers.length === 0 && <p className="text-xs text-gray-400">No data</p>}
              </div>
            </div>
            <div className="border-t pt-3">
              <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
                <TrendingDown className="h-3.5 w-3.5 text-red-500" /> Slow Movers (Lowest outflow with stock)
              </p>
              <div className="space-y-1.5">
                {slowMovers.map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-gray-400 w-4">{i + 1}.</span>
                      <span className="text-gray-700 truncate max-w-[180px]">{p.name}</span>
                      <span className="text-[10px] text-gray-400">({p.sku})</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-red-500">{p.out} out</span>
                      <span className="text-[10px] text-gray-400 ml-2">({p.stock} in stock)</span>
                    </div>
                  </div>
                ))}
                {slowMovers.length === 0 && <p className="text-xs text-gray-400">No data</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
