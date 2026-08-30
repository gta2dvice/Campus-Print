import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/super-admin/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (res.ok) {
        navigate('/super-admin');
      } else {
        setError(data.message || 'Login failed');
        setSubmitting(false);
      }
    } catch {
      setError('Network error. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(to_bottom,#f3f7fb_0%,#eaf1f7_100%)] p-6">
      <div className="w-full max-w-[400px]">
        <div className="rounded-3xl border border-white/60 bg-white/85 px-10 py-11 text-center shadow-[0_20px_60px_rgba(59,130,246,0.12),0_4px_16px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-2xl">
          <h1 className="mb-1.5 text-[1.6rem] font-extrabold tracking-[0.08em] text-gray-900">CAMPUS PRINT</h1>
          <p className="mb-8 text-[0.85rem] font-semibold uppercase tracking-[0.06em] text-blue-500">Super Admin</p>

          <form className="text-left" onSubmit={handleSubmit}>
            <div className="mb-4 flex flex-col gap-1.5">
              <label htmlFor="superAdminEmail" className="text-sm font-medium text-gray-600">Email</label>
              <input
                type="email"
                id="superAdminEmail"
                name="email"
                placeholder="you@campusprint.com"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-[10px] border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500"
              />
            </div>
            <div className="mb-4 flex flex-col gap-1.5">
              <label htmlFor="superAdminPassword" className="text-sm font-medium text-gray-600">Password</label>
              <input
                type="password"
                id="superAdminPassword"
                name="password"
                placeholder="••••••••"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-[10px] border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500"
              />
            </div>

            {error && <p className="mb-3 text-sm font-medium text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-blue-500 px-6 py-3 text-sm font-semibold tracking-[0.05em] text-white shadow-[0_4px_12px_rgba(59,130,246,0.3)] transition hover:-translate-y-px hover:bg-blue-600 hover:shadow-[0_6px_16px_rgba(59,130,246,0.4)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              AUTH
              <span aria-hidden="true">→</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
