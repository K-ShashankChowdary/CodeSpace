import React, { useState } from 'react';
import axios from 'axios';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);         // toggles between login and register
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const endpoint = isLogin ? '/api/v1/users/login' : '/api/v1/users/register';
      const payload = isLogin ? { email: formData.email, password: formData.password } : formData;

      await axios.post(`http://localhost:5000${endpoint}`, payload);

      if (isLogin) {
        window.location.href = '/'; // hard reload to trigger fresh auth check in App.jsx
      } else {
        setIsLogin(true); // switch to login after successful registration
        setFormData({ username: '', email: '', password: '' });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0a0a0a] flex items-center justify-center text-gray-200 font-sans p-4">
      <div className="bg-[#121212] p-8 rounded-xl border border-[#2a2a2a] w-full max-w-md shadow-2xl transition-all duration-300">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">CodeSpace</h1>
          <h2 className="text-sm font-medium text-gray-400">
            {isLogin ? 'Welcome back. Log in to continue.' : 'Create your account to get started.'}
          </h2>
        </div>
        
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg mb-6 text-sm font-medium text-center">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {!isLogin && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Username</label>
              <input type="text" name="username" placeholder="johndoe" value={formData.username} onChange={handleChange} className="bg-[#0a0a0a] border border-[#2a2a2a] p-3 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" required={!isLogin} />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Email Address</label>
            <input type="email" name="email" placeholder="you@example.com" value={formData.email} onChange={handleChange} className="bg-[#0a0a0a] border border-[#2a2a2a] p-3 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Password</label>
            <input type="password" name="password" placeholder="••••••••" value={formData.password} onChange={handleChange} className="bg-[#0a0a0a] border border-[#2a2a2a] p-3 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" required />
          </div>
          <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg mt-4 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-900/20">
            {isLoading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-gray-400">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button type="button" className="text-blue-500 font-semibold hover:text-blue-400 transition-colors focus:outline-none" onClick={() => { setIsLogin(!isLogin); setError(''); }}>
            {isLogin ? 'Sign up' : 'Log in'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;