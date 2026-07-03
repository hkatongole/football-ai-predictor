import { useParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import api from '../services/bridgeApi.js';
import ConfidenceBadge from '../components/ConfidenceBadge.jsx';

export default function MatchDetail() {
  const { id } = useParams();
  const { data, isLoading } = useQuery(['prediction', id], () =>
    api.get(`/predictions/${id}`).then((r) => r.data));

  if (isLoading) return <p className="text-white/50">Loading prediction...</p>;
  if (!data) return <p className="text-white/50">Prediction unavailable.</p>;

  const { match, statistical, machineLearning, hybrid } = data.data;

  return (
    <div className="flex flex-col gap-6">
      <div className="glass-card p-5">
        <p className="text-xs text-white/50">{match.league}</p>
        <h1 className="text-xl font-bold">{match.homeTeam} vs {match.awayTeam}</h1>
        <p className="text-xs text-white/50">{new Date(match.kickoff).toLocaleString()} · {match.status}</p>
      </div>

      <EngineCard title="📈 Statistical Prediction Engine" result={statistical} />
      <EngineCard title="🤖 Machine Learning Engine" result={machineLearning} extra={
        <p className="text-xs text-white/50 mt-1">Model accuracy: {machineLearning.modelAccuracy}%</p>
      } />

      {hybrid.locked ? (
        <div className="glass-card p-5 text-center">
          <h3 className="font-semibold mb-1">🧠 AI Hybrid Prediction Engine</h3>
          <p className="text-sm text-white/60 mb-3">{hybrid.message}</p>
          <WinProbBars data={hybrid} />
          <button className="btn-primary mt-3 text-sm">Upgrade to Premium</button>
        </div>
      ) : (
        <div className="glass-card p-5">
          <h3 className="font-semibold mb-2">🧠 AI Hybrid Prediction Engine</h3>
          <WinProbBars data={hybrid} />
          <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
            <Stat label="Correct Score" value={`${hybrid.correctScore.home} - ${hybrid.correctScore.away}`} />
            <Stat label="Risk Rating" value={hybrid.riskRating} />
            <Stat label="Recommended Bet" value={hybrid.recommendedBet} />
            <Stat label="Expected Goals" value={`${hybrid.expectedGoals.home} / ${hybrid.expectedGoals.away}`} />
          </div>
          <p className="text-xs text-white/50 mt-4 leading-relaxed">{hybrid.reasoning}</p>
          <div className="mt-3"><ConfidenceBadge confidence={hybrid.confidence} /></div>
        </div>
      )}
    </div>
  );
}

function EngineCard({ title, result, extra }) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">{title}</h3>
        <ConfidenceBadge confidence={result.confidence} />
      </div>
      <WinProbBars data={result} />
      {extra}
    </div>
  );
}

function WinProbBars({ data }) {
  const items = [
    ['Home Win', data.homeWinProb],
    ['Draw', data.drawProb],
    ['Away Win', data.awayWinProb],
  ];
  return (
    <div className="flex flex-col gap-2">
      {items.map(([label, prob]) => (
        <div key={label}>
          <div className="flex justify-between text-xs text-white/60 mb-1">
            <span>{label}</span><span>{(prob * 100).toFixed(1)}%</span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-primary-500" style={{ width: `${prob * 100}%` }} />
          </div>
        </div>
      ))}
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
