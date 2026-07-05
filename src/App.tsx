/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { LayoutDashboard, Award, Trophy, BookOpen, Clock, Settings, LogOut, Menu, User, ShieldCheck, ShieldAlert, Zap, Key } from 'lucide-react';
import DashboardView from './components/DashboardView';
import PracticeView from './components/PracticeView';
import HistoryView from './components/HistoryView';
import LeaderboardView from './components/LeaderboardView';
import LearningView from './components/LearningView';
import AdminView from './components/AdminView';

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Authentication forms states
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Administrative credentials bypass form states
  const [showAdminBypassForm, setShowAdminBypassForm] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // Dashboard stats state
  const [stats, setStats] = useState<any>(null);
  const [isStatsLoading, setIsStatsLoading] = useState(true);

  // Load active authenticated session
  const checkAuthSession = () => {
    fetch('/api/auth/me')
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error();
      })
      .then((data) => {
        if (data) {
          setUser(data);
          loadDashboardStats();
        } else {
          setUser(null);
        }
      })
      .catch(() => {
        setUser(null);
      });
  };

  const loadDashboardStats = () => {
    setIsStatsLoading(true);
    fetch('/api/dashboard/stats')
      .then((res) => res.json())
      .then((data) => {
        setStats(data);
        setIsStatsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setIsStatsLoading(false);
      });
  };

  useEffect(() => {
    checkAuthSession();
  }, []);

  // Handle forms
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data);
        loadDashboardStats();
      } else {
        setAuthError(data.error || 'Invalid credentials.');
      }
    } catch (err) {
      setAuthError('Error communicating with backend.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data);
        loadDashboardStats();
      } else {
        setAuthError(data.error || 'Registration failed.');
      }
    } catch (err) {
      setAuthError('Error communicating with backend.');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setActiveTab('dashboard');
  };

  const handleAdminBypass = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAuthError('');

    if (!adminUsername.trim() || !adminEmail.trim() || !adminPassword.trim()) {
      setAuthError('All administrator credentials are required.');
      return;
    }

    try {
      const res = await fetch('/api/auth/admin-bypass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: adminUsername.trim(),
          email: adminEmail.trim(),
          password: adminPassword
        })
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data);
        setActiveTab('admin'); // Redirect straight to admin page in our dashboard!
        loadDashboardStats();
      } else {
        setAuthError(data.error || 'Failed to initialize administrative bypass.');
      }
    } catch (err) {
      setAuthError('Error communicating with administrative bypass endpoint.');
    }
  };

  // If user is unauthenticated, render the modern custom authentication form
  if (!user) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] flex flex-col justify-center items-center lg:py-12 px-4 relative overflow-hidden font-sans">
        {/* Decorative background gradients */}
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-3xl -z-10"></div>
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-3xl -z-10"></div>

        {/* Outer Split Container */}
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-white/40 backdrop-blur-md rounded-[32px] p-6 lg:p-10 border border-slate-200 shadow-2xl relative z-10">
          
          {/* Left Panel: Magnificent Unique Product Landing Page & Features */}
          <div className="lg:col-span-7 space-y-6 lg:pr-6">
            <div>
              <span className="px-3.5 py-1 text-[10px] font-extrabold font-mono tracking-widest uppercase text-blue-700 bg-blue-50 border border-blue-200 rounded-full inline-block mb-3">
                Elite Placement Portal • Powered by Gemini
              </span>
              <h1 className="text-3xl lg:text-5xl font-black text-[#0B1E3F] tracking-tight leading-none font-display">
                Perfect Your Verbal Placements
              </h1>
              <p className="text-sm text-slate-600 mt-3 leading-relaxed font-sans max-w-xl">
                Elevate your soft-skills poise, sentence precision, and technical explanation rate. Work with dual AI interview recruiters precisely grounded in your resume text to secure elite campus placements.
              </p>
            </div>

            {/* Structured Interactive Feature Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 bg-white/70 rounded-2xl border border-slate-200/50 hover:shadow-md transition">
                <span className="text-lg block">🗣️</span>
                <h3 className="text-xs font-bold text-[#0B1E3F] uppercase tracking-wider font-mono mt-1">Dual AI Recruiters</h3>
                <p className="text-[11px] text-slate-500 mt-1 leading-normal">Practice with Sarah (General HR) and Alex (Technical Evaluator) tailored to your tier.</p>
              </div>

              <div className="p-4 bg-white/70 rounded-2xl border border-slate-200/50 hover:shadow-md transition">
                <span className="text-lg block">📝</span>
                <h3 className="text-xs font-bold text-[#0B1E3F] uppercase tracking-wider font-mono mt-1">Resume Grounded</h3>
                <p className="text-[11px] text-slate-500 mt-1 leading-normal">Upload your resume to trigger questions generated strictly from your real projects and tools.</p>
              </div>

              <div className="p-4 bg-white/70 rounded-2xl border border-slate-200/50 hover:shadow-md transition">
                <span className="text-lg block">⏱️</span>
                <h3 className="text-xs font-bold text-[#0B1E3F] uppercase tracking-wider font-mono mt-1">Pacing Analytics</h3>
                <p className="text-[11px] text-slate-500 mt-1 leading-normal">Track your words-per-minute speaking rate against optimal zones to master conversational flow.</p>
              </div>

              <div className="p-4 bg-white/70 rounded-2xl border border-slate-200/50 hover:shadow-md transition">
                <span className="text-lg block">🏆</span>
                <h3 className="text-xs font-bold text-[#0B1E3F] uppercase tracking-wider font-mono mt-1">Elite Achievements</h3>
                <p className="text-[11px] text-slate-500 mt-1 leading-normal">Earn verified badges including the Elite Placement Badge by scoring 60% or higher.</p>
              </div>
            </div>

            {/* Quick Statistics Banner */}
            <div className="border-t border-slate-200/60 pt-5 grid grid-cols-3 gap-4 text-center">
              <div>
                <span className="block text-2xl font-black text-[#0B1E3F] font-display">10,000+</span>
                <span className="text-[9px] font-mono text-slate-400 uppercase font-bold tracking-wider">Interviews Simulated</span>
              </div>
              <div>
                <span className="block text-2xl font-black text-[#0B1E3F] font-display">98.4%</span>
                <span className="text-[9px] font-mono text-slate-400 uppercase font-bold tracking-wider">Placement Rate</span>
              </div>
              <div>
                <span className="block text-2xl font-black text-[#0B1E3F] font-display">95+</span>
                <span className="text-[9px] font-mono text-slate-400 uppercase font-bold tracking-wider">Expert Critiques</span>
              </div>
            </div>
          </div>

          {/* Right Panel: Polished White Authentication Card */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 lg:p-8 shadow-2xl relative">
            {showAdminBypassForm ? (
              <>
                <div className="text-center mb-6">
                  <h2 className="text-xl font-extrabold text-rose-700 tracking-tight font-display flex items-center justify-center gap-1.5">
                    <ShieldCheck className="w-5 h-5 text-rose-600" /> Admin Verification
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Enter secure administrator credentials to gain access
                  </p>
                </div>

                <form onSubmit={handleAdminBypass} className="space-y-4">
                  <div>
                    <label className="text-[9px] font-bold text-[#0B1E3F] uppercase tracking-widest block mb-1 font-mono">
                      Administrator Name
                    </label>
                    <input
                      type="text"
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(e.target.value)}
                      placeholder="e.g. Alex Carter"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#0B1E3F] font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-[#0B1E3F] uppercase tracking-widest block mb-1 font-mono">
                      Admin Email Address
                    </label>
                    <input
                      type="email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="admin@example.com"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#0B1E3F] font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-[#0B1E3F] uppercase tracking-widest block mb-1 font-mono">
                      Admin Secret Password
                    </label>
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#0B1E3F] font-mono"
                      required
                    />
                  </div>

                  {authError && (
                    <p className="text-[10px] font-mono font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-3">
                      {authError}
                    </p>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition duration-150 shadow-lg cursor-pointer flex items-center justify-center gap-2"
                  >
                    <ShieldCheck className="w-4 h-4" /> Verify and Enter
                  </button>
                </form>

                <div className="mt-6 text-center border-t border-slate-100 pt-5">
                  <button
                    onClick={() => {
                      setShowAdminBypassForm(false);
                      setAuthError('');
                    }}
                    className="text-xs text-blue-700 hover:underline font-mono font-bold cursor-pointer block w-full text-center"
                  >
                    Return to Candidate Port
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-center mb-6">
                  <h2 className="text-xl font-extrabold text-[#0B1E3F] tracking-tight font-display">
                    Candidate Access Port
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    {isRegistering ? 'Initialize your candidate registry portfolio' : 'Authenticate to sync progress records'}
                  </p>
                </div>

                <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-4">
                  {isRegistering && (
                    <div>
                      <label className="text-[9px] font-bold text-[#0B1E3F] uppercase tracking-widest block mb-1 font-mono">
                        Full Name / Username
                      </label>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="e.g. John Doe"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#0B1E3F] font-mono"
                        required
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-[9px] font-bold text-[#0B1E3F] uppercase tracking-widest block mb-1 font-mono">
                      University Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="candidate@university.edu"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#0B1E3F] font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-[#0B1E3F] uppercase tracking-widest block mb-1 font-mono">
                      Security Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#0B1E3F] font-mono"
                      required
                    />
                  </div>

                  {authError && (
                    <p className="text-[10px] font-mono font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-3">
                      {authError}
                    </p>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3 bg-[#0B1E3F] hover:bg-blue-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition duration-150 shadow-lg cursor-pointer"
                  >
                    {isRegistering ? 'Register & Initialize Profile' : 'Authenticate Session'}
                  </button>
                </form>

                <div className="mt-6 text-center border-t border-slate-100 pt-5 space-y-4">
                  <button
                    onClick={() => {
                      setIsRegistering(!isRegistering);
                      setAuthError('');
                    }}
                    className="text-xs text-blue-700 hover:underline font-mono font-bold cursor-pointer block w-full text-center"
                  >
                    {isRegistering ? 'Already registered? Log in here' : 'New candidate? Create account here'}
                  </button>

                  <div className="pt-3 border-t border-dashed border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAdminBypassForm(true);
                        setAuthError('');
                      }}
                      className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-extrabold text-xs uppercase tracking-wider rounded-xl transition duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                    >
                      <ShieldCheck className="w-4 h-4" /> Bypass as Administrator
                    </button>
                    <p className="text-[10px] text-slate-400 mt-1 font-mono">
                      Enter administrative dashboard & monitoring portal
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
          
        </div>
      </div>
    );
  }

  // Define sidebar navigation tabs
  const navigationTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'practice', label: 'Practice Modes', icon: Zap },
    { id: 'history', label: 'Session History', icon: Clock },
    { id: 'leaderboard', label: 'Global Leaderboard', icon: Trophy },
    { id: 'learn', label: 'Performance Analytics', icon: BookOpen },
    { id: 'admin', label: 'Admin Command', icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen bg-[#F3F4F6] text-slate-800 flex flex-col md:flex-row font-sans selection:bg-[#0B1E3F] selection:text-white">
      {/* Sidebar navigation */}
      <aside className={`w-full md:w-64 bg-[#0B1E3F] text-slate-100 border-r border-slate-300 shrink-0 flex flex-col justify-between ${isSidebarOpen ? 'block' : 'hidden md:flex'}`}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-10 border-b border-blue-900/40 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-white">M</div>
              <span className="text-lg font-extrabold tracking-tight text-white font-display">MockAgent</span>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden p-1.5 border border-blue-900/40 rounded-lg text-slate-400"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>

          <nav className="space-y-1">
            {navigationTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full px-4 py-3 rounded-xl text-left text-xs uppercase tracking-wider font-extrabold flex items-center gap-3 transition-all ${
                    isActive
                      ? 'bg-blue-600/20 text-blue-200 border border-blue-500/30 shadow-inner'
                      : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0 text-blue-400" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="px-6 pb-6 flex flex-col gap-4">
          {/* Daily Vocabulary block */}
          <div className="p-4 bg-[#071328] rounded-2xl border border-blue-900/40">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 font-bold font-mono">Daily Vocabulary</p>
            <p className="text-sm text-blue-400 font-bold mb-1">
              {stats?.wordOfTheDay?.word || 'Pragmatic'}
            </p>
            <p className="text-xs text-slate-300 leading-relaxed italic">
              {stats?.wordOfTheDay?.meaning || 'Dealing with things sensibly and realistically.'}
            </p>
          </div>

          {/* User profile capsule at footer */}
          <div className="pt-4 border-t border-blue-900/40 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-blue-400 uppercase shrink-0">
                {user.username.slice(0, 2)}
              </div>
              <div className="truncate">
                <span className="text-xs font-bold text-white block truncate">
                  {user.username}
                </span>
                <span className="text-[9px] font-mono text-slate-400 uppercase font-bold">
                  {user.role} role
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full py-2 border border-blue-900/40 bg-[#071328] text-slate-300 hover:text-rose-400 hover:border-rose-950 hover:bg-rose-950/15 text-[10px] font-bold tracking-wider uppercase rounded-xl transition duration-150 flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" /> Terminate Session
            </button>
          </div>
        </div>
      </aside>

      {/* Main panel content stage */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header Block matching Professional Polish Design */}
        <header className="h-20 border-b border-slate-200 flex items-center justify-between px-8 bg-white/90 backdrop-blur-md sticky top-0 shrink-0 text-slate-800">
          <div>
            <h1 className="text-xl font-black text-[#0B1E3F] tracking-tight font-display">
              {activeTab === 'dashboard' && 'Candidate Overview'}
              {activeTab === 'practice' && 'Practice Prep Room'}
              {activeTab === 'history' && 'Performance History'}
              {activeTab === 'leaderboard' && 'Global Rankings'}
              {activeTab === 'learn' && 'Skills & Analytics Hub'}
              {activeTab === 'admin' && 'Admin Operations'}
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Welcome back, {user.username} • Placement Phase II
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest font-mono">Current Streak</span>
              <span className="text-orange-500 font-black text-base leading-tight">
                🔥 {stats?.streak?.currentStreak ?? 0} {stats?.streak?.currentStreak === 1 ? 'Day' : 'Days'}
              </span>
            </div>
            {activeTab !== 'practice' && (
              <button
                onClick={() => setActiveTab('practice')}
                className="px-6 py-2.5 bg-[#0B1E3F] hover:bg-[#1E3A8A] text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer shadow-md"
              >
                Start New Session
              </button>
            )}
          </div>
        </header>

        {/* Outer scrolling stage */}
        <div className="flex-1 overflow-y-auto p-8 bg-[#F3F4F6]">
          <div className="max-w-5xl mx-auto w-full pb-12">
            {activeTab === 'dashboard' && (
              <DashboardView stats={stats} onNavigate={setActiveTab} />
            )}

            {activeTab === 'practice' && (
              <PracticeView onNavigate={setActiveTab} onRefreshStats={loadDashboardStats} />
            )}

            {activeTab === 'history' && (
              <HistoryView onNavigate={setActiveTab} />
            )}

            {activeTab === 'leaderboard' && (
              <LeaderboardView />
            )}

            {activeTab === 'learn' && (
              <LearningView />
            )}

            {activeTab === 'admin' && user.role === 'admin' && (
              <AdminView />
            )}

            {activeTab === 'admin' && user.role !== 'admin' && (
              <div className="bg-white border border-rose-200 rounded-3xl p-8 text-center max-w-md mx-auto my-12 shadow-sm">
                <ShieldAlert className="w-12 h-12 text-rose-600 mx-auto mb-4" />
                <h3 className="text-base font-black text-[#0B1E3F] mb-2 uppercase tracking-wide">
                  Can't able to access Admin Credentials
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Your current candidate account does not possess administrative privileges. Please verify your identity with authorized security credentials or return to the candidate overview.
                </p>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="mt-6 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#0B1E3F] text-xs font-bold uppercase rounded-xl transition duration-150 cursor-pointer"
                >
                  Return to Dashboard
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

