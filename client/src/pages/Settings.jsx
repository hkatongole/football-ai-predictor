import { useState, useEffect } from 'react';
import { usePushNotifications } from '../hooks/usePushNotifications.js';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function Settings() {
  const { user } = useAuth();
  const { supported, permission, subscribed, loading, error, subscribe, unsubscribe } = usePushNotifications();
  const [dark, setDark] = useState(() => localStorage.getItem('theme') !== 'light');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <h1 className="text-xl font-bold">Settings</h1>

      {user && (
        <section className="glass-card p-4">
          <h2 className="text-sm font-semibold mb-2">Profile</h2>
          <p className="text-sm text-white/70">{user.fullName || user.username}</p>
          <p className="text-xs text-white/50">{user.email}</p>
          {user.isPremium && <span className="confidence-pill bg-primary-600/20 text-primary-400 mt-2 inline-block">⭐ Premium</span>}
        </section>
      )}

      <section className="glass-card p-4">
        <h2 className="text-sm font-semibold mb-2">Push Notifications</h2>
        <p className="text-xs text-white/50 mb-3">
          Get alerts for match start, goals, prediction updates, finished matches, and premium tips.
        </p>
        {!supported ? (
          <p className="text-xs text-amber-400">Not supported in this browser.</p>
        ) : (
          <button
            onClick={subscribed ? unsubscribe : subscribe}
            disabled={loading}
            className="btn-primary text-sm disabled:opacity-50"
          >
            {loading ? 'Working...' : subscribed ? 'Disable Notifications' : 'Enable Notifications'}
          </button>
        )}
        {permission === 'denied' && (
          <p className="text-xs text-red-400 mt-2">Notifications are blocked in your browser settings.</p>
        )}
        {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
      </section>

      <section className="glass-card p-4">
        <h2 className="text-sm font-semibold mb-2">Appearance</h2>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={dark} onChange={(e) => setDark(e.target.checked)} />
          Dark mode
        </label>
      </section>
    </div>
  );
}
