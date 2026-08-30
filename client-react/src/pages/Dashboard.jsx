import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardSidebar from '../components/DashboardSidebar';
import Toast from '../components/Toast';
import useToast from '../lib/useToast';
import useBodyClass from '../lib/useBodyClass';
import useDocumentTitle from '../lib/useDocumentTitle';
import '../styles/style.css';
import '../styles/dashboard.css';

const STATUS_LABELS = { pending: 'Pending', in_progress: 'In Progress', ready: 'Ready', completed: 'Completed' };

export default function Dashboard() {
  const navigate = useNavigate();
  useBodyClass('app-body');
  useDocumentTitle('Dashboard – Print Campus');
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, in_progress: 0, ready: 0 });
  const [orders, setOrders] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/auth/status', { credentials: 'include' });
        const data = await res.json();
        if (!data.isLoggedIn) { navigate('/'); return; }
        if (cancelled) return;
        const name = (data.email || '').split('@')[0];
        setDisplayName(name.charAt(0).toUpperCase() + name.slice(1));
      } catch {
        navigate('/');
        return;
      }
      if (cancelled) return;
      setLoading(false);

      try {
        const res = await fetch('/api/orders/stats', { credentials: 'include' });
        if (res.ok) setStats(await res.json());
      } catch {
        // stats failed — just show zeros
      }

      try {
        const res = await fetch('/api/orders', { credentials: 'include' });
        if (res.ok) setOrders(await res.json());
      } catch {
        // orders failed — show empty state
      }
    }
    load();
    return () => { cancelled = true; };
  }, [navigate]);

  if (loading) return null;

  return (
    <>
      <div className="app-layout">
        <DashboardSidebar userName={displayName} />

        <main className="main-content">
          <div className="content-header">
            <div>
              <h1 className="page-title" id="greetingTitle">Hello, {displayName} 👋</h1>
              <p className="page-subtitle">Here's an overview of your printing activity.</p>
            </div>
            <a href="/new-order" className="new-order-link" id="newOrderBtn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              New Order
            </a>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
              </div>
              <div className="stat-number" id="totalOrders">{stats.total || 0}</div>
              <div className="stat-label">Total Orders</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
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
