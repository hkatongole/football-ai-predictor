import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function MatchCard({ match }) {
  const isLive = match.status === 'LIVE';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.015 }}
      className="glass-card p-4 flex flex-col gap-3"
    >
      <div className="flex items-center justify-between text-xs text-white/50">
        <span>{match.league?.name}</span>
        {isLive ? (
          <span className="flex items-center gap-1 text-red-400 font-semibold">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> LIVE {match.minute}'
          </span>
        ) : (
          <span>{new Date(match.kickoff).toLocaleString()}</span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <TeamRow name={match.homeTeam?.name} logo={match.homeTeam?.logoUrl} score={match.homeScore} />
      </div>
      <div className="flex items-center justify-between">
        <TeamRow name={match.awayTeam?.name} logo={match.awayTeam?.logoUrl} score={match.awayScore} />
      </div>

      <Link to={`/matches/${match.id}`} className="btn-primary text-center text-sm mt-1">
        View Prediction
      </Link>
    </motion.div>
  );
}

function TeamRow({ name, logo, score }) {
  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-2">
        {logo ? <img src={logo} alt={name} className="w-6 h-6 rounded-full" /> : <div className="w-6 h-6 rounded-full bg-white/10" />}
        <span className="text-sm font-medium">{name}</span>
      </div>
      <span className="font-bold">{score ?? '-'}</span>
    </div>
  );
}
