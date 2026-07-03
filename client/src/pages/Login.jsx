import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ emailOrUsername: '', password: '' });
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(form.emailOrUsername, form.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="max-w-sm mx-auto glass-card p-6 mt-10">
      <h1 className="text-xl font-bold mb-4">Sign in</h1>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <input
          placeholder="Email or username"
          value={form.emailOrUsername}
          onChange={(e) => setForm({ ...form, emailOrUsername: e.target.value })}
          className="bg-white/5 rounded-lg px-3 py-2 outline-none text-sm"
        />
        <input
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="bg-white/5 rounded-lg px-3 py-2 outline-none text-sm"
        />
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <button type="submit" className="btn-primary mt-2">Login</button>
      </form>
      <p className="text-xs text-white/50 mt-4">
        No account? <Link to="/register" className="text-primary-400">Register</Link>
      </p>
    </div>
  );
}
