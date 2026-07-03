import { Outlet, NavLink } from 'react-router-dom';

const links = [
  ['Dashboard', '/admin'],
  ['Users', '/admin/users'],
  ['Leagues', '/admin/leagues'],
  ['Fixtures', '/admin/fixtures'],
  ['Predictions', '/admin/predictions'],
  ['Subscriptions', '/admin/subscriptions'],
  ['News & Blogs', '/admin/news'],
  ['Ads', '/admin/ads'],
  ['API Keys', '/admin/api-keys'],
  ['Logs', '/admin/logs'],
  ['System Health', '/admin/system'],
];

export default function AdminLayout() {
  return (
    <div className="min-h-screen flex bg-pitch-900">
      <aside className="w-64 hidden md:block glass-card m-3 p-4">
        <h2 className="font-bold text-lg mb-6">Admin Panel</h2>
        <nav className="flex flex-col gap-1 text-sm">
          {links.map(([label, to]) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/admin'}
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg ${isActive ? 'bg-primary-600/20 text-primary-400' : 'text-white/70 hover:bg-white/5'}`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-4">
        <Outlet />
      </main>
    </div>
  );
}
