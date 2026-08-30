import { NavLink, useNavigate } from 'react-router-dom';

export default function DashboardSidebar({ userName }) {
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } finally {
      navigate('/');
    }
  }

  const navItemClass = ({ isActive }) => `nav-item${isActive ? ' active' : ''}`;

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo-mark">CP</div>
        <span className="logo-text">CampusPrint</span>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/dashboard" end className={navItemClass}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
          Dashboard
        </NavLink>
        <NavLink to="/new-order" className={navItemClass}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 6 2 18 2 18 9"></polyline>
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
            <rect x="6" y="14" width="12" height="8"></rect>
          </svg>
          New Order
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">{userName ? userName.charAt(0).toUpperCase() : 'U'}</div>
          <div className="user-details">
            <span className="user-name">{userName || 'Loading…'}</span>
            <span className="user-role">Student</span>
          </div>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          Logout
        </button>
      </div>
    </aside>
  );
}
