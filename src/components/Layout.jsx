import { useEffect, useRef, useState } from 'react';
import { NavLink, Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Home, Map, Compass, FolderOpen, ClipboardList, GraduationCap, Search, User, FileText, PenLine, Settings, ChevronDown, X, LogOut, CloudOff } from 'lucide-react';
import { useAuth } from '../lib/auth.jsx';
import { useStore } from '../lib/store.jsx';
import { firstName } from '../lib/insights.js';
import SearchPalette from './SearchPalette.jsx';
import Logo from './Logo.jsx';

const NAV = [
  { to: '/home', label: 'Home', icon: Home },
  { to: '/roadmap', label: 'Roadmap', icon: Map },
  { to: '/opportunities', label: 'Opportunities', icon: Compass },
  { to: '/documents', label: 'Documents', icon: FolderOpen },
  { to: '/applications', label: 'Applications', icon: ClipboardList },
  { to: '/learn', label: 'Course Intelligence', short: 'Courses', icon: GraduationCap },
];

export default function Layout() {
  const { state, sync } = useStore();
  const { user, signout } = useAuth();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const loc = useLocation();
  const menuRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearchOpen(true); }
      if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement?.tagName) && !document.activeElement?.isContentEditable) { e.preventDefault(); setSearchOpen(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => { setMenuOpen(false); window.scrollTo({ top: 0, behavior: 'instant' }); }, [loc.pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const close = (e) => { if (!menuRef.current?.contains(e.target)) setMenuOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('mousedown', close); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [menuOpen]);

  const initials = (state.profile?.name || '?').split(/\s+/).map((x) => x[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="app">
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="topbar">
        <div className="container topbar-inner">
          <Link to="/home" className="brand" aria-label="Horizon home"><Logo /></Link>
          <nav className="mainnav" aria-label="Primary">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className={({ isActive }) => `navlink ${isActive ? 'active' : ''}`}>
                <span className="full">{n.label}</span><span className="short">{n.short || n.label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="row" style={{ gap: 8 }}>
            <button className="searchbtn" onClick={() => setSearchOpen(true)} aria-label="Search Horizon (Ctrl K)">
              <Search size={18} /><span className="searchbtn-text">Search</span><kbd>Ctrl K</kbd>
            </button>
            <div className="menu-wrap" ref={menuRef}>
              <button className="avatar-btn" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((v) => !v)} aria-label="Open profile menu">
                <span className="avatar">{initials}</span><ChevronDown size={16} className="hide-sm" />
              </button>
              {menuOpen && (
                <div className="menu" role="menu">
                  <div className="menu-head">
                    <strong>{state.profile?.name}</strong>
                    <span className="tiny muted truncate">{user?.email}</span>
                  </div>
                  <Link role="menuitem" to="/profile" className="menu-item"><User size={17} />Profile</Link>
                  <Link role="menuitem" to="/cv" className="menu-item"><FileText size={17} />CV builder</Link>
                  <Link role="menuitem" to="/essays" className="menu-item"><PenLine size={17} />Essays & statements</Link>
                  <Link role="menuitem" to="/learn" className="menu-item show-sm"><GraduationCap size={17} />Course Intelligence</Link>
                  <Link role="menuitem" to="/profile#settings" className="menu-item"><Settings size={17} />Settings & account</Link>
                  <button role="menuitem" className="menu-item" onClick={async () => { await signout(); navigate('/', { replace: true }); }}><LogOut size={17} />Sign out</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {sync === 'error' && <div className="sync-bar" role="status"><CloudOff size={15} />We couldn’t save your latest changes to your account. They’re kept on this device and will save when the connection is back.</div>}
      <main id="main" key={loc.pathname} tabIndex={-1}>
        <Outlet context={{ openSearch: () => setSearchOpen(true), name: firstName(state.profile) }} />
      </main>

      <nav className="bottomnav" aria-label="Primary">
        {NAV.slice(0, 5).map((n) => (
          <NavLink key={n.to} to={n.to} className={({ isActive }) => `bn-item ${isActive ? 'active' : ''}`}>
            <n.icon size={22} strokeWidth={1.8} /><span>{n.to === '/opportunities' ? 'Discover' : n.to === '/applications' ? 'Apply' : n.label}</span>
          </NavLink>
        ))}
      </nav>

      <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}

export function MiniHeader({ right }) {
  const navigate = useNavigate();
  return (
    <header className="topbar plain">
      <div className="container topbar-inner">
        <Link to="/" className="brand" aria-label="Horizon"><Logo /></Link>
        {right ?? <button className="btn ghost sm" onClick={() => navigate('/')}><X size={18} />Close</button>}
      </div>
    </header>
  );
}
