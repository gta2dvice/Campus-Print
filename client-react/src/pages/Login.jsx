import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { consumeAuthRedirect } from '../lib/authRedirect';
import LogoLink from '../components/LogoLink';
import PageBackground from '../components/PageBackground';
import TurnstileWidget from '../components/TurnstileWidget';
import useBodyClass from '../lib/useBodyClass';
import useDocumentTitle from '../lib/useDocumentTitle';
import '../styles/style.css';

export default function Login() {
  useBodyClass('auth-page');
  useDocumentTitle('Login – Campus Print');

  const { signIn, resendVerificationEmail } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [resendStatus, setResendStatus] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setUnverifiedEmail('');
    setResendStatus('');

    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    if (!turnstileToken) {
      setError('Please complete the security verification and try again.');
      return;
    }

    setSubmitting(true);
    try {
      await signIn({ email: normalizedEmail, password, turnstileToken });
      const destination = consumeAuthRedirect();
      navigate(destination, { replace: true });
    } catch (err) {
      if (err.unverified) {
        setUnverifiedEmail(normalizedEmail);
        setError('Please verify your email before logging in.');
      } else {
        setError(err.message || 'Email or password is incorrect.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResendVerification() {
    if (!unverifiedEmail) return;
    try {
      setResendStatus('sending');
      await resendVerificationEmail(unverifiedEmail);
      setResendStatus('sent');
    } catch {
      setResendStatus('error');
    }
  }

  return (
    <div className="auth-container">
      <PageBackground />

      <div style={{ width: '100%', maxWidth: 480, display: 'flex', justifyContent: 'center', zIndex: 2 }}>
        <LogoLink />
      </div>

      <div className="auth-card">
        <div className="auth-header">
          <h1>Welcome Back</h1>
          <p>Log in to access your print jobs and dashboard</p>
        </div>

        {error && (
          <div
            style={{
              padding: '0.85rem 1rem',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '10px',
              color: '#b91c1c',
              fontSize: '0.875rem',
              marginBottom: '1.25rem',
              lineHeight: 1.4,
            }}
          >
            {error}

            {unverifiedEmail && (
              <div style={{ marginTop: '0.6rem', borderTop: '1px solid #fee2e2', paddingTop: '0.5rem' }}>
                {resendStatus === 'sent' ? (
                  <span style={{ color: '#15803d', fontWeight: 500 }}>
                    Verification link resent! Check your inbox.
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resendStatus === 'sending'}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2563eb',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      padding: 0,
                      textDecoration: 'underline',
                    }}
                  >
                    {resendStatus === 'sending' ? 'Sending link...' : 'Resend verification email'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="login-email">Email Address</label>
            <input
              type="email"
              id="login-email"
              name="email"
              required
              autoComplete="email"
              placeholder="student@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label htmlFor="login-password">Password</label>
              <Link
                to="/forgot-password"
                style={{ fontSize: '0.8rem', color: '#3b82f6', textDecoration: 'none', fontWeight: 500 }}
              >
                Forgot Password?
              </Link>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                id="login-password"
                name="password"
                required
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                )}
              </button>
            </div>
          </div>

          <TurnstileWidget
            onVerify={(token) => setTurnstileToken(token)}
            onExpire={() => setTurnstileToken('')}
            onError={() => setTurnstileToken('')}
          />

          <button
            type="submit"
            className="auth-submit"
            disabled={submitting}
          >
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: '#64748b' }}>
          Don't have an account?{' '}
          <Link to="/signup" style={{ color: '#3b82f6', fontWeight: 600, textDecoration: 'none' }}>
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
