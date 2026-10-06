import { NavLink, Outlet } from 'react-router-dom';
import { tr } from '../i18n/tr';

const items = [
  { to: '/', label: tr.nav.home, icon: '🏠' },
  { to: '/timer', label: tr.nav.timer, icon: '🏴‍☠️' },
  { to: '/play', label: tr.nav.play, icon: '🎮' },
  { to: '/stats', label: tr.nav.stats, icon: '📈' },
  { to: '/settings', label: tr.nav.settings, icon: '⚙️' },
];

export function Layout() {
  return (
    <div className="app">
      <Outlet />
      <nav className="bottom-nav" aria-label="Ana menü">
        {items.map((it) => (
          <NavLink key={it.to} to={it.to} end={it.to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
            <span className="nav-icon" aria-hidden>
              {it.icon}
            </span>
            {it.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
