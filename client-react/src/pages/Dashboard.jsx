import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import DashboardSidebar from '../components/DashboardSidebar';
import Toast from '../components/Toast';
import useToast from '../lib/useToast';
import useBodyClass from '../lib/useBodyClass';
import useDocumentTitle from '../lib/useDocumentTitle';
import '../styles/style.css';
import '../styles/dashboard.css';

const STATUS_LABELS = { pending: 'Pending', accepted: 'Accepted', printing: 'Printing', ready: 'Ready', completed: 'Completed' };
const STATUS_COLORS = { pending: '🟡', accepted: '🔵', printing: '🟡', ready: '🟢', completed: '✓' };

export default function Dashboard() {
  const navigate = useNavigate();
  useBodyClass('app-body');
  useDocumentTitle('Dashboard – Print Campus');
  const { toast } = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState(null);
  const [authStatus, setAuthStatus] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const authRes = await fetch('/api/auth/status', { credentials: 'include' });
        const authData = await authRes.json();
        if (!authData.isLoggedIn) { navigate('/'); return; }
        if (!authData.profileComplete) { navigate('/complete-profile'); return; }
        setAuthStatus(authData);

        const profRes = await fetch('/api/auth/profile', { credentials: 'include' });
        if (profRes.ok) setProfile(await profRes.json());

        const ordersRes = await fetch('/api/orders', { credentials: 'include' });
        if (ordersRes.ok) setOrders(await ordersRes.json());

      } catch {
        navigate('/');
        return;
      }
      if (cancelled) return;
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [navigate]);

  if (loading) return null;

  const displayName = profile?.full_name || (authStatus?.email || '').split('@')[0];

  return (
    <>
      <div className="app-layout">
        <DashboardSidebar userName={displayName} />

        <main className="main-content">
          <div className="content-header">
            <div style={{ textAlign: 'left' }}>
              <h1 className="page-title">My Dashboard 👋</h1>
              <p className="page-subtitle">Welcome back, {displayName}!</p>
            </div>
            <Link to="/new-order" className="new-order-link">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              New Order
            </Link>
          </div>

          <div className="dashboard-grid" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Profile Section */}
            <div className="dashboard-card" style={{ background: 'white', borderRadius: '1rem', padding: '1.5rem', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.25rem', margin: 0 }}>👤 My Profile</h2>
                <Link to="/edit-profile" className="edit-profile-btn" style={{ fontSize: '0.875rem', color: '#007bff', textDecoration: 'none', fontWeight: '500' }}>
                  Edit Profile
                </Link>
              </div>
              <div className="profile-details" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem' }}>
                <div style={{ color: '#666' }}>Name</div>
                <div style={{ fontWeight: '500' }}>{profile?.full_name || 'N/A'}</div>
                <div style={{ color: '#666' }}>Phone</div>
                <div style={{ fontWeight: '500' }}>{profile?.phone_number || 'N/A'}</div>
                <div style={{ color: '#666' }}>Class / Room</div>
                <div style={{ fontWeight: '500' }}>{profile?.class_room_number || 'N/A'}</div>
              </div>
            </div>

            {/* Orders Section */}
            <div className="dashboard-card" style={{ background: 'white', borderRadius: '1rem', padding: '1.5rem', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>📄 My Recent Orders</h2>
              <div id="ordersContainer">
                {!orders || orders.length === 0 ? (
                  <div className="empty-state" style={{ textAlign: 'center', padding: '2rem 0' }}>
                    <p style={{ color: '#666' }}>No orders yet</p>
                    <Link to="/new-order" className="new-order-link" style={{ fontSize: '0.875rem', padding: '0.6rem 1.25rem', display: 'inline-block' }}>
                      Start your first order
                    </Link>
                  </div>
                ) : (
                  <div className="orders-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {orders.map((o) => (
                      <Link
                        key={o.id}
                        to={`/order/${o.id}`}
                        className="order-item"
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '1rem',
                          borderRadius: '0.75rem',
                          border: '1px solid #eee',
                          textDecoration: 'none',
                          color: 'inherit',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f9f9f9'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '600', fontSize: '1rem' }}>#{String(o.id).padStart(4, '0')}</span>
                          <span style={{ fontSize: '0.8rem', color: '#666' }}>{new Date(o.created_at).toLocaleDateString()}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                          <span style={{ fontWeight: '600' }}>₹{parseFloat(o.total_price).toFixed(0)}</span>
                          <span style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            {STATUS_COLORS[o.status] || '⚪'} {STATUS_LABELS[o.status] || o.status}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      <Toast toast={toast} />
    </>
  );
}
0"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </div>
              <div className="stat-number" id="inProgress">{stats.in_progress || 0}</div>
              <div className="stat-label">In Progress</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              <div className="stat-number" id="readyCount">{stats.ready || 0}</div>
              <div className="stat-label">Ready / Completed</div>
            </div>
          </div>

          <div className="orders-section">
            <h2 className="section-title">Recent Orders</h2>
            <div id="ordersContainer">
              {!orders || orders.length === 0 ? (
                <div className="empty-state" id="emptyState">
                  <div className="empty-icon-wrap">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                  </div>
                  <h3>No orders yet</h3>
                  <p>You haven't printed anything yet.</p>
                  <a href="/new-order" className="new-order-link" style={{ fontSize: '0.875rem', padding: '0.6rem 1.25rem' }}>
                    Start your first order
                  </a>
                </div>
              ) : (
                <div className="orders-table-wrap">
                  <table className="orders-table">
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Date</th>
                        <th>Details</th>
                        <th>Status</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((o) => {
                        const date = new Date(o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                        const color = o.color_option === 'bw' ? 'B&W' : 'Color';
                        const status = o.status || 'pending';
                        return (
                          <tr key={o.id}>
                            <td>#{String(o.id).padStart(4, '0')}</td>
                            <td>{date}</td>
                            <td>{color} · {o.paper_size} · {o.copies}x</td>
                            <td><span className={`status-badge status-${status}`}>{STATUS_LABELS[status] || status}</span></td>
                            <td><strong>₹{parseFloat(o.total_price).toFixed(0)}</strong></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      <Toast toast={toast} />
    </>
  );
}
