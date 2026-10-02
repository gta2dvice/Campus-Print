import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { setAuthRedirect } from '../lib/authRedirect';

export default function ProtectedRoute({ children }) {
  const { user, session, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && (!session || !user)) {
      setAuthRedirect(location.pathname + location.search);
      navigate('/login', { replace: true });
    }
  }, [loading, session, user, location, navigate]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#f8fafc',
        color: '#64748b',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid #e2e8f0',
          borderTopColor: '#3b82f6',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          marginBottom: '1rem'
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ fontSize: '0.95rem', fontWeight: 500 }}>Loading Campus Print...</p>
      </div>
    );
  }

  if (!session || !user) {
    return null;
  }

  return children;
}
