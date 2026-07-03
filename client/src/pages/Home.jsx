import { useQuery } from 'react-query';
import api from '../services/bridgeApi.js';
import MatchCard from '../components/MatchCard.jsx';

export default function Home() {
  const { data: liveData, isLoading: liveLoading } = useQuery('live-matches', () =>
    api.get('/matches/live').then((r) => r.data));
  const { data: todayData, isLoading: todayLoading } = useQuery('today-predictions', () =>
    api.get('/predictions/today').then((r) => r.data));

  return (
    <div className="flex flex-col gap-8">
      <section className="glass-card p-6 text-center">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">AI-Powered Football Predictions</h1>
        <p className="text-white/60 text-sm">Statistical, Machine Learning & Hybrid AI models — updated live.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">🔴 Live Matches</h2>
        {liveLoading && <SkeletonGrid />}
        {!liveLoading && (!liveData?.data?.length ? (
          <EmptyState text="No live matches right now." />
        ) : (
          <Grid>{liveData.data.map((m) => <MatchCard key={m.id} match={m} />)}</Grid>
        ))}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">📅 Today's Matches</h2>
        {todayLoading && <SkeletonGrid />}
        {!todayLoading && (!todayData?.data?.length ? (
          <EmptyState text="No matches scheduled today." />
        ) : (
          <Grid>{todayData.data.map((m) => <MatchCard key={m.id} match={m} />)}</Grid>
        ))}
      </section>
    </div>
  );
}

function Grid({ children }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{children}</div>;
}
function EmptyState({ text }) {
  return <div className="glass-card p-6 text-center text-white/50 text-sm">{text}</div>;
}
function SkeletonGrid() {
  return (
    <Grid>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="glass-card p-4 h-36 animate-pulse bg-white/5" />
      ))}
    </Grid>
  );
}
