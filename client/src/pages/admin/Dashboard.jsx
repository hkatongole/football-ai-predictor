import { useQuery } from 'react-query';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend,
} from 'chart.js';
import api from '../../services/api.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

export default function Dashboard() {
  const { data } = useQuery('admin-stats', () => api.get('/admin/dashboard/stats').then((r) => r.data));
  const stats = data?.data || {};

  const cards = [
    ['Total Users', stats.totalUsers],
    ['Total Matches', stats.totalMatches],
    ['Total Predictions', stats.totalPredictions],
    ['Active Subscriptions', stats.activeSubscriptions],
    ['Revenue (USD)', stats.totalRevenue],
  ];

  const chartData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [{
      label: 'Prediction Accuracy %',
      data: [64, 66, 65, 68, 70, 69, 71],
      borderColor: '#10b981',
      backgroundColor: 'rgba(16,185,129,0.2)',
      tension: 0.4,
    }],
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold">Admin Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {cards.map(([label, value]) => (
          <div key={label} className="glass-card p-4">
            <p className="text-xs text-white/50">{label}</p>
            <p className="text-2xl font-bold">{value ?? '—'}</p>
          </div>
        ))}
      </div>
      <div className="glass-card p-4">
        <h2 className="text-sm font-semibold mb-3">Prediction Accuracy (7 days)</h2>
        <Line data={chartData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
      </div>
    </div>
  );
}
