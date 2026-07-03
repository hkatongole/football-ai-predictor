import { useQuery } from 'react-query';
import api from '../../services/api.js';
import bridgeApi from '../../services/bridgeApi.js';

export default function SystemHealth() {
  const { data: health } = useQuery('admin-system-health', () => api.get('/admin/system/health').then((r) => r.data), { refetchInterval: 15000 });
  const { data: accuracy } = useQuery('admin-model-accuracy', () => bridgeApi.get('/stats/model-accuracy').then((r) => r.data));
  const { data: bridgeHealth } = useQuery('admin-bridge-health', () => bridgeApi.get('/health').then((r) => r.data), { retry: false });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold">System Health</h1>

      <section className="glass-card p-4">
        <h2 className="text-sm font-semibold mb-3">Main Backend</h2>
        {health ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <Stat label="Uptime" value={`${Math.floor(health.data.uptimeSeconds / 60)} min`} />
            <Stat label="Node Version" value={health.data.nodeVersion} />
            <Stat label="Heap Used" value={`${(health.data.memoryUsage.heapUsed / 1024 / 1024).toFixed(1)} MB`} />
            <Stat label="RSS" value={`${(health.data.memoryUsage.rss / 1024 / 1024).toFixed(1)} MB`} />
          </div>
        ) : <p className="text-xs text-white/50">Loading...</p>}
      </section>

      <section className="glass-card p-4">
        <h2 className="text-sm font-semibold mb-3">PlusOne Bridge</h2>
        {bridgeHealth ? (
          <p className="text-sm text-primary-400">● Online — {bridgeHealth.service}</p>
        ) : (
          <p className="text-sm text-red-400">● Unreachable — check the bridge service is running (port 5050)</p>
        )}
      </section>

      <section className="glass-card p-4">
        <h2 className="text-sm font-semibold mb-3">PlusOne Prediction Model Accuracy</h2>
        {accuracy ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <Stat label="Graded Predictions" value={accuracy.data.gradedPredictions} />
            <Stat label="Dixon-Coles" value={`${accuracy.data.dixonColesAccuracy}%`} />
            <Stat label="ML Engine" value={`${accuracy.data.mlAccuracy}%`} />
            <Stat label="Legacy Engine" value={`${accuracy.data.legacyAccuracy}%`} />
            <Stat label="Consensus" value={`${accuracy.data.consensusAccuracy}%`} />
          </div>
        ) : <p className="text-xs text-white/50">Loading...</p>}
      </section>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-white/5 rounded-xl p-3">
      <p className="text-[10px] text-white/50 uppercase tracking-wide">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}
