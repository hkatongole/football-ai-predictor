import { useEffect, useState } from 'react';

/**
 * Listens for the browser's `beforeinstallprompt` event (Android/Chrome)
 * and shows a custom "Install App" banner instead of relying on the
 * default browser UI, matching a native-app feel.
 */
export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!visible) return null;

  const install = async () => {
    setVisible(false);
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  return (
    <div className="fixed bottom-20 md:bottom-4 inset-x-4 z-50 glass-card p-4 flex items-center justify-between">
      <div>
        <p className="font-semibold text-sm">Install Football AI Predictor</p>
        <p className="text-xs text-white/60">Get the app experience — offline access & push alerts.</p>
      </div>
      <div className="flex gap-2">
        <button onClick={() => setVisible(false)} className="text-xs text-white/60 px-2">Later</button>
        <button onClick={install} className="btn-primary text-xs">Install</button>
      </div>
    </div>
  );
}
