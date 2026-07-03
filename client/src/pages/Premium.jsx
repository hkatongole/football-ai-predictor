import { useState } from 'react';
import { useQuery } from 'react-query';
import api from '../services/api.js';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function Premium() {
  const { user } = useAuth();
  const [error, setError] = useState('');
  const [loadingPlanId, setLoadingPlanId] = useState(null);

  const { data, isLoading } = useQuery('subscription-plans', () => api.get('/subscriptions/plans').then((r) => r.data));

  const upgrade = async (planId) => {
    setError('');
    setLoadingPlanId(planId);
    try {
      const { data } = await api.post('/subscriptions/checkout', { planId });
      window.location.href = data.checkoutUrl;
    } catch (err) {
      setError(err.response?.data?.message || 'Could not start checkout.');
    } finally {
      setLoadingPlanId(null);
    }
  };

  if (user?.isPremium) {
    return (
      <div className="glass-card p-6 max-w-md mx-auto text-center mt-10">
        <p className="text-2xl mb-2">⭐</p>
        <h1 className="font-bold text-lg mb-1">You're on Premium</h1>
        <p className="text-sm text-white/60">Enjoy full AI Hybrid predictions, an ad-free experience, and advanced statistics.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 max-w-md mx-auto mt-6">
      <h1 className="text-xl font-bold text-center">Go Premium</h1>
      <p className="text-sm text-white/60 text-center">
        Unlock full AI Hybrid predictions (correct score, risk rating, reasoning), an ad-free experience, and advanced statistics.
      </p>

      {!data?.stripeConfigured && (
        <div className="glass-card p-4 text-xs text-amber-400 text-center">
          Payments aren't configured yet — set STRIPE_SECRET_KEY in the backend and a Stripe Price ID per plan to enable checkout.
        </div>
      )}

      {isLoading ? (
        <p className="text-center text-sm text-white/50">Loading plans...</p>
      ) : (
        data?.data?.map((plan) => (
          <div key={plan.id} className="glass-card p-5 flex items-center justify-between">
            <div>
              <p className="font-semibold">{plan.name}</p>
              <p className="text-sm text-white/60">${plan.priceMonthly}/mo{plan.priceYearly ? ` · $${plan.priceYearly}/yr` : ''}</p>
            </div>
            {plan.priceMonthly > 0 && (
              <button
                onClick={() => upgrade(plan.id)}
                disabled={!data.stripeConfigured || loadingPlanId === plan.id}
                className="btn-primary text-sm disabled:opacity-40"
              >
                {loadingPlanId === plan.id ? 'Redirecting...' : 'Upgrade'}
              </button>
            )}
          </div>
        ))
      )}

      {error && <p className="text-red-400 text-xs text-center">{error}</p>}
    </div>
  );
}
