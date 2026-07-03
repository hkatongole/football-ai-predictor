import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="p-8 text-center text-white/50 text-sm">Checking session...</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (roles && !roles.includes(user.role)) {
    return (
      <div className="glass-card p-6 m-4 text-center">
        <p className="font-semibold mb-1">Access denied</p>
        <p className="text-sm text-white/60">You don't have permission to view this page.</p>
      </div>
    );
  }
  return children;
}
