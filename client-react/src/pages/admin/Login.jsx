import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import PageBackground from '../../components/PageBackground';
import LogoLink from '../../components/LogoLink';
import useBodyClass from '../../lib/useBodyClass';
import useDocumentTitle from '../../lib/useDocumentTitle';
import '../../styles/style.css';

export default function Login() {
  const navigate = useNavigate();
  useBodyClass('auth-page');
  useDocumentTitle('Shop Admin Login – Print Campus');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (res.ok) {
        navigate('/admin');
      } else {
        setError(data.message || 'Invalid email or password');
        setSubmitting(false);
      }
    } catch {
      setError('Connection error. Please check your network and try again.');
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-container">
      <PageBackground />
      
      <div style={{ width: '100%', maxWidth: 460, display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 2 }}>
        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: '#93c5fd',
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            fontSize: '0.875rem',
            fontWeight: '600',
            textDecoration: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            transition: 'all 0.2s ease'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Home
        </Link>
        <LogoLink />
      </div>

      <div className="auth-card" style={{ maxWidth: 460 }}>
        <div className="auth-header">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#eff6ff', color: '#2563eb', padding: '0.35rem 0.85rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
            <span>🏪 Shop Admin</span>
          </div>
          <h1>Sign In to Admin Portal</h1>
          <p>Access store management, live print queues &amp; shop analytics</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="adminEmail">Email Address</label>
            <input
              type="email"
              id="adminEmail"
              name="email"
              placeholder="e.g. admin@campusprint.com"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="adminPassword">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                id="adminPassword"
                name="password"
                placeholder="••••••••"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.85rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  color: '#64748b',
                  padding: 0
                }}
                title={showPassword ? 'Hide Password' : 'Show Password'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '10px', fontSize: '0.875rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <button type="submit" className="auth-submit" disabled={submitting}>
            {submitting ? 'Authenticating…' : 'Sign In to Shop Admin →'}
          </button>
        </form>
      </div>
    </div>
  );
}
