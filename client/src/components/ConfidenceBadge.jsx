export default function ConfidenceBadge({ confidence }) {
  const color =
    confidence >= 70 ? 'bg-primary-600/20 text-primary-400' :
    confidence >= 50 ? 'bg-amber-500/20 text-amber-400' :
    'bg-red-500/20 text-red-400';

  return <span className={`confidence-pill ${color}`}>{confidence}% confidence</span>;
}
