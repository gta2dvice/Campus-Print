import { useEffect, useState } from 'react';
import Toast from '../../components/Toast';
import { adminApi } from '../../lib/adminHelpers';

const inputCls = 'w-full rounded-[10px] border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none';
const labelCls = 'mb-1.5 flex flex-col gap-1.5 text-sm font-medium text-gray-700';

export default function ShopProfile() {
  const [form, setForm] = useState({
    shop_name: '', owner_name: '', phone: '', email: '', address: '',
    opens_at: '', closes_at: '', is_open: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState(null);
  function showToast(message, type = 'success') {
    setToast({ message, type, show: true });
    setTimeout(() => setToast((t) => t && { ...t, show: false }), 3500);
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await adminApi('/api/admin/shop-profile');
        if (!res.ok) throw new Error('Failed to load shop profile');
        const p = await res.json();
        if (cancelled) return;
        setForm({
          shop_name: p.shop_name || '',
          owner_name: p.owner_name || '',
          phone: p.phone || '',
          email: p.email || '',
          address: p.address || '',
          opens_at: p.opens_at || '',
          closes_at: p.closes_at || '',
          is_open: !!p.is_open,
        });
      } catch {
        if (!cancelled) showToast('Could not load shop profile.', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await adminApi('/api/admin/shop-profile', {
        method: 'PUT',
        body: JSON.stringify({
          shop_name: form.shop_name.trim(),
          owner_name: form.owner_name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          address: form.address.trim(),
          opens_at: form.opens_at || null,
          closes_at: form.closes_at || null,
          is_open: form.is_open,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        showToast(data.message || 'Save failed', 'error');
        return;
      }
      showToast('Shop profile updated.');
    } catch {
      showToast('Connection error. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="max-w-[560px] rounded-[18px] border border-gray-300/50 bg-white/90 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] backdrop-blur-md">
        <h2 className="mb-[1.1rem] text-base font-bold text-gray-900">Shop Profile</h2>
        {loading ? (
          <p className="py-6 text-center text-sm text-gray-400">Loading…</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <label className={labelCls}>
              <span>Shop Name</span>
              <input type="text" value={form.shop_name} onChange={(e) => update('shop_name', e.target.value)} className={inputCls} />
            </label>
            <label className={labelCls}>
              <span>Owner Name</span>
              <input type="text" value={form.owner_name} onChange={(e) => update('owner_name', e.target.value)} className={inputCls} />
            </label>
            <label className={labelCls}>
              <span>Phone</span>
              <input type="text" value={form.phone} onChange={(e) => update('phone', e.target.value)} className={inputCls} />
            </label>
            <label className={labelCls}>
              <span>Email</span>
              <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} className={inputCls} />
            </label>
            <label className={labelCls}>
              <span>Address</span>
              <textarea rows={2} value={form.address} onChange={(e) => update('address', e.target.value)} className={inputCls} />
            </label>
            <div className="mb-4 flex gap-4">
              <label className="flex flex-1 flex-col gap-1.5 text-sm font-medium text-gray-700">
                <span>Opens At</span>
                <input type="time" value={form.opens_at} onChange={(e) => update('opens_at', e.target.value)} className={inputCls} />
              </label>
              <label className="flex flex-1 flex-col gap-1.5 text-sm font-medium text-gray-700">
                <span>Closes At</span>
                <input type="time" value={form.closes_at} onChange={(e) => update('closes_at', e.target.value)} className={inputCls} />
              </label>
            </div>
            <label className="mb-4 flex items-center gap-2 text-sm font-medium text-gray-700">
              <input type="checkbox" checked={form.is_open} onChange={(e) => update('is_open', e.target.checked)} />
              Shop currently open for orders
            </label>
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-blue-500 px-[1.1rem] py-2 text-[0.85rem] font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Save Changes
            </button>
          </form>
        )}
      </div>
      <Toast toast={toast} />
    </div>
  );
}
