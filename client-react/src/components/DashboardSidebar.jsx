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

  const navItemClass = ({ isActive }) =>
    `flex items-center gap-3 rounded-[10px] px-3.5 py-2.5 text-sm font-medium transition ${
      isActive ? 'bg-blue-500 text-white shadow-[0_2px_8px_rgba(59,130,246,0.3)]' : 'text-gray-600 hover:bg-blue-500/[0.08] hover:text-blue-500'
    }`;

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-[240px] flex-col border-r border-[#f0f4f8] bg-white shadow-[0_4px_12px_rgba(0,0,0,0.06),0_2px_4px_rgba(0,0,0,0.04)] max-md:-translate-x-full">
      <div className="flex items-center gap-3 border-b border-[#f0f4f8] px-5 py-6">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] bg-[linear-gradient(135deg,#3b82f6,#2563eb)] text-sm font-bold text-white shadow-[0_2px_8px_rgba(59,130,246,0.35)]">CP</div>
        <span className="text-base font-bold tracking-tight text-gray-900">CampusPrint</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
        <NavLink to="/dashboard" end className={navItemClass}>
          <svg className="h-[18px] w-[18px] flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
          Dashboard
        </NavLink>
        <NavLink to="/new-order" className={navItemClass}>
          <svg className="h-[18px] w-[18px] flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 6 2 18 2 18 9"></polyline>
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
            <rect x="6" y="14" width="12" height="8"></rect>
          </svg>
          New Order
        </NavLink>
      </nav>

      <div className="flex flex-col gap-3 border-t border-[#f0f4f8] p-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#3b82f6,#2563eb)] text-sm font-bold text-white">
            {userName ? userName.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[0.82rem] font-semibold text-gray-900">{userName || 'Loading…'}</span>
            <span className="text-[0.72rem] text-gray-400">Student</span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-1.5 rounded-full border border-gray-200 px-3.5 py-2 text-sm font-medium text-gray-600 transition hover:border-red-500 hover:bg-red-500/5 hover:text-red-500"
        >
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
