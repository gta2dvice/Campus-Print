// Shared helpers for the shop-admin panel (mirrors client/admin/common.js)

export const STATUS_LABELS = {
  pending: 'Pending',
  accepted: 'Accepted',
  printing: 'Printing',
  ready: 'Ready',
  completed: 'Completed',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

export const STATUS_BADGE_CLASSES = {
  pending: 'bg-amber-500/10 text-amber-600',
  accepted: 'bg-blue-500/10 text-blue-600',
  printing: 'bg-violet-500/10 text-violet-600',
  ready: 'bg-emerald-500/10 text-emerald-600',
  completed: 'bg-gray-500/10 text-gray-600',
  rejected: 'bg-red-500/10 text-red-600',
  cancelled: 'bg-red-500/8 text-red-700',
  success: 'bg-emerald-500/10 text-emerald-600',
  refunded: 'bg-gray-500/10 text-gray-600',
  failed: 'bg-red-500/10 text-red-600',
};

export const PAY_LABELS = {
  success: 'Success',
  refunded: 'Refunded',
  pending: 'Pending',
  failed: 'Failed',
};

export const NEXT_ACTIONS = {
  pending: [
    { status: 'accepted', label: 'Accept', cls: 'bg-emerald-500 hover:bg-emerald-600 text-white' },
    { status: 'rejected', label: 'Reject', cls: 'bg-red-500 hover:bg-red-600 text-white' },
  ],
  accepted: [{ status: 'printing', label: 'Start Printing', cls: 'bg-blue-500 hover:bg-blue-600 text-white' }],
  printing: [{ status: 'ready', label: 'Mark Ready', cls: 'bg-blue-500 hover:bg-blue-600 text-white' }],
  ready: [{ status: 'completed', label: 'Mark Completed', cls: 'bg-emerald-500 hover:bg-emerald-600 text-white' }],
};

export function fmtMoney(n) {
  return `₹${Number(n || 0).toFixed(0)}`;
}

export function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export async function adminApi(url, opts = {}) {
  const res = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (res.status === 401) {
    window.location.href = '/admin/login';
    throw new Error('Unauthorized');
  }
  return res;
}
