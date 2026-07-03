import { useState } from 'react';
import { useQuery } from 'react-query';
import api from '../services/bridgeApi.js';
import MatchCard from '../components/MatchCard.jsx';

export default function Matches() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery(['matches', q, page], () =>
    api.get('/matches', { params: { q, page, pageSize: 12 } }).then((r) => r.data));

  return (
    <div className="flex flex-col gap-4">
      <input
        value={q}
        onChange={(e) => { setQ(e.target.value); setPage(1); }}
        placeholder="Search team, league, or match..."
        className="glass-card px-4 py-3 bg-transparent outline-none text-sm placeholder-white/40"
      />

      {isLoading ? (
        <p className="text-white/50 text-sm">Loading matches...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.data?.map((m) => <MatchCard key={m.id} match={m} />)}
        </div>
      )}

      <div className="flex justify-center gap-3 mt-2">
        <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="btn-primary disabled:opacity-30 text-xs">Prev</button>
        <span className="text-xs text-white/50 self-center">Page {page}</span>
        <button onClick={() => setPage((p) => p + 1)} className="btn-primary text-xs">Next</button>
      </div>
    </div>
  );
}
