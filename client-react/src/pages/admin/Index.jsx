import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from '../../components/admin/StatusBadge';
import { adminApi, fmtMoney } from '../../lib/adminHelpers';

const STAT_ICONS = {
  doc: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></>,
  clock: <><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></>,
  printer: <><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></>,
  checkcircle: <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></>,
  wallet: <><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></>,
  bag: <><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></>,
  shop: <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></>,
  earnings: <><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"></path><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"></path><path d="M18 12a2 2 0 0 0 0 4h4v-4z"></path></>,
};

function Icon({ name, className = 'h-5 w-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {STAT_ICONS[name]}
    </svg>
  );
}

const ICON_BG = {
  blue: 'bg-blue-500/[0.12] text-blue-500',
  amber: 'bg-amber-500/[0.12] text-amber-600',
  purple: 'bg-purple-500/[0.12] text-purple-600',
  green: 'bg-emerald-500/[0.12] text-emerald-600',
};

const SUB_COLOR = {
  blue: 'text-blue-500',
  amber: 'text-amber-600',
  purple: 'text-purple-600',
  green: 'text-emerald-600',
};

function StatCard({ icon, color, number, label, sub }) {
  return (
    <div className="rounded-[18px] border border-gray-300/50 bg-white/90 p-5 px-[1.4rem] shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] backdrop-blur-md transition hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(0,0,0,0.06),0_2px_4px_rgba(0,0,0,0.04)]">
      <div className={`mb-[0.9rem] flex h-[42px] w-[42px] items-center justify-center rounded-xl ${ICON_BG[color]}`}>
        <Icon name={icon} />
      </div>
      <div className="text-[1.55rem] font-extrabold tracking-tight text-gray-900">{number}</div>
      <div className="mt-1 text-[0.82rem] font-medium text-gray-600">{label}</div>
      <div className={`mt-[0.35rem] text-[0.72rem] font-semibold ${SUB_COLOR[color]}`}>{sub}</div>
    </div>
  );
}

export default function Index() {
  const [welcomeName, setWelcomeName] = useState('Shop Owner');
  const [data, setData] = useState(null);
  const [earnings, setEarnings] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const shopRes = await adminApi('/api/admin/shop-profile');
        if (shopRes.ok) {
          const shop = await shopRes.json();
          if (!cancelled && shop.shop_name) setWelcomeName(shop.shop_name);
        }
      } catch { /* keep default greeting */ }

      try {
        const [dashRes, earnRes] = await Promise.all([adminApi('/api/admin/dashboard'), adminApi('/api/admin/earnings')]);
        if (!dashRes.ok || !earnRes.ok) throw new Error('Failed to load dashboard');
        const dashData = await dashRes.json();
        const earnData = await earnRes.json();
        if (cancelled) return;
        setData(dashData);
        setEarnings(earnData);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load dashboard');
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const dateLabel = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const c = data?.statusCounts;

  const attentionItems = [];
  if (c) {
    if (c.pending > 0) attentionItems.push({ label: 'Pending Orders', count: c.pending, href: '/admin/orders?status=pending' });
    if (c.ready > 0) attentionItems.push({ label: 'Ready for Pickup — needs collection', count: c.ready, href: '/admin/orders?status=ready' });
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-[1.3rem] font-extrabold tracking-tight text-gray-900">Welcome back, {welcomeName}! 👋</h2>
          <p className="mt-1 text-[0.88rem] text-gray-600">Here's a quick overview of your shop today.</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-[0.6rem] text-[0.82rem] font-semibold text-gray-900 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
          <svg className="h-[15px] w-[15px] text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <span>{dateLabel}</span>
        </div>
      </div>

      {error && !data ? (
        <p className="py-6 text-center text-sm text-red-500">Couldn't load dashboard. {error}</p>
      ) : !data ? (
        <p className="py-6 text-center text-sm text-gray-400">Loading…</p>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-4">
            <StatCard icon="doc" color="blue" number={data.totalOrders} label="Total Orders" sub="This Month" />
            <StatCard icon="clock" color="amber" number={c.pending} label="Pending Orders" sub="Needs Action" />
            <StatCard icon="printer" color="purple" number={c.accepted + c.printing} label="Orders in Progress" sub="Accepted + Printing" />
            <StatCard icon="checkcircle" color="green" number={c.completed} label="Completed Orders" sub="This Month" />
            <StatCard icon="wallet" color="green" number={fmtMoney(data.earningsToday)} label="Today's Earnings" sub={`${data.ordersToday} Orders Today`} />
          </div>

          <div className="mb-5 grid grid-cols-1 items-start gap-5 lg:grid-cols-[1fr_340px]">
            <div className="rounded-[18px] border border-gray-300/50 bg-white/90 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] backdrop-blur-md">
              <div className="mb-[1.1rem] flex items-center justify-between">
                <h2 className="text-base font-bold text-gray-900">Recent Orders</h2>
                <Link to="/admin/orders" className="text-[0.82rem] font-semibold text-blue-500 hover:text-blue-600 hover:underline">View All Orders →</Link>
              </div>
              {!data.recentOrders || data.recentOrders.length === 0 ? (
                <div className="py-6 text-center text-sm text-gray-400">No orders yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-[0.85rem]">
                    <thead>
                      <tr>
                        {['Order ID', 'Customer', 'Details', 'Status', 'Amount'].map((h) => (
                          <th key={h} className="whitespace-nowrap border-b border-gray-200 px-3 py-2.5 text-left text-[0.72rem] font-semibold uppercase tracking-wide text-gray-400">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentOrders.map((o) => (
                        <tr key={o.id} className="transition hover:bg-blue-500/[0.03]">
                          <td className="whitespace-nowrap border-b border-gray-100 px-3 py-[0.7rem] text-gray-900">#{String(o.id).padStart(4, '0')}</td>
                          <td className="whitespace-nowrap border-b border-gray-100 px-3 py-[0.7rem] text-gray-900">{o.customer_email}</td>
                          <td className="whitespace-nowrap border-b border-gray-100 px-3 py-[0.7rem] text-gray-900">{o.color_option === 'bw' ? 'B&W' : 'Color'} · {o.paper_size} · {o.copies}x</td>
                          <td className="whitespace-nowrap border-b border-gray-100 px-3 py-[0.7rem]"><StatusBadge status={o.status} /></td>
                          <td className="whitespace-nowrap border-b border-gray-100 px-3 py-[0.7rem] font-bold text-gray-900">{fmtMoney(o.total_price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="rounded-[18px] border border-gray-300/50 bg-white/90 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] backdrop-blur-md">
              <h2 className="text-base font-bold text-gray-900">Today's Earnings</h2>
              <div className="my-1 mb-[1.1rem] text-[1.9rem] font-extrabold tracking-tight text-blue-500">{fmtMoney(earnings?.today?.amount)}</div>
              <div className="flex items-center justify-between border-t border-[#f0f4f8] py-[0.65rem] text-[0.85rem]">
                <span className="text-gray-600">Orders Completed Today</span>
                <span className="font-bold text-gray-900">{earnings?.today?.count}</span>
              </div>
              <div className="flex items-center justify-between border-t border-[#f0f4f8] py-[0.65rem] text-[0.85rem]">
                <span className="text-gray-600">Yesterday</span>
                <span className="font-bold text-gray-900">{fmtMoney(earnings?.yesterday?.amount)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-[#f0f4f8] py-[0.65rem] text-[0.85rem]">
                <span className="text-gray-600">Total Earnings</span>
                <span className="font-bold text-gray-900">{fmtMoney(earnings?.total?.amount)}</span>
              </div>
              <Link to="/admin/earnings" className="mt-[1.1rem] block text-[0.82rem] font-semibold text-blue-500 hover:text-blue-600 hover:underline">View Earnings →</Link>
            </div>
          </div>

          <div className="mb-5 rounded-[18px] border border-gray-300/50 bg-white/90 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] backdrop-blur-md">
            <h2 className="mb-[0.9rem] text-base font-bold text-gray-900">Needs Attention</h2>
            {attentionItems.length === 0 ? (
              <div className="flex items-center gap-2.5 p-4 text-[0.88rem] font-semibold text-emerald-600">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                You're all caught up.
              </div>
            ) : (
              attentionItems.map((i) => (
                <Link key={i.label} to={i.href} className="mb-2 flex items-center justify-between rounded-xl bg-amber-500/[0.06] px-[0.9rem] py-3 no-underline">
                  <span className="text-[0.85rem] font-semibold text-gray-900">{i.label}</span>
                  <span className="rounded-full bg-amber-500 px-[0.6rem] py-[0.15rem] text-[0.75rem] font-bold text-white">{i.count}</span>
                </Link>
              ))
            )}
          </div>

          <div className="rounded-[18px] border border-gray-300/50 bg-white/90 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] backdrop-blur-md">
            <h2 className="mb-[0.9rem] text-base font-bold text-gray-900">Quick Actions</h2>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-[0.9rem]">
              <Link to="/admin/orders?status=pending" className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 transition hover:-translate-y-px hover:border-blue-500 hover:shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
                <div className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-[10px] bg-amber-500/[0.12] text-amber-600"><Icon name="clock" className="h-[18px] w-[18px]" /></div>
                <div className="flex-1">
                  <div className="text-[0.85rem] font-semibold text-gray-900">Pending Orders</div>
                  <div className="text-[0.72rem] text-gray-400">{c.pending} orders</div>
                </div>
                <svg className="h-[15px] w-[15px] text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </Link>
              <Link to="/admin/orders?status=ready" className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 transition hover:-translate-y-px hover:border-blue-500 hover:shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
                <div className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-[10px] bg-emerald-500/[0.12] text-emerald-600"><Icon name="bag" className="h-[18px] w-[18px]" /></div>
                <div className="flex-1">
                  <div className="text-[0.85rem] font-semibold text-gray-900">Ready for Pickup</div>
                  <div className="text-[0.72rem] text-gray-400">{c.ready} orders</div>
                </div>
                <svg className="h-[15px] w-[15px] text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </Link>
              <Link to="/admin/shop-profile" className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 transition hover:-translate-y-px hover:border-blue-500 hover:shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
                <div className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-[10px] bg-blue-500/[0.12] text-blue-500"><Icon name="shop" className="h-[18px] w-[18px]" /></div>
                <div className="flex-1">
                  <div className="text-[0.85rem] font-semibold text-gray-900">Shop Profile</div>
                  <div className="text-[0.72rem] text-gray-400">Manage Shop</div>
                </div>
                <svg className="h-[15px] w-[15px] text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </Link>
              <Link to="/admin/earnings" className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 transition hover:-translate-y-px hover:border-blue-500 hover:shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
                <div className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-[10px] bg-purple-500/[0.12] text-purple-600"><Icon name="earnings" className="h-[18px] w-[18px]" /></div>
                <div className="flex-1">
                  <div className="text-[0.85rem] font-semibold text-gray-900">Earnings</div>
                  <div className="text-[0.72rem] text-gray-400">View Details</div>
                </div>
                <svg className="h-[15px] w-[15px] text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
