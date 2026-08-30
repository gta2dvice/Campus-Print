import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi, fmtMoney, fmtDate } from '../../lib/adminHelpers';
import '../../styles/admin-effects.css';

function StatBox({ number, label }) {
  return (
    <div className="rounded-[18px] border border-gray-300/50 bg-white/90 p-5 px-[1.4rem] shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] backdrop-blur-md">
      <div className="text-[1.55rem] font-extrabold tracking-tight text-gray-900">{number}</div>
      <div className="mt-1 text-[0.82rem] font-medium text-gray-600">{label}</div>
    </div>
  );
}

export default function Earnings() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await adminApi('/api/admin/earnings');
        if (!res.ok) throw new Error('Failed to load earnings');
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load earnings');
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const max = data?.trend?.length ? Math.max(...data.trend.map((t) => t.amount), 1) : 1;

  return (
    <div>
      <div className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-4">
        <StatBox number={data ? fmtMoney(data.today.amount) : '–'} label="Today" />
        <StatBox number={data ? fmtMoney(data.week.amount) : '–'} label="This Week" />
        <StatBox number={data ? fmtMoney(data.month.amount) : '–'} label="This Month" />
        <StatBox number={data ? fmtMoney(data.total.amount) : '–'} label="Total Earnings" />
        <StatBox number={data ? data.total.count : '–'} label="Completed Orders" />
        <StatBox number={data ? fmtMoney(data.avgOrderValue) : '–'} label="Average Order Value" />
      </div>

      <div className="mb-5 rounded-[18px] border border-gray-300/50 bg-white/90 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] backdrop-blur-md">
        <h2 className="text-base font-bold text-gray-900">Revenue Trend (last 14 days)</h2>
        {error ? (
          <p className="py-6 text-center text-sm text-red-500">Couldn't load earnings. {error}</p>
        ) : !data ? (
          <p className="py-6 text-center text-sm text-gray-400">Loading…</p>
        ) : !data.trend.length ? (
          <div className="py-6 text-center text-sm text-gray-400">No completed orders yet.</div>
        ) : (
          <div className="flex h-[140px] items-end gap-[0.4rem] pt-2">
            {data.trend.map((t) => (
              <div key={t.date} className="flex h-full flex-1 flex-col items-center justify-end gap-[0.35rem]" title={`${t.date}: ${fmtMoney(t.amount)}`}>
                <div className="admin-trend-bar" style={{ height: `${Math.max(4, (t.amount / max) * 100)}%` }}></div>
                <span className="text-[0.65rem] text-gray-400">{new Date(t.date).getDate()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-[18px] border border-gray-300/50 bg-white/90 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] backdrop-blur-md">
        <div className="mb-[1.1rem] flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">Recent Transactions</h2>
          <Link to="/admin/transactions" className="text-[0.82rem] font-semibold text-blue-500 hover:text-blue-600 hover:underline">View All Transactions →</Link>
        </div>
        {!data ? (
          <p className="py-6 text-center text-sm text-gray-400">Loading…</p>
        ) : !data.recentTransactions.length ? (
          <div className="py-6 text-center text-sm text-gray-400">No completed transactions yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[0.85rem]">
              <thead>
                <tr>
                  {['Order ID', 'Customer', 'Amount', 'Date'].map((h) => (
                    <th key={h} className="whitespace-nowrap border-b border-gray-200 px-3 py-2.5 text-left text-[0.72rem] font-semibold uppercase tracking-wide text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.recentTransactions.map((t) => (
                  <tr key={t.id} className="transition hover:bg-blue-500/[0.03]">
                    <td className="whitespace-nowrap border-b border-gray-100 px-3 py-[0.7rem] text-gray-900">#{String(t.id).padStart(4, '0')}</td>
                    <td className="whitespace-nowrap border-b border-gray-100 px-3 py-[0.7rem] text-gray-900">{t.customer_email}</td>
                    <td className="whitespace-nowrap border-b border-gray-100 px-3 py-[0.7rem] font-bold text-gray-900">{fmtMoney(t.total_price)}</td>
                    <td className="whitespace-nowrap border-b border-gray-100 px-3 py-[0.7rem] text-gray-900">{fmtDate(t.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
