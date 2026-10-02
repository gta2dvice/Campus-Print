import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { consumeAuthRedirect } from '../lib/authRedirect';
import PasswordStrengthIndicator, { calculatePasswordStrength } from './PasswordStrengthIndicator';
import TurnstileWidget from './TurnstileWidget';

export default function AuthModal({ open, onClose }) {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [resendStatus, setResendStatus] = useState('');

  const { signIn, signUp, resendVerificationEmail } = useAuth();
  const navigate = useNavigate();

  function reset() {
    setIsLoginMode(true);
    setName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setError('');
    setSignupSuccess(false);
    setUnverifiedEmail('');
    setResendStatus('');
  }

  function handleClose() {
    reset();
    onClose();
  }

  function validateEmail(val) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setUnverifiedEmail('');
    setResendStatus('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !validateEmail(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!turnstileToken) {
      setError('Please complete the security verification and try again.');
      return;
    }

    if (!isLoginMode) {
      const trimmedName = name.trim();
      if (!trimmedName) {
        setError('Please enter your full name.');
        return;
      }

      const strength = calculatePasswordStrength(password);
      if (!strength.checks.length) {
        setError('Password must be at least 8 characters long.');
        return;
      }
      if (!strength.isStrong) {
        setError('Please choose a stronger password (include uppercase, lowercase, numbers, and symbols).');
        return;
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setSubmitting(true);
    try {
      if (isLoginMode) {
        await signIn({ email: trimmedEmail, password, turnstileToken });
        handleClose();
        navigate(consumeAuthRedirect());
      } else {
        await signUp({
          name: name.trim(),
          email: trimmedEmail,
          password,
          turnstileToken
        });
        setSignupSuccess(true);
      }
    } catch (err) {
      if (err.unverified) {
        setUnverifiedEmail(trimmedEmail);
        setError('Please verify your email before logging in.');
      } else {
        setError(err.message || 'Authentication failed. Please try again.');
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
    <div
      id="authModal"
      className={`modal-overlay${open ? ' active' : ''}`}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="modal-content" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <button type="button" id="closeModal" className="close-btn" onClick={handleClose}>&times;</button>

        {signupSuccess ? (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                background: '#dcfce7',
                color: '#15803d',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem',
                fontSize: '1.75rem',
              }}
            >
              ✉️
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
              Check your email
            </h2>
            <p style={{ color: '#475569', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              Account created. Please check your email (<strong>{email}</strong>) and click the verification link to activate your Campus Print account.
            </p>
            <button
              type="button"
              className="btn btn-primary submit-btn"
              onClick={() => {
                setIsLoginMode(true);
                setSignupSuccess(false);
              }}
            >
              Back to Login
            </button>
          </div>
        ) : (
          <>
            <div className="modal-header">
              <button
                type="button"
                className={`toggle-btn${isLoginMode ? ' active' : ''}`}
                onClick={() => { setIsLoginMode(true); setError(''); setTurnstileToken(''); }}
              >
                Login
              </button>
              <button
                type="button"
                className={`toggle-btn${!isLoginMode ? ' active' : ''}`}
                onClick={() => { setIsLoginMode(false); setError(''); setTurnstileToken(''); }}
              >
                Sign Up
              </button>
            </div>

            {error && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  color: '#b91c1c',
                  fontSize: '0.85rem',
                  marginBottom: '1rem',
                  lineHeight: 1.4,
                }}
              >
                {error}
                {unverifiedEmail && (
                  <div style={{ marginTop: '0.5rem', borderTop: '1px solid #fee2e2', paddingTop: '0.4rem' }}>
                    {resendStatus === 'sent' ? (
                      <span style={{ color: '#15803d', fontWeight: 500 }}>
                        Verification link resent!
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
                          fontSize: '0.8rem',
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
              {!isLoginMode && (
                <div className="form-group">
                  <label htmlFor="modal-name">Full Name</label>
                  <input
                    type="text"
                    id="modal-name"
                    name="name"
                    required
                    placeholder="Alex Johnson"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              )}

              <div className="form-group">
                <label htmlFor="modal-email">Email</label>
                <input
                  type="email"
                  id="modal-email"
                  name="email"
                  required
                  placeholder="student@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label htmlFor="modal-password">Password</label>
                  {isLoginMode && (
                    <Link
                      to="/forgot-password"
                      onClick={handleClose}
                      style={{ fontSize: '0.78rem', color: '#3b82f6', textDecoration: 'none' }}
                    >
                      Forgot?
                    </Link>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="modal-password"
                    name="password"
                    required
                    placeholder={isLoginMode ? 'Enter your password' : 'Create strong password'}
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
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    )}
                  </button>
                </div>
                {!isLoginMode && <PasswordStrengthIndicator password={password} />}
              </div>

              {!isLoginMode && (
                <div className="form-group">
                  <label htmlFor="modal-confirm-password">Confirm Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      id="modal-confirm-password"
                      name="confirmPassword"
                      required
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      style={{ paddingRight: '2.5rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                      )}
                    </button>
                  </div>
                </div>
              )}

              <TurnstileWidget
                onVerify={(token) => setTurnstileToken(token)}
                onExpire={() => setTurnstileToken('')}
                onError={() => setTurnstileToken('')}
              />

              <button
                type="submit"
                className="btn btn-primary submit-btn"
                id="authSubmitBtn"
                disabled={submitting}
              >
                {submitting ? 'Please wait...' : isLoginMode ? 'Login' : 'Sign Up'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
