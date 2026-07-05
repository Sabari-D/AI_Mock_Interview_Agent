import React, { useEffect, useState } from 'react';
import { 
  Loader2, 
  Users, 
  ShieldAlert, 
  FileText, 
  Ban, 
  CheckCircle2, 
  UserPlus, 
  Trash2, 
  Clock, 
  Activity, 
  Search, 
  ShieldCheck, 
  X,
  UserCheck
} from 'lucide-react';

export default function AdminView() {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Status transition indicators
  const [banningUser, setBanningUser] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const [isSubmittingNewUser, setIsSubmittingNewUser] = useState(false);

  // Form toggle & state for Adding User
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('candidate');
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');

  // Interactive search & filter for Activity Monitoring
  const [selectedUserForActivity, setSelectedUserForActivity] = useState<string | null>(null);
  const [activitySearchQuery, setActivitySearchQuery] = useState('');

  const fetchAdminStats = () => {
    setIsLoading(true);
    fetch('/api/admin/stats')
      .then((res) => res.json())
      .then((data) => {
        setStats(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching admin statistics:', err);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchAdminStats();
    // Poll stats every 10 seconds to keep active logged-in users real-time!
    const interval = setInterval(fetchAdminStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleBan = async (userId: string, currentBanState: boolean) => {
    setBanningUser(userId);
    try {
      const res = await fetch(`/api/admin/user/${userId}/ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ban: !currentBanState }),
      });
      if (res.ok) {
        fetchAdminStats();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBanningUser(null);
    }
  };

  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    setAddSuccess('');
    setIsSubmittingNewUser(true);

    if (!newUsername.trim() || !newUserEmail.trim()) {
      setAddError('Username and email are required fields.');
      setIsSubmittingNewUser(false);
      return;
    }

    try {
      const res = await fetch('/api/admin/user/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername.trim(),
          email: newUserEmail.trim(),
          role: newUserRole
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAddSuccess(`User "${newUsername}" successfully added to the registry!`);
        setNewUsername('');
        setNewUserEmail('');
        setNewUserRole('candidate');
        setIsAddingUser(false);
        fetchAdminStats();
      } else {
        setAddError(data.error || 'Failed to register the user.');
      }
    } catch (err) {
      setAddError('Server communication failure.');
    } finally {
      setIsSubmittingNewUser(false);
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    const confirmed = window.confirm(
      `CRITICAL WARNING:\nAre you absolutely sure you want to permanently delete the candidate account "${username}"?\n\nThis will permanently delete all streak metadata, uploaded resumes, and mock interview evaluation history. This action is irreversible.`
    );
    if (!confirmed) return;

    setDeletingUser(userId);
    try {
      const res = await fetch(`/api/admin/user/${userId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        if (selectedUserForActivity === userId) {
          setSelectedUserForActivity(null);
        }
        fetchAdminStats();
      } else {
        const errData = await res.json();
        alert(errData.error || 'Failed to remove user account.');
      }
    } catch (err) {
      console.error(err);
      alert('Error communicating with database.');
    } finally {
      setDeletingUser(null);
    }
  };

  if (isLoading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
        <span className="font-mono font-bold uppercase tracking-wider text-xs">Synchronizing Security Tokens...</span>
      </div>
    );
  }

  // Filter activities based on selection and query
  const filteredActivities = (stats?.userActivities ?? []).filter((act: any) => {
    const matchesUser = selectedUserForActivity ? act.userId === selectedUserForActivity : true;
    const matchesQuery = activitySearchQuery
      ? act.action.toLowerCase().includes(activitySearchQuery.toLowerCase()) ||
        act.details.toLowerCase().includes(activitySearchQuery.toLowerCase())
      : true;
    return matchesUser && matchesQuery;
  });

  const getActionColor = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes('register') || act.includes('creat')) return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    if (act.includes('suspend') || act.includes('ban') || act.includes('delet')) return 'bg-rose-50 text-rose-700 border border-rose-200';
    if (act.includes('auth') || act.includes('login')) return 'bg-blue-50 text-blue-700 border border-blue-200';
    if (act.includes('upload') || act.includes('resume')) return 'bg-amber-50 text-amber-700 border border-amber-200';
    if (act.includes('launch') || act.includes('start')) return 'bg-purple-50 text-purple-700 border border-purple-200';
    return 'bg-slate-50 text-slate-700 border border-slate-200';
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center pb-4 border-b border-slate-200 gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-[#0B1E3F] tracking-tight font-display">
            Administrative Command Center
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Real-time candidate monitoring, session tracking, and portfolio control
          </p>
        </div>
        <span className="px-3 py-1 text-[9px] font-bold font-mono uppercase tracking-wider bg-rose-50 border border-rose-200 text-rose-700 rounded-full inline-flex items-center gap-1.5 self-start sm:self-center">
          <ShieldCheck className="w-3.5 h-3.5" /> Gated Admin Privileges
        </span>
      </div>

      {/* Metrics Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Candidates */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-xl text-blue-600">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">
              Total Users
            </span>
            <span className="text-lg font-black text-[#0B1E3F]">
              {stats?.users?.length ?? 0}
            </span>
          </div>
        </div>

        {/* Real-time active logins count */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3 relative overflow-hidden">
          <div className="absolute top-2 right-2 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </div>
          <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">
              Online Right Now
            </span>
            <span className="text-lg font-black text-[#0B1E3F]">
              {stats?.activeSessions?.length ?? 0}
            </span>
          </div>
        </div>

        {/* Daily Active Users unique count */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 border border-amber-100 rounded-xl text-amber-600">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">
              Daily Actives (DAU)
            </span>
            <span className="text-lg font-black text-[#0B1E3F]">
              {stats?.dauCount ?? 0}
            </span>
          </div>
        </div>

        {/* Total Sessions Evaluated */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">
              Total Mock Rounds
            </span>
            <span className="text-lg font-black text-[#0B1E3F]">
              {stats?.totalSessions ?? 0}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: User lists & Active Session Listing */}
        <div className="lg:col-span-8 space-y-6">
          {/* Real-time active sessions listing box */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B1E3F] font-mono">
                  Currently Logged-In Users
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400">Auto-refreshing (10s)</span>
            </div>

            {(!stats?.activeSessions || stats.activeSessions.length === 0) ? (
              <div className="py-6 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50 text-slate-400">
                <Clock className="w-6 h-6 mx-auto mb-2 opacity-60" />
                <p className="text-xs font-semibold">No candidates currently logged in</p>
                <p className="text-[10px] text-slate-400 mt-0.5">MockAgent counts active sessions within the last hour.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {stats.activeSessions.map((session: any) => (
                  <div 
                    key={session.userId} 
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between"
                  >
                    <div className="truncate pr-2">
                      <p className="text-xs font-bold text-[#0B1E3F] truncate">{session.username}</p>
                      <p className="text-[10px] text-slate-500 truncate font-mono">{session.email}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[9px] font-bold text-slate-400 uppercase font-mono block">Logged in at</span>
                      <span className="text-[10px] font-mono font-bold text-blue-700">
                        {new Date(session.loginTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Core Candidate Management and Table */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B1E3F] font-mono">
                  Candidate Registry & Control Panel
                </h3>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">Manage credentials, access states, and monitoring signals</p>
              </div>
              
              <button
                onClick={() => {
                  setIsAddingUser(!isAddingUser);
                  setAddError('');
                  setAddSuccess('');
                }}
                className="px-3.5 py-1.5 bg-[#0B1E3F] hover:bg-blue-800 text-white rounded-xl text-[10px] font-bold tracking-wider uppercase transition duration-150 flex items-center gap-1.5 cursor-pointer self-start sm:self-center"
              >
                {isAddingUser ? (
                  <>
                    <X className="w-3.5 h-3.5" /> Close Registry Form
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" /> Register New Account
                  </>
                )}
              </button>
            </div>

            {/* Registry Add Form drawer */}
            {isAddingUser && (
              <form onSubmit={handleAddUserSubmit} className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#0B1E3F] font-mono flex items-center gap-1">
                    <UserPlus className="w-4 h-4 text-blue-600" /> Account Setup Wizard
                  </h4>
                  <button 
                    type="button" 
                    onClick={() => setIsAddingUser(false)} 
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1 font-mono">
                      Candidate Name
                    </label>
                    <input
                      type="text"
                      required
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#0B1E3F] font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1 font-mono">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="e.g. candidate@university.edu"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#0B1E3F] font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1 font-mono">
                      System Role / Tier
                    </label>
                    <select
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#0B1E3F] font-mono"
                    >
                      <option value="candidate">candidate</option>
                      <option value="admin">administrator</option>
                    </select>
                  </div>
                </div>

                {addError && (
                  <p className="text-[10px] font-mono font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl p-2.5">
                    {addError}
                  </p>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingUser(false)}
                    className="px-3 py-1.5 border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold text-xs rounded-xl transition duration-150 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingNewUser}
                    className="px-4 py-1.5 bg-[#0B1E3F] hover:bg-blue-800 text-white font-semibold text-xs rounded-xl transition duration-150 cursor-pointer flex items-center gap-1"
                  >
                    {isSubmittingNewUser ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Provisioning...
                      </>
                    ) : (
                      <>Initialize Account</>
                    )}
                  </button>
                </div>
              </form>
            )}

            {addSuccess && (
              <div className="mb-6 p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-2xl flex items-center gap-2 text-xs font-semibold animate-pulse">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{addSuccess}</span>
              </div>
            )}

            {/* Candidate User Management Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider font-mono text-[10px]">
                    <th className="py-3 px-4">User Details</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Administrative Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats?.users?.map((usr: any) => {
                    const isUserOnline = stats?.activeSessions?.some((s: any) => s.userId === usr.id);
                    return (
                      <tr 
                        key={usr.id} 
                        className={`hover:bg-slate-50/50 transition duration-150 ${
                          selectedUserForActivity === usr.id ? 'bg-blue-50/20' : ''
                        }`}
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="relative">
                              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-[#0B1E3F] uppercase">
                                {usr.username.slice(0, 2)}
                              </div>
                              {isUserOnline && (
                                <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white"></span>
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-[#0B1E3F] text-xs font-sans">{usr.username}</span>
                                {usr.email === 'sabaridhandapani69@gmail.com' && (
                                  <span className="text-[8px] font-mono bg-indigo-50 border border-indigo-100 text-indigo-700 px-1 rounded-sm uppercase font-bold">Owner</span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-500 font-mono block">{usr.email}</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-4 font-mono font-bold uppercase text-[9px]">
                          <span className={`px-2 py-0.5 rounded-full ${
                            usr.role === 'admin' 
                              ? 'bg-rose-50 text-rose-700 border border-rose-100' 
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {usr.role}
                          </span>
                        </td>

                        <td className="py-4 px-4 font-mono">
                          {usr.isBanned ? (
                            <span className="text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-100 px-2 py-0.5 rounded-full">
                              Suspended
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full">
                              Active
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-4 text-right">
                          <div className="flex justify-end items-center gap-2">
                            {/* Filter user activity */}
                            <button
                              onClick={() => {
                                if (selectedUserForActivity === usr.id) {
                                  setSelectedUserForActivity(null);
                                } else {
                                  setSelectedUserForActivity(usr.id);
                                }
                              }}
                              className={`px-2 py-1 text-[10px] font-mono font-bold uppercase rounded-lg border transition duration-150 cursor-pointer ${
                                selectedUserForActivity === usr.id
                                  ? 'bg-[#0B1E3F] text-white border-[#0B1E3F]'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-[#0B1E3F]'
                              }`}
                              title="Monitor specific activity feed"
                            >
                              <span className="flex items-center gap-1">
                                <Activity className="w-3 h-3" /> Monitor
                              </span>
                            </button>

                            {/* Suspend action */}
                            {usr.role === 'admin' ? (
                              <span className="text-[10px] text-slate-400 italic px-2">Immune</span>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleToggleBan(usr.id, usr.isBanned)}
                                  disabled={banningUser !== null}
                                  className={`p-1.5 rounded-lg border transition duration-150 cursor-pointer ${
                                    usr.isBanned
                                      ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                                      : 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
                                  }`}
                                  title={usr.isBanned ? 'Lift suspension' : 'Suspend Candidate'}
                                >
                                  {banningUser === usr.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : usr.isBanned ? (
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  ) : (
                                    <Ban className="w-3.5 h-3.5" />
                                  )}
                                </button>

                                {/* Permanent account removal */}
                                <button
                                  onClick={() => handleDeleteUser(usr.id, usr.username)}
                                  disabled={deletingUser !== null}
                                  className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition duration-150 cursor-pointer"
                                  title="Permanently Delete Account"
                                >
                                  {deletingUser === usr.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right column: Interactive User Activity Monitoring */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm sticky top-24">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B1E3F] font-mono flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-blue-600" />
                Live Activity Monitor
              </h3>
              <span className="px-2 py-0.5 text-[9px] font-mono bg-blue-50 border border-blue-200 text-blue-700 rounded-full font-bold">
                {filteredActivities.length} Signals
              </span>
            </div>

            {/* Filter description tag if selected */}
            {selectedUserForActivity && (
              <div className="mb-4 p-2 bg-blue-50 border border-blue-200 text-[#0B1E3F] rounded-xl flex justify-between items-center text-[11px] font-bold">
                <span className="truncate">
                  Filtering: <span className="font-mono text-blue-700">
                    {stats?.users?.find((u: any) => u.id === selectedUserForActivity)?.username || 'Selected Candidate'}
                  </span>
                </span>
                <button
                  onClick={() => setSelectedUserForActivity(null)}
                  className="p-0.5 bg-blue-100 hover:bg-blue-200 rounded-lg text-blue-800 cursor-pointer"
                  title="Clear filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Search Input for signals */}
            <div className="relative mb-4">
              <input
                type="text"
                value={activitySearchQuery}
                onChange={(e) => setActivitySearchQuery(e.target.value)}
                placeholder="Search signals..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#0B1E3F] font-mono"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              {activitySearchQuery && (
                <button
                  onClick={() => setActivitySearchQuery('')}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Activity signal stream timeline */}
            {filteredActivities.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50 text-slate-400">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-60 animate-pulse" />
                <p className="text-xs font-semibold">No activity signals found</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Activities will record automatically when candidates engage.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                {filteredActivities.slice(0, 30).map((act: any, idx: number) => {
                  const actUser = stats?.users?.find((u: any) => u.id === act.userId);
                  const logTime = new Date(act.timestamp || act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                  return (
                    <div key={act.id || idx} className="relative pl-4 border-l border-slate-200 last:border-0 pb-1">
                      {/* Circle bullet */}
                      <span className="absolute -left-[4.5px] top-1.5 h-2.5 w-2.5 rounded-full bg-slate-300 border border-white"></span>
                      
                      <div className="space-y-1">
                        <div className="flex justify-between items-start gap-2">
                          <span className={`text-[8px] font-mono font-bold tracking-wider uppercase px-1.5 py-0.5 rounded ${getActionColor(act.action)}`}>
                            {act.action}
                          </span>
                          <span className="text-[9px] font-mono text-slate-400 font-bold shrink-0">{logTime}</span>
                        </div>
                        
                        <p className="text-xs text-slate-700 font-sans leading-relaxed">
                          {act.details}
                        </p>

                        <div className="flex items-center gap-1 text-[9px] font-mono text-slate-400 font-semibold">
                          <span>User:</span>
                          <span className="text-[#0B1E3F] font-bold">
                            {actUser ? actUser.username : `ID: ${act.userId.slice(0, 5)}...`}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Administrative Action Log table */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B1E3F] mb-4 font-mono flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4 text-rose-600" />
          Administrative Audit Logs
        </h3>
        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 font-mono text-[10px] text-slate-600">
          {[...(stats?.auditLogs ?? [])].reverse().map((log: any, idx: number) => (
            <div 
              key={log.id || idx} 
              className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2"
            >
              <div>
                <span className="text-rose-700 font-extrabold mr-1">[{log.action.toUpperCase()}]</span>
                <span>{log.details}</span>
              </div>
              <span className="text-slate-400 text-[9px] shrink-0">
                {new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
