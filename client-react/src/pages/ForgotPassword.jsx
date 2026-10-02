import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LogoLink from '../components/LogoLink';
import PageBackground from '../components/PageBackground';
import useBodyClass from '../lib/useBodyClass';
import useDocumentTitle from '../lib/useDocumentTitle';
import '../styles/style.css';

export default function ForgotPassword() {
  useBodyClass('auth-page');
  useDocumentTitle('Reset Password – Campus Print');

  const { resetPasswordForEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  function validateEmail(val) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !validateEmail(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setSubmitting(true);
    try {
      await resetPasswordForEmail(trimmedEmail);
      // Always show generic message to avoid revealing account existence
      setSubmitted(true);
    } catch {
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-container">
      <PageBackground />

      <div style={{ width: '100%', maxWidth: 480, display: 'flex', justifyContent: 'center', zIndex: 2 }}>
        <LogoLink />
      </div>

      <div className="auth-card">
        {submitted ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                background: '#eff6ff',
                color: '#2563eb',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem',
                fontSize: '2rem',
              }}
            >
              📩
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem' }}>
              Check your inbox
            </h1>
            <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '2rem' }}>
              If an account exists for <strong>{email}</strong>, you will receive password reset instructions shortly.
            </p>
            <Link
              to="/login"
              className="auth-submit"
              style={{ display: 'inline-block', textDecoration: 'none', textAlign: 'center' }}
            >
              Return to Login
            </Link>
          </div>
        ) : (
          <>
            <div className="auth-header">
              <h1>Forgot Password</h1>
              <p>Enter your email and we'll send you a link to reset your password</p>
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
              </div>
            )}

            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="reset-email">Email Address</label>
                <input
                  type="email"
                  id="reset-email"
                  name="email"
                  required
                  autoComplete="email"
                  placeholder="student@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="auth-submit"
                disabled={submitting}
              >
                {submitting ? 'Sending instructions...' : 'Send Reset Link'}
              </button>
            </form>

            <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: '#64748b' }}>
              Remembered your password?{' '}
              <Link to="/login" style={{ color: '#3b82f6', fontWeight: 600, textDecoration: 'none' }}>
                Back to Login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
