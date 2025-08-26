'use client';

import { useState } from 'react';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { app } from '@/firebase'; // см. шаг 2: правильная инициализация клиента

export default function AdminLoginClient() {
  const [email, setEmail]   = useState('');
  const [pass, setPass]     = useState('');
  const [loading, setLoad]  = useState(false);
  const [error, setError]   = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoad(true); setError('');
    try {
      const auth = getAuth(app);
      await signInWithEmailAndPassword(auth, email, pass);
      window.location.href = '/tournaments/admin';
    } catch (err) {
      setError(err?.message || 'Login failed');
    } finally {
      setLoad(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Admin Login</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          type="email"
          className="w-full border p-2 rounded"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="username"
        />
        <input
          type="password"
          className="w-full border p-2 rounded"
          placeholder="Password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          required
          autoComplete="current-password"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white rounded py-2"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
        {error && <div className="text-red-600 text-sm">{error}</div>}
      </form>
    </div>
  );
}
