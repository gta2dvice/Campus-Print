import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardSidebar from '../components/DashboardSidebar';

const STATUS_LABELS = {
  pending: 'Pending',
  accepted: 'Accepted',
  printing: 'Printing',
  in_progress: 'In Progress',
  ready: 'Ready',
  completed: 'Completed',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

const STATUS_STYLES = {
  pending: 'bg-amber-500/10 text-amber-600',
  accepted: 'bg-blue-500/10 text-blue-600',
  in_progress: 'bg-blue-500/10 text-blue-600',
  printing: 'bg-violet-500/10 text-violet-600',
  ready: 'bg-emerald-500/10 text-emerald-600',
  completed: 'bg-gray-500/10 text-gray-600',
  rejected: 'bg-red-500/10 text-red-600',
  cancelled: 'bg-red-500/8 text-red-700',
};

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
        </svg>
      </div>
      <h3 className="mb-1 text-[1.05rem] font-semibold text-gray-900">No orders yet</h3>
      <p className="mb-6 text-sm text-gray-400">You haven't printed anything yet.</p>
      <a href="/new-order" className="inline-flex items-center gap-1.5 rounded-full bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(59,130,246,0.3)] transition hover:-translate-y-px hover:bg-blue-600 hover:shadow-[0_6px_16px_rgba(59,130,246,0.4)]">
        Start your first order
      </a>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [stats, setStats] = useState({ total: 0, in_progress: 0, ready: 0 });
  const [orders, setOrders] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch('/api/auth/status', { credentials: 'include' });
        const data = await res.json();
        if (!data.isLoggedIn) {
          navigate('/');
          return;
        }
        if (cancelled) return;
        const name = (data.email || '').split('@')[0];
        setDisplayName(name.charAt(0).toUpperCase() + name.slice(1));

        try {
          const statsRes = await fetch('/api/orders/stats', { credentials: 'include' });
          if (statsRes.ok) setStats(await statsRes.json());
        } catch { /* ignore */ }

        try {
          const ordersRes = await fetch('/api/orders', { credentials: 'include' });
          if (ordersRes.ok) setOrders(await ordersRes.json());
        } catch { /* ignore */ }
      } catch {
        navigate('/');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [navigate]);

  if (loading) return null;

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#f3f7fb_0%,#eaf1f7_100%)]">
      <div className="flex min-h-screen">
        <DashboardSidebar userName={displayName} />

        <main className="ml-[240px] h-screen flex-1 overflow-y-auto p-10 max-md:ml-0 max-md:p-6">
          <div className="mb-8 flex items-start justify-between gap-4 max-md:flex-col">
            <div>
              <h1 className="mb-1 text-[1.875rem] font-bold leading-tight tracking-tight text-gray-900">Hello, {displayName} 👋</h1>
              <p className="text-[0.925rem] text-gray-600">Here's an overview of your printing activity.</p>
            </div>
            <a href="/new-order" className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-blue-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(59,130,246,0.3)] transition hover:-translate-y-px hover:bg-blue-600 hover:shadow-[0_6px_16px_rgba(59,130,246,0.4)]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              New Order
            </a>
          </div>

          <div className="mb-8 grid grid-cols-3 gap-5 max-md:grid-cols-1">
            {[
              { label: 'Total Orders', value: stats.total || 0, icon: <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path> },
              { label: 'In Progress', value: stats.in_progress || 0, icon: <><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></> },
              { label: 'Ready / Completed', value: stats.ready || 0, icon: <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></> },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-gray-300/50 bg-white/85 p-6 shadow-[0_4px_12px_rgba(0,0,0,0.06),0_2px_4px_rgba(0,0,0,0.04)] backdrop-blur-md transition hover:-translate-y-0.5 hover:shadow-[0_10px_25px_rgba(0,0,0,0.08),0_4px_8px_rgba(0,0,0,0.04)]">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/[0.08] text-blue-500">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {s.icon}
                    {s.label === 'Total Orders' && <polyline points="14 2 14 8 20 8"></polyline>}
                  </svg>
                </div>
                <div className="mb-1 text-4xl font-bold leading-none tracking-tight text-gray-900">{s.value}</div>
                <div className="text-[0.85rem] font-medium text-gray-400">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-gray-300/50 bg-white/85 p-6 shadow-[0_4px_12px_rgba(0,0,0,0.06),0_2px_4px_rgba(0,0,0,0.04)] backdrop-blur-md">
            <h2 className="mb-5 text-base font-semibold text-gray-900">Recent Orders</h2>
            {!orders || orders.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      {['Order ID', 'Date', 'Details', 'Status', 'Total'].map((h) => (
                        <th key={h} className="border-b border-gray-200 px-4 py-2 text-left text-[0.72rem] font-semibold uppercase tracking-wider text-gray-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => {
                      const date = new Date(o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                      const color = o.color_option === 'bw' ? 'B&W' : 'Color';
                      const status = o.status || 'pending';
                      return (
                        <tr key={o.id} className="transition hover:bg-blue-500/[0.03]">
                          <td className="border-b border-gray-200/50 px-4 py-3.5 text-gray-900">#{String(o.id).padStart(4, '0')}</td>
                          <td className="border-b border-gray-200/50 px-4 py-3.5 text-gray-900">{date}</td>
                          <td className="border-b border-gray-200/50 px-4 py-3.5 text-gray-900">{color} · {o.paper_size} · {o.copies}x</td>
                          <td className="border-b border-gray-200/50 px-4 py-3.5">
                            <span className={`inline-flex items-center rounded-full px-3 py-1 text-[0.72rem] font-semibold ${STATUS_STYLES[status] || 'bg-gray-500/10 text-gray-600'}`}>
                              {STATUS_LABELS[status] || status}
                            </span>
                          </td>
                          <td className="border-b border-gray-200/50 px-4 py-3.5 font-semibold text-gray-900">₹{parseFloat(o.total_price).toFixed(0)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
