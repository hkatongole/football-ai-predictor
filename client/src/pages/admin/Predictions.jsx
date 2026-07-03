import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Link } from 'react-router-dom';
import api from '../../services/api.js';

/**
 * Note: since the PlusOne integration, match predictions are sourced from the
 * PlusOne bridge (Dixon-Coles / ML / Legacy / Consensus engines), not these
 * database-registered models. This screen manages the original
 * football-ai-predictor engine registry (kept for leagues PlusOne hasn't
 * scraped yet, or as a documented fallback). For live PlusOne model accuracy,
 * see System Health.
 */
export default function Predictions() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery('admin-prediction-models', () => api.get('/admin/prediction-models').then((r) => r.data));

  const toggle = useMutation(
    ({ id, isActive }) => api.patch(`/admin/prediction-models/${id}`, { isActive }),
    { onSuccess: () => queryClient.invalidateQueries('admin-prediction-models') }
  );

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Prediction Models</h1>
      <div className="glass-card p-4 text-sm text-white/60">
        Live match predictions are now sourced from the <strong>PlusOne bridge</strong> (Dixon-Coles, ML,
        Legacy, and Consensus engines). The models below are football-ai-predictor's original built-in
        fallback engines. Real-time accuracy for PlusOne's engines is on{' '}
        <Link to="/admin/system" className="text-primary-400">System Health</Link>.
      </div>

      <div className="glass-card overflow-x-auto">
        {isLoading ? (
          <p className="p-6 text-sm text-white/50">Loading...</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-white/50 border-b border-white/10">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Engine Type</th>
                <th className="px-4 py-3">Version</th>
                <th className="px-4 py-3">Accuracy</th>
                <th className="px-4 py-3">Active</th>
              </tr>
            </thead>
            <tbody>
              {data?.data?.map((m) => (
                <tr key={m.id} className="border-b border-white/5">
                  <td className="px-4 py-3">{m.name}</td>
                  <td className="px-4 py-3">{m.engineType}</td>
                  <td className="px-4 py-3">{m.version}</td>
                  <td className="px-4 py-3">{m.accuracy ? `${m.accuracy}%` : '—'}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggle.mutate({ id: m.id, isActive: !m.isActive })}
                      className={`text-xs px-2 py-1 rounded-full ${m.isActive ? 'bg-primary-600/20 text-primary-400' : 'bg-white/10 text-white/50'}`}
                    >
                      {m.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
