import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { consumeAuthRedirect } from '../lib/authRedirect';

export default function AuthModal({ open, onClose }) {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  function reset() {
    setIsLoginMode(true);
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
        navigate(consumeAuthRedirect());
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
      id="authModal"
      className={`modal-overlay${open ? ' active' : ''}`}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="modal-content">
        <button type="button" id="closeModal" className="close-btn" onClick={handleClose}>&times;</button>

        <div className="modal-header">
          <button
            type="button"
            className={`toggle-btn${isLoginMode ? ' active' : ''}`}
            onClick={() => { setIsLoginMode(true); setError(''); }}
          >
            Login
          </button>
          <button
            type="button"
            className={`toggle-btn${!isLoginMode ? ' active' : ''}`}
            onClick={() => { setIsLoginMode(false); setError(''); }}
          >
            Sign Up
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              required
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              required
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="form-group" id="confirmPasswordGroup" style={{ display: isLoginMode ? 'none' : 'flex' }}>
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              required={!isLoginMode}
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <div id="authError" className="auth-error">{error}</div>

          <button type="submit" className="btn btn-primary submit-btn" id="authSubmitBtn" disabled={submitting}>
            {submitting ? 'Please wait...' : isLoginMode ? 'Login' : 'Sign Up'}
          </button>
        </form>
      </div>
    </div>
  );
}
