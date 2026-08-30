import { useState } from 'react';
import Toast from '../../components/Toast';
import { adminApi } from '../../lib/adminHelpers';

const inputCls = 'w-full rounded-[10px] border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none';
const labelCls = 'mb-4 flex flex-col gap-1.5 text-sm font-medium text-gray-700';

export default function Settings() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [toast, setToast] = useState(null);
  function showToast(message, type = 'success') {
    setToast({ message, type, show: true });
    setTimeout(() => setToast((t) => t && { ...t, show: false }), 3500);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await adminApi('/api/admin/account/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.message || 'Update failed', 'error'); return; }
      showToast('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      showToast('Connection error. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="max-w-[560px] rounded-[18px] border border-gray-300/50 bg-white/90 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] backdrop-blur-md">
        <h2 className="mb-[1.1rem] text-base font-bold text-gray-900">Account Settings</h2>
        <form onSubmit={handleSubmit}>
          <label className={labelCls}>
            <span>Current Password</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={inputCls}
            />
          </label>
          <label className={labelCls}>
            <span>New Password</span>
            <input
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputCls}
            />
          </label>
          <label className={labelCls}>
            <span>Confirm New Password</span>
            <input
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputCls}
            />
          </label>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-blue-500 px-[1.1rem] py-2 text-[0.85rem] font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Update Password
          </button>
        </form>
      </div>
      <Toast toast={toast} />
    </div>
  );
}
