import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AuthModal({ open, onClose }) {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  function reset() {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError('');
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!isLoginMode && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const endpoint = isLoginMode ? '/api/auth/login' : '/api/auth/signup';
    setSubmitting(true);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        handleClose();
        navigate('/dashboard');
      } else {
        setError(data.message || 'Authentication failed.');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
        open ? 'opacity-100 visible' : 'opacity-0 invisible'
      }`}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        className={`relative w-[90%] max-w-[400px] rounded-[20px] border border-white/30 bg-white/70 p-10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.1)] backdrop-blur-2xl transition-all duration-400 ${
          open ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-5 opacity-0'
        }`}
      >
        <button
          className="absolute right-4 top-4 text-2xl text-gray-500 transition hover:scale-110 hover:text-gray-900"
          onClick={handleClose}
        >
          &times;
        </button>

        <div className="relative mb-8 flex justify-center gap-6 after:absolute after:-bottom-2.5 after:left-0 after:h-px after:w-full after:bg-black/10">
          <button
            className={`relative pb-1 text-lg font-semibold transition-colors ${
              isLoginMode ? 'text-blue-500 after:absolute after:-bottom-2.5 after:left-0 after:h-[3px] after:w-full after:rounded after:bg-blue-500 after:content-[""]' : 'text-gray-500'
            }`}
            onClick={() => { setIsLoginMode(true); setError(''); }}
          >
            Login
          </button>
          <button
            className={`relative pb-1 text-lg font-semibold transition-colors ${
              !isLoginMode ? 'text-blue-500 after:absolute after:-bottom-2.5 after:left-0 after:h-[3px] after:w-full after:rounded after:bg-blue-500 after:content-[""]' : 'text-gray-500'
            }`}
            onClick={() => { setIsLoginMode(false); setError(''); }}
          >
            Sign Up
          </button>
        </div>

        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-sm font-medium text-gray-900">Email</label>
            <input
              id="email"
              type="email"
              required
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-[10px] border border-black/10 bg-white/80 px-4 py-3 text-base transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/20"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-sm font-medium text-gray-900">Password</label>
            <input
              id="password"
              type="password"
              required
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-[10px] border border-black/10 bg-white/80 px-4 py-3 text-base transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/20"
            />
          </div>

          {!isLoginMode && (
            <div className="flex flex-col gap-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-900">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                required
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="rounded-[10px] border border-black/10 bg-white/80 px-4 py-3 text-base transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/20"
              />
            </div>
          )}

          <div className="min-h-[1.25rem] text-center text-sm text-red-500">{error}</div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-4 flex w-full items-center justify-center rounded-full bg-blue-500 px-6 py-3.5 font-medium text-white shadow-[0_4px_6px_-1px_rgba(59,130,246,0.3),0_2px_4px_-1px_rgba(59,130,246,0.2)] transition hover:-translate-y-px hover:bg-blue-600 disabled:opacity-60"
          >
            {submitting ? 'Please wait...' : isLoginMode ? 'Login' : 'Sign Up'}
          </button>
        </form>
      </div>
    </div>
  );
}
