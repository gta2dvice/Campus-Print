import { useEffect, useState } from 'react';
import StatusBadge from '../../components/admin/StatusBadge';
import Pagination from '../../components/admin/Pagination';
import { adminApi, fmtMoney, fmtDate } from '../../lib/adminHelpers';

const PAY_STATUS_OPTIONS = ['success', 'refunded', 'pending', 'failed'];
const PAY_LABELS = { success: 'Success', refunded: 'Refunded', pending: 'Pending', failed: 'Failed' };

export default function Transactions() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({ search: '', status: '' });
  const [page, setPage] = useState(1);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({ search: appliedFilters.search, status: appliedFilters.status, page, limit: 15 });
        const res = await adminApi(`/api/admin/transactions?${params}`);
        if (!res.ok) throw new Error('Failed to load transactions');
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) { setError(err.message || 'Failed to load transactions'); setData(null); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [appliedFilters, page]);

  function applyFilters() {
    setPage(1);
    setAppliedFilters({ search: search.trim(), status });
  }

  function resetFilters() {
    setSearch('');
    setStatus('');
    setPage(1);
    setAppliedFilters({ search: '', status: '' });
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-2.5">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by order ID, email, or reference…"
          className="rounded-[10px] border border-gray-200 bg-white px-3.5 py-[0.55rem] text-[0.85rem] text-gray-900 focus:border-blue-500 focus:outline-none"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-[10px] border border-gray-200 bg-white px-3.5 py-[0.55rem] text-[0.85rem] text-gray-900 focus:border-blue-500 focus:outline-none"
        >
          <option value="">All statuses</option>
          {PAY_STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{PAY_LABELS[s]}</option>
          ))}
        </select>
        <button onClick={applyFilters} className="rounded-full bg-blue-500 px-[1.1rem] py-2 text-[0.85rem] font-semibold text-white transition hover:bg-blue-600">Apply</button>
        <button onClick={resetFilters} className="rounded-full border border-gray-200 px-[1.1rem] py-2 text-[0.85rem] font-semibold text-gray-600 transition hover:border-blue-500 hover:bg-blue-500/[0.08] hover:text-blue-500">Reset</button>
      </div>

      <div className="rounded-[18px] border border-gray-300/50 bg-white/90 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] backdrop-blur-md">
        {loading ? (
          <p className="py-6 text-center text-sm text-gray-400">Loading…</p>
        ) : error ? (
          <p className="py-6 text-center text-sm text-red-500">Couldn't load transactions. {error}</p>
        ) : !data?.payments?.length ? (
          <div className="py-6 text-center text-sm text-gray-400">No transactions match your filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[0.85rem]">
              <thead>
                <tr>
                  {['Reference', 'Order', 'Customer', 'Amount', 'Status', 'Date'].map((h) => (
                    <th key={h} className="whitespace-nowrap border-b border-gray-200 px-3 py-2.5 text-left text-[0.72rem] font-semibold uppercase tracking-wide text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.payments.map((p) => (
                  <tr key={p.transaction_ref} className="transition hover:bg-blue-500/[0.03]">
                    <td className="whitespace-nowrap border-b border-gray-100 px-3 py-[0.7rem] text-gray-900">{p.transaction_ref}</td>
                    <td className="whitespace-nowrap border-b border-gray-100 px-3 py-[0.7rem] text-gray-900">#{String(p.order_id).padStart(4, '0')}</td>
                    <td className="whitespace-nowrap border-b border-gray-100 px-3 py-[0.7rem] text-gray-900">{p.customer_email}</td>
                    <td className="whitespace-nowrap border-b border-gray-100 px-3 py-[0.7rem] font-bold text-gray-900">{fmtMoney(p.amount)}</td>
                    <td className="whitespace-nowrap border-b border-gray-100 px-3 py-[0.7rem]"><StatusBadge status={p.status} kind="payment" /></td>
                    <td className="whitespace-nowrap border-b border-gray-100 px-3 py-[0.7rem] text-gray-900">{fmtDate(p.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pagination page={data.page} limit={data.limit} total={data.total} onPage={setPage} />}
      </div>
    </div>
  );
}
