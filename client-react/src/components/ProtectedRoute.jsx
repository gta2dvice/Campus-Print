import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, session, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && (!session || !user)) {
      // Student routes are now public, so we don't redirect to /login for them.
      // However, admin routes might still use this.
      // But in App.jsx we removed ProtectedRoute from student routes.
      // To be safe, we can check if the path starts with /admin or /super-admin.
      if (location.pathname.startsWith('/admin') || location.pathname.startsWith('/super-admin')) {
        navigate('/admin/login', { replace: true });
      } else {
        // For other routes, we just let them through or redirect to home.
        // Since we are removing student auth, /login is gone.
        navigate('/', { replace: true });
      }
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
