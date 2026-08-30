import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Toast from '../../components/Toast';
import StatusBadge from '../../components/admin/StatusBadge';
import Pagination from '../../components/admin/Pagination';
import { adminApi, fmtMoney, fmtDate, STATUS_LABELS, NEXT_ACTIONS } from '../../lib/adminHelpers';

const STATUS_OPTIONS = ['pending', 'accepted', 'printing', 'ready', 'completed', 'rejected', 'cancelled'];

export default function Orders() {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({ search: '', status: searchParams.get('status') || '', dateFrom: '', dateTo: '' });
  const [page, setPage] = useState(1);

  // The sidebar links to /admin/orders with different ?status= values while
  // staying on this same route element, so React Router won't remount this
  // component — re-sync the filter from the URL whenever it changes.
  useEffect(() => {
    const urlStatus = searchParams.get('status') || '';
    setStatus(urlStatus);
    setPage(1);
    setAppliedFilters((f) => ({ ...f, status: urlStatus }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [toast, setToast] = useState(null);
  function showToast(message, type = 'success') {
    setToast({ message, type, show: true });
    setTimeout(() => setToast((t) => t && { ...t, show: false }), 3500);
  }

  const [modalOrder, setModalOrder] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  const [rejectOrderId, setRejectOrderId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  async function loadOrders() {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        search: appliedFilters.search,
        status: appliedFilters.status,
        dateFrom: appliedFilters.dateFrom,
        dateTo: appliedFilters.dateTo,
        page,
        limit: 15,
      });
      const res = await adminApi(`/api/admin/orders?${params}`);
      if (!res.ok) throw new Error('Failed to load orders');
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err.message || 'Failed to load orders');
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedFilters, page]);

  function applyFilters() {
    setPage(1);
    setAppliedFilters({ search: search.trim(), status, dateFrom, dateTo });
  }

  function resetFilters() {
    setSearch('');
    setStatus('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
    setAppliedFilters({ search: '', status: '', dateFrom: '', dateTo: '' });
  }

  async function updateOrderStatus(orderId, newStatus, closeModal = false) {
    try {
      const res = await adminApi(`/api/admin/orders/${orderId}/status`, { method: 'PATCH', body: JSON.stringify({ status: newStatus }) });
      const respData = await res.json();
      if (!res.ok) { showToast(respData.message || 'Update failed', 'error'); return; }
      showToast(`Order marked as ${STATUS_LABELS[newStatus]}.`);
      if (closeModal) setModalOrder(null);
      loadOrders();
    } catch {
      showToast('Connection error. Please try again.', 'error');
    }
  }

  async function openOrderModal(orderId) {
    setModalOrder({ id: orderId });
    setModalLoading(true);
    setModalError('');
    try {
      const res = await adminApi(`/api/admin/orders/${orderId}`);
      if (!res.ok) throw new Error('Failed to load order');
      const o = await res.json();
      setModalOrder(o);
    } catch (err) {
      setModalError(err.message || 'Failed to load order');
    } finally {
      setModalLoading(false);
    }
  }

  function openRejectModal(orderId) {
    setRejectOrderId(orderId);
    setRejectReason('');
  }

  async function confirmReject() {
    if (!rejectOrderId) return;
    try {
      const res = await adminApi(`/api/admin/orders/${rejectOrderId}/reject`, { method: 'POST', body: JSON.stringify({ reason: rejectReason.trim() }) });
      const respData = await res.json();
      setRejectOrderId(null);
      if (!res.ok) { showToast(respData.message || 'Reject failed', 'error'); return; }
      showToast('Order rejected.');
      setModalOrder(null);
      loadOrders();
    } catch {
      setRejectOrderId(null);
      showToast('Connection error. Please try again.', 'error');
    }
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-2.5">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by Order ID or email…"
          className="rounded-[10px] border border-gray-200 bg-white px-3.5 py-[0.55rem] text-[0.85rem] text-gray-900 focus:border-blue-500 focus:outline-none"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-[10px] border border-gray-200 bg-white px-3.5 py-[0.55rem] text-[0.85rem] text-gray-900 focus:border-blue-500 focus:outline-none"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-[10px] border border-gray-200 bg-white px-3.5 py-[0.55rem] text-[0.85rem] text-gray-900 focus:border-blue-500 focus:outline-none" />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-[10px] border border-gray-200 bg-white px-3.5 py-[0.55rem] text-[0.85rem] text-gray-900 focus:border-blue-500 focus:outline-none" />
        <button onClick={applyFilters} className="rounded-full bg-blue-500 px-[1.1rem] py-2 text-[0.85rem] font-semibold text-white transition hover:bg-blue-600">Apply</button>
        <button onClick={resetFilters} className="rounded-full border border-gray-200 px-[1.1rem] py-2 text-[0.85rem] font-semibold text-gray-600 transition hover:border-blue-500 hover:bg-blue-500/[0.08] hover:text-blue-500">Reset</button>
      </div>

      <div className="rounded-[18px] border border-gray-300/50 bg-white/90 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] backdrop-blur-md">
        {loading ? (
          <p className="py-6 text-center text-sm text-gray-400">Loading…</p>
        ) : error ? (
          <p className="py-6 text-center text-sm text-red-500">Couldn't load orders. {error}</p>
        ) : !data?.orders?.length ? (
          <div className="py-6 text-center text-sm text-gray-400">No orders match your filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[0.85rem]">
              <thead>
                <tr>
                  {['Order ID', 'Customer', 'Details', 'Status', 'Amount', 'Date', 'Actions'].map((h) => (
                    <th key={h} className="whitespace-nowrap border-b border-gray-200 px-3 py-2.5 text-left text-[0.72rem] font-semibold uppercase tracking-wide text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.orders.map((o) => (
                  <tr key={o.id} className="transition hover:bg-blue-500/[0.03]">
                    <td className="whitespace-nowrap border-b border-gray-100 px-3 py-[0.7rem] text-gray-900">#{String(o.id).padStart(4, '0')}</td>
                    <td className="whitespace-nowrap border-b border-gray-100 px-3 py-[0.7rem] text-gray-900">{o.customer_email}</td>
                    <td className="whitespace-nowrap border-b border-gray-100 px-3 py-[0.7rem] text-gray-900">{o.color_option === 'bw' ? 'B&W' : 'Color'} · {o.paper_size} · {o.copies}x</td>
                    <td className="whitespace-nowrap border-b border-gray-100 px-3 py-[0.7rem]"><StatusBadge status={o.status} /></td>
                    <td className="whitespace-nowrap border-b border-gray-100 px-3 py-[0.7rem] font-bold text-gray-900">{fmtMoney(o.total_price)}</td>
                    <td className="whitespace-nowrap border-b border-gray-100 px-3 py-[0.7rem] text-gray-900">{fmtDate(o.created_at)}</td>
                    <td className="whitespace-nowrap border-b border-gray-100 px-3 py-[0.7rem]">
                      <button
                        onClick={() => openOrderModal(o.id)}
                        className="ml-[0.3rem] rounded-full border border-gray-200 px-[0.7rem] py-[0.32rem] text-[0.72rem] font-semibold text-gray-600 transition hover:border-blue-500 hover:bg-blue-500/[0.08] hover:text-blue-500"
                      >
                        View
                      </button>
                      {(NEXT_ACTIONS[o.status] || []).map((a) => (
                        <button
                          key={a.status}
                          onClick={() => (a.status === 'rejected' ? openRejectModal(o.id) : updateOrderStatus(o.id, a.status))}
                          className={`ml-[0.3rem] rounded-full px-[0.7rem] py-[0.32rem] text-[0.72rem] font-semibold ${a.cls}`}
                        >
                          {a.label}
                        </button>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pagination page={data.page} limit={data.limit} total={data.total} onPage={setPage} />}
      </div>

      {modalOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/45 p-6 admin-overlay-in" onClick={(e) => { if (e.target === e.currentTarget) setModalOrder(null); }}>
          <div className="max-h-[85vh] w-full max-w-[560px] overflow-y-auto rounded-[20px] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
              <h3 className="text-[1.05rem] font-bold text-gray-900">Order #{String(modalOrder.id).padStart(4, '0')}</h3>
              <button onClick={() => setModalOrder(null)} className="text-gray-400 hover:text-gray-700">✕</button>
            </div>
            <div className="p-6">
              {modalLoading ? (
                <p className="py-6 text-center text-sm text-gray-400">Loading…</p>
              ) : modalError ? (
                <p className="py-6 text-center text-sm text-red-500">Couldn't load order. {modalError}</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-[0.9rem]">
                    <div><span className="mb-[0.15rem] block text-[0.72rem] uppercase tracking-wide text-gray-400">Customer</span><span className="text-gray-900">{modalOrder.customer_email}</span></div>
                    <div><span className="mb-[0.15rem] block text-[0.72rem] uppercase tracking-wide text-gray-400">Status</span><StatusBadge status={modalOrder.status} /></div>
                    <div><span className="mb-[0.15rem] block text-[0.72rem] uppercase tracking-wide text-gray-400">Color</span><span className="text-gray-900">{modalOrder.color_option === 'bw' ? 'Black & White' : 'Color'}</span></div>
                    <div><span className="mb-[0.15rem] block text-[0.72rem] uppercase tracking-wide text-gray-400">Paper Size</span><span className="text-gray-900">{modalOrder.paper_size}</span></div>
                    <div><span className="mb-[0.15rem] block text-[0.72rem] uppercase tracking-wide text-gray-400">Copies</span><span className="text-gray-900">{modalOrder.copies}</span></div>
                    <div><span className="mb-[0.15rem] block text-[0.72rem] uppercase tracking-wide text-gray-400">Spiral Binding</span><span className="text-gray-900">{modalOrder.spiral_binding ? 'Yes' : 'No'}</span></div>
                    <div><span className="mb-[0.15rem] block text-[0.72rem] uppercase tracking-wide text-gray-400">Express Delivery</span><span className="text-gray-900">{modalOrder.express_delivery ? 'Yes' : 'No'}</span></div>
                    <div><span className="mb-[0.15rem] block text-[0.72rem] uppercase tracking-wide text-gray-400">Amount</span><span className="font-bold text-gray-900">{fmtMoney(modalOrder.total_price)}</span></div>
                    <div><span className="mb-[0.15rem] block text-[0.72rem] uppercase tracking-wide text-gray-400">Placed On</span><span className="text-gray-900">{fmtDate(modalOrder.created_at)}</span></div>
                    {modalOrder.rejection_reason && (
                      <div><span className="mb-[0.15rem] block text-[0.72rem] uppercase tracking-wide text-gray-400">Rejection Reason</span><span className="text-gray-900">{modalOrder.rejection_reason}</span></div>
                    )}
                  </div>

                  <h4 className="mb-3 mt-5 text-[0.9rem] font-bold text-gray-900">Documents ({modalOrder.files?.length || 0})</h4>
                  {modalOrder.files?.length ? (
                    <ul className="flex flex-col gap-2">
                      {modalOrder.files.map((f) => (
                        <li key={f.id} className="flex items-center justify-between rounded-[10px] bg-black/[0.02] px-[0.8rem] py-[0.6rem] text-[0.82rem]">
                          <span className="text-gray-900">{f.original_name} <small className="text-gray-400">({(f.size_bytes / 1024).toFixed(0)} KB)</small></span>
                          <span>
                            <a href={`/api/admin/orders/${modalOrder.id}/documents/${f.id}`} target="_blank" rel="noopener noreferrer" className="ml-3 text-[0.78rem] font-semibold text-blue-500 hover:underline">View</a>
                            <a href={`/api/admin/orders/${modalOrder.id}/documents/${f.id}?download=1`} className="ml-3 text-[0.78rem] font-semibold text-blue-500 hover:underline">Download</a>
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="py-3 text-center text-sm text-gray-400">No documents uploaded for this order.</p>
                  )}

                  {(NEXT_ACTIONS[modalOrder.status] || []).length > 0 && (
                    <div className="mt-5 flex justify-end gap-2.5">
                      {(NEXT_ACTIONS[modalOrder.status] || []).map((a) => (
                        <button
                          key={a.status}
                          onClick={() => (a.status === 'rejected' ? (setModalOrder(null), openRejectModal(modalOrder.id)) : updateOrderStatus(modalOrder.id, a.status, true))}
                          className={`rounded-full px-[1.1rem] py-2 text-[0.85rem] font-semibold ${a.cls}`}
                        >
                          {a.label}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {rejectOrderId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/45 p-6 admin-overlay-in" onClick={(e) => { if (e.target === e.currentTarget) setRejectOrderId(null); }}>
          <div className="w-full max-w-[420px] overflow-y-auto rounded-[20px] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
              <h3 className="text-[1.05rem] font-bold text-gray-900">Reject Order</h3>
              <button onClick={() => setRejectOrderId(null)} className="text-gray-400 hover:text-gray-700">✕</button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-700">Are you sure you want to reject this order? This cannot be undone.</p>
              <label className="mt-4 flex flex-col gap-1.5 text-sm font-medium text-gray-700">
                <span>Reason (optional)</span>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={2}
                  placeholder="e.g. Unsupported file format"
                  className="rounded-[10px] border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                />
              </label>
              <div className="mt-5 flex justify-end gap-2.5">
                <button onClick={() => setRejectOrderId(null)} className="rounded-full border border-gray-200 px-[1.1rem] py-2 text-[0.85rem] font-semibold text-gray-600 transition hover:border-blue-500 hover:bg-blue-500/[0.08] hover:text-blue-500">Cancel</button>
                <button onClick={confirmReject} className="rounded-full bg-red-500 px-[1.1rem] py-2 text-[0.85rem] font-semibold text-white transition hover:bg-red-600">Reject Order</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} />
    </div>
  );
}
