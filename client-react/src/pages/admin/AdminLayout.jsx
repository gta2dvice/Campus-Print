import { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import '../../styles/admin-effects.css';

const ICONS = {
  grid: <><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></>,
  doc: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></>,
  clock: <><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></>,
  check: <polyline points="20 6 9 17 4 12"></polyline>,
  printer: <><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></>,
  bag: <><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></>,
  checkcircle: <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></>,
  x: <><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></>,
  wallet: <><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"></path><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"></path><path d="M18 12a2 2 0 0 0 0 4h4v-4z"></path></>,
  list: <><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></>,
  shop: <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></>,
  gear: <><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></>,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></>,
};

function Icon({ name, className = 'h-[17px] w-[17px]' }) {
  return (
    <svg className={`flex-shrink-0 ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {ICONS[name]}
    </svg>
  );
}

// Each nav entry targets a pathname plus an (optional) exact query-string
// match. Order sub-links all share the `/admin/orders` pathname and are only
// distinguished by `?status=`, so pathname alone can't tell them apart —
// active state must compare pathname AND status together (see isNavItemActive).
const ADMIN_NAV = [
  { key: 'dashboard', label: 'Dashboard', path: '/admin', icon: 'grid', exact: true },
  {
    group: 'Orders',
    items: [
      { key: 'orders', label: 'All Orders', path: '/admin/orders', status: null, icon: 'doc' },
      { key: 'orders-pending', label: 'Pending Orders', path: '/admin/orders', status: 'pending', icon: 'clock' },
      { key: 'orders-accepted', label: 'Accepted Orders', path: '/admin/orders', status: 'accepted', icon: 'check' },
      { key: 'orders-printing', label: 'Printing', path: '/admin/orders', status: 'printing', icon: 'printer' },
      { key: 'orders-ready', label: 'Ready for Pickup', path: '/admin/orders', status: 'ready', icon: 'bag' },
      { key: 'orders-completed', label: 'Completed', path: '/admin/orders', status: 'completed', icon: 'checkcircle' },
      { key: 'orders-rejected', label: 'Rejected / Cancelled', path: '/admin/orders', status: 'rejected', icon: 'x' },
    ],
  },
  {
    group: 'Earnings',
    items: [
      { key: 'earnings', label: 'Earnings', path: '/admin/earnings', icon: 'wallet' },
      { key: 'transactions', label: 'Transactions', path: '/admin/transactions', icon: 'list' },
    ],
  },
  {
    group: 'Shop',
    items: [
      { key: 'shop-profile', label: 'Shop Profile', path: '/admin/shop-profile', icon: 'shop' },
      { key: 'settings', label: 'Settings', path: '/admin/settings', icon: 'gear' },
    ],
  },
];

// Exactly one nav item may be active at a time, derived purely from the
// current pathname + search — never from a shared/hoisted boolean.
function isNavItemActive(item, location) {
  if (item.exact) return location.pathname === item.path;
  if (item.path !== location.pathname) return false;
  if (item.status === undefined) return true; // plain pathname-only item (earnings, settings, ...)
  const currentStatus = new URLSearchParams(location.search).get('status') || null;
  return currentStatus === item.status;
}

function navItemClasses(active) {
  return `flex w-full items-center gap-3 rounded-[10px] px-3.5 py-2.5 text-left text-[0.85rem] font-medium transition ${
    active ? 'bg-blue-500 text-white shadow-[0_2px_8px_rgba(59,130,246,0.3)]' : 'text-gray-600 hover:bg-blue-500/[0.08] hover:text-blue-500'
  }`;
}

const FLAT_ADMIN_NAV = ADMIN_NAV.flatMap((entry) => (entry.group ? entry.items : [entry]));

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const activeNavItem = FLAT_ADMIN_NAV.find((item) => isNavItemActive(item, location));
  const pageTitle = activeNavItem ? activeNavItem.label : 'Dashboard';
  const [checking, setChecking] = useState(true);
  const [profileName, setProfileName] = useState('Loading…');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const chipRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function guard() {
      try {
        const res = await fetch('/api/admin/status', { credentials: 'include' });
        const data = await res.json();
        if (!data.isLoggedIn) {
          navigate('/admin/login');
          return;
        }
        if (cancelled) return;
        setProfileName((data.email || '').split('@')[0]);
        try {
          const shopRes = await fetch('/api/admin/shop-profile', { credentials: 'include' });
          if (shopRes.ok) {
            const shop = await shopRes.json();
            if (!cancelled && shop && shop.shop_name) setProfileName(shop.shop_name);
          }
        } catch { /* keep email-derived name */ }
      } catch {
        // network hiccup — leave the guard to the next navigation
      } finally {
        if (!cancelled) setChecking(false);
      }
    }

    guard();
    return () => { cancelled = true; };
  }, [navigate]);

  useEffect(() => {
    function onDocClick(e) {
      if (chipRef.current && !chipRef.current.contains(e.target)) setDropdownOpen(false);
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  async function handleLogout(e) {
    e.preventDefault();
    try {
      await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' });
    } finally {
      navigate('/admin/login');
    }
  }

  if (checking) return null;

  return (
    <div className="flex min-h-screen bg-[linear-gradient(135deg,#f3f7fb_0%,#eaf1f7_100%)]">
      <aside
        className={`fixed left-0 top-0 z-[60] flex h-screen w-[264px] flex-col overflow-y-auto border-r border-[#f0f4f8] bg-white shadow-[0_4px_12px_rgba(0,0,0,0.06),0_2px_4px_rgba(0,0,0,0.04)] transition-transform duration-250 max-md:-translate-x-full ${
          sidebarOpen ? 'max-md:translate-x-0' : ''
        }`}
      >
        <div className="flex items-center gap-3 border-b border-[#f0f4f8] px-5 py-6">
          <div className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#3b82f6,#2563eb)] text-white shadow-[0_2px_8px_rgba(59,130,246,0.35)]">
            <Icon name="printer" className="h-[18px] w-[18px]" />
          </div>
          <div>
            <span className="block text-[0.92rem] font-extrabold tracking-wide text-gray-900">CAMPUS PRINT</span>
            <span className="mt-0.5 block text-[0.7rem] font-medium text-gray-400">Shop Owner Panel</span>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-[0.2rem] px-3 py-4">
          {ADMIN_NAV.map((entry) =>
            entry.group ? (
              <div key={entry.group}>
                <div className="px-3.5 pb-[0.3rem] pt-[0.9rem] text-[0.68rem] font-bold uppercase tracking-wider text-gray-400">{entry.group}</div>
                {entry.items.map((item) => (
                  <Link
                    key={item.key}
                    to={item.status ? `${item.path}?status=${item.status}` : item.path}
                    className={navItemClasses(isNavItemActive(item, location))}
                  >
                    <Icon name={item.icon} />
                    {item.label}
                  </Link>
                ))}
              </div>
            ) : (
              <Link key={entry.key} to={entry.path} className={navItemClasses(isNavItemActive(entry, location))}>
                <Icon name={entry.icon} />
                {entry.label}
              </Link>
            )
          )}
        </nav>

        <div className="border-t border-[#f0f4f8] p-3">
          <a
            href="#"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-[10px] px-3.5 py-2.5 text-[0.85rem] font-medium text-gray-600 transition hover:bg-red-500/[0.08] hover:text-red-500"
          >
            <Icon name="logout" />
            Logout
          </a>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-[55] bg-gray-900/40 admin-overlay-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="ml-[264px] flex min-h-screen flex-1 flex-col max-md:ml-0">
        <header className="sticky top-0 z-40 flex h-[68px] items-center justify-between border-b border-gray-300/50 bg-white/85 px-8 backdrop-blur-md max-md:px-5">
          <div className="flex items-center gap-4">
            <button
              className="flex h-[38px] w-[38px] items-center justify-center rounded-[10px] border border-gray-200 text-gray-600 transition hover:border-blue-500 hover:bg-blue-500/[0.08] hover:text-blue-500 md:hidden"
              onClick={() => setSidebarOpen(true)}
              title="Menu"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            <h1 className="text-[1.15rem] font-bold tracking-tight text-gray-900">{pageTitle}</h1>
          </div>

          <div className="flex items-center gap-3" ref={chipRef}>
            <div className="relative">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setDropdownOpen((v) => !v); }}
                className="flex items-center gap-2.5 rounded-full border border-gray-200 py-[0.35rem] pl-[0.35rem] pr-[0.7rem] transition hover:border-blue-500"
              >
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#3b82f6,#2563eb)] text-white">
                  <Icon name="printer" className="h-[15px] w-[15px]" />
                </div>
                <div className="flex flex-col leading-tight max-md:hidden">
                  <span className="text-[0.82rem] font-semibold capitalize text-gray-900">{profileName}</span>
                  <span className="text-[0.68rem] text-gray-400">Shop Owner</span>
                </div>
                <svg className="h-3.5 w-3.5 text-gray-400 max-md:hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 top-[calc(100%+8px)] z-50 min-w-[170px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-[0_10px_25px_rgba(0,0,0,0.08),0_4px_8px_rgba(0,0,0,0.04)]">
                  <Link to="/admin/settings" className="block px-4 py-2.5 text-[0.82rem] text-gray-600 hover:bg-blue-500/[0.08] hover:text-blue-500">
                    Account Settings
                  </Link>
                  <a href="#" onClick={handleLogout} className="block px-4 py-2.5 text-[0.82rem] text-gray-600 hover:bg-blue-500/[0.08] hover:text-blue-500">
                    Logout
                  </a>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="w-full max-w-[1440px] flex-1 px-8 pb-10 pt-7 max-md:px-5 max-md:pt-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
