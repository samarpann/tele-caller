'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User, Key, Eye, EyeOff, ShieldCheck, PhoneCall, Sparkles, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e?: React.FormEvent, customUser?: string, customPass?: string) => {
    if (e) e.preventDefault();
    setError('');

    const u = customUser || username;
    const p = customPass || password;

    if (!u.trim() || !p.trim()) {
      setError('Please enter your Username / User ID and Password');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u.trim(), password: p.trim() })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Invalid credentials');
        setLoading(false);
        return;
      }

      // Successful login
      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError('Connection error. Please check your network and try again.');
      setLoading(false);
    }
  };

  const quickFill = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    handleLogin(undefined, u, p);
  };

  return (
    <div className="min-h-screen bg-[#070b13] flex flex-col justify-center items-center p-4 selection:bg-sky-500 selection:text-white">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-tr from-sky-600/15 via-indigo-600/10 to-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* App Logo & Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-emerald-400 p-0.5 shadow-xl shadow-sky-500/20">
            <div className="w-full h-full bg-[#0b1120] rounded-[14px] flex items-center justify-center text-2xl font-black">
              ⚡
            </div>
          </div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">
            Swastik Telecaller Pro
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Super Admin Lead Distribution & Multi-Caller Dialing Platform
          </p>
        </div>

        {/* Login Box */}
        <div className="bg-[#0f172a]/90 backdrop-blur-xl border border-slate-800/90 rounded-2xl p-6 shadow-2xl shadow-black/80 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Username / User ID */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-sky-400" />
                <span>User ID / Username</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. admin or sales1"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#080d1a] border border-slate-700/80 rounded-xl px-3.5 py-3 text-xs md:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-emerald-400" />
                <span>Password</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#080d1a] border border-slate-700/80 rounded-xl pl-3.5 pr-10 py-3 text-xs md:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-sky-500 via-indigo-600 to-emerald-500 hover:from-sky-400 hover:to-emerald-400 font-bold text-sm text-white shadow-lg shadow-sky-500/25 active:scale-[0.98] transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Sign In to Dashboard</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo 1-Click Login Chips */}
          <div className="pt-2 border-t border-slate-800/80 space-y-2.5">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" /> Quick 1-Click Test Login
              </span>
              <span className="text-[9px] text-slate-500">Tap to auto-fill & login</span>
            </div>

            <div className="space-y-1.5">
              {/* Super Admin */}
              <button
                type="button"
                onClick={() => quickFill('admin', 'admin123')}
                className="w-full p-2.5 rounded-xl bg-sky-950/40 hover:bg-sky-900/60 border border-sky-500/30 text-left flex items-center justify-between transition group"
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-sky-400" />
                  <div>
                    <div className="text-xs font-bold text-sky-200 group-hover:text-white">
                      👑 Super Admin (Full Control)
                    </div>
                    <div className="text-[10px] text-slate-400">ID: admin • Pass: admin123</div>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-sky-400 group-hover:translate-x-0.5 transition">
                  Login ➔
                </span>
              </button>

              {/* 5 Sales Callers */}
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => quickFill('sales1', 'sales123')}
                  className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-left transition"
                >
                  <div className="text-[11px] font-bold text-emerald-300">📞 Sales 1: Priya</div>
                  <div className="text-[9px] text-slate-500">ID: sales1 • Pass: sales123</div>
                </button>

                <button
                  type="button"
                  onClick={() => quickFill('sales2', 'sales123')}
                  className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-left transition"
                >
                  <div className="text-[11px] font-bold text-emerald-300">📞 Sales 2: Rahul</div>
                  <div className="text-[9px] text-slate-500">ID: sales2 • Pass: sales123</div>
                </button>

                <button
                  type="button"
                  onClick={() => quickFill('sales3', 'sales123')}
                  className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-left transition"
                >
                  <div className="text-[11px] font-bold text-emerald-300">📞 Sales 3: Neha</div>
                  <div className="text-[9px] text-slate-500">ID: sales3 • Pass: sales123</div>
                </button>

                <button
                  type="button"
                  onClick={() => quickFill('sales4', 'sales123')}
                  className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-left transition"
                >
                  <div className="text-[11px] font-bold text-emerald-300">📞 Sales 4: Amit</div>
                  <div className="text-[9px] text-slate-500">ID: sales4 • Pass: sales123</div>
                </button>
              </div>

              <button
                type="button"
                onClick={() => quickFill('sales5', 'sales123')}
                className="w-full p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-left flex items-center justify-between transition"
              >
                <div>
                  <div className="text-[11px] font-bold text-emerald-300">📞 Sales 5: Pooja Patel</div>
                  <div className="text-[9px] text-slate-500">ID: sales5 • Pass: sales123</div>
                </div>
                <span className="text-[10px] text-slate-400">Login ➔</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-[11px] text-slate-500">
          Super Admin can create additional sales users with custom ID & passwords anytime from the dashboard.
        </p>
      </div>
    </div>
  );
}
