import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', username: '', password: '', fullName: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      const res = await register(form);
      setSuccess(res.message);
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="max-w-sm mx-auto glass-card p-6 mt-10">
      <h1 className="text-xl font-bold mb-4">Create account</h1>
      <form onSubmit={submit} className="flex flex-col gap-3">
        {['fullName', 'email', 'username', 'password'].map((field) => (
          <input
            key={field}
            type={field === 'password' ? 'password' : 'text'}
            placeholder={field}
            value={form[field]}
            onChange={(e) => setForm({ ...form, [field]: e.target.value })}
            className="bg-white/5 rounded-lg px-3 py-2 outline-none text-sm"
          />
        ))}
        {error && <p className="text-red-400 text-xs">{error}</p>}
        {success && <p className="text-primary-400 text-xs">{success}</p>}
        <button type="submit" className="btn-primary mt-2">Register</button>
      </form>
      <p className="text-xs text-white/50 mt-4">
        Already have an account? <Link to="/login" className="text-primary-400">Login</Link>
      </p>
    </div>
  );
}
