import { useQuery } from 'react-query';
import api from '../../services/api.js';

export default function Logs() {
  const { data: activity } = useQuery('admin-activity-logs', () => api.get('/admin/logs/activity').then((r) => r.data));
  const { data: apiLogs } = useQuery('admin-api-logs', () => api.get('/admin/logs/api').then((r) => r.data));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold">Logs</h1>

      <section className="glass-card p-4">
        <h2 className="text-sm font-semibold mb-3">Activity Log</h2>
        <LogTable rows={activity?.data} columns={['action', 'userId', 'createdAt']} />
      </section>

      <section className="glass-card p-4">
        <h2 className="text-sm font-semibold mb-3">API Log</h2>
        <LogTable rows={apiLogs?.data} columns={['endpoint', 'method', 'statusCode', 'durationMs', 'createdAt']} />
      </section>
    </div>
  );
}

function LogTable({ rows, columns }) {
  if (!rows) return <p className="text-xs text-white/50">Loading...</p>;
  if (!rows.length) return <p className="text-xs text-white/50">No entries yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-white/50 border-b border-white/10">
            {columns.map((c) => <th key={c} className="px-3 py-2 capitalize">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-white/5">
              {columns.map((c) => (
                <td key={c} className="px-3 py-2">
                  {c === 'createdAt' ? new Date(r[c]).toLocaleString() : String(r[c] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
