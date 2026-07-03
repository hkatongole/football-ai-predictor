import { Outlet, NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Home', icon: '🏠' },
  { to: '/matches', label: 'Matches', icon: '⚽' },
  { to: '/premium', label: 'Premium', icon: '⭐' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
  { to: '/login', label: 'Account', icon: '👤' },
];

export default function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-pitch-900">
      <header className="sticky top-0 z-40 glass-card mx-3 mt-3 px-4 py-3 flex items-center justify-between">
        <span className="font-bold text-lg tracking-tight">⚽ Football<span className="text-primary-500">AI</span></span>
        <nav className="hidden md:flex gap-6 text-sm text-white/80">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => isActive ? 'text-primary-500 font-semibold' : ''}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="flex-1 px-3 pb-24 md:pb-6 pt-4 max-w-6xl w-full mx-auto">
        <Outlet />
      </main>

      {/* Mobile bottom navigation — native-app feel */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 glass-card m-2 flex justify-around py-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center text-xs gap-1 ${isActive ? 'text-primary-500' : 'text-white/60'}`
            }
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
