import { NavLink, Outlet } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/categories', label: 'Categories' },
  { to: '/references', label: 'References' },
  { to: '/flips', label: 'Flips / P&L' },
];

export function Layout() {
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="dot" />
          DEAL RADAR
        </div>
        <nav>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="grow" />
        <div className="muted mono" style={{ fontSize: 10, textTransform: 'uppercase' }}>
          v1.0 · SQLite
        </div>
      </aside>

      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
