import React, { useEffect, useState } from 'react';
import { Award, Flame, Loader2, Sparkles, Trophy, User } from 'lucide-react';

export default function LeaderboardView() {
  const [entries, setEntries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/leaderboard')
      .then((res) => res.json())
      .then((data) => {
        setEntries(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setIsLoading(false);
      });
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400 mr-2" />
        <span className="font-mono font-bold uppercase tracking-wider text-xs">Loading campus rankings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center pb-4 border-b border-slate-800">
        <h2 className="text-xl font-extrabold text-white tracking-tight font-display">
          Campus Placements Leaderboard
        </h2>
        <span className="text-xs text-slate-500 font-mono">
          Leetcode-Style Streaks
        </span>
      </div>

      <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3 mb-6">
          <Trophy className="w-5 h-5 text-amber-500" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 font-mono">
            Current Placement Rankings
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-mono text-xs text-slate-300">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 font-bold">
                <th className="py-3 px-4">Rank</th>
                <th className="py-3 px-4">Candidate Name</th>
                <th className="py-3 px-4 text-center">Interviews Completed</th>
                <th className="py-3 px-4 text-center">Current Streak</th>
                <th className="py-3 px-4 text-right">Cumulative Rating</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((item, index) => {
                let rankStyle = 'text-slate-400';
                if (index === 0) rankStyle = 'text-amber-500 font-extrabold flex items-center gap-1';
                if (index === 1) rankStyle = 'text-slate-300 font-extrabold';
                if (index === 2) rankStyle = 'text-amber-700 font-extrabold';

                return (
                  <tr key={item.userId} className="border-b border-slate-800/40 hover:bg-slate-800/20 transition">
                    <td className="py-4 px-4 font-bold">
                      <span className={rankStyle}>
                        {index === 0 ? <Sparkles className="w-3.5 h-3.5 inline-block text-amber-500 animate-pulse" /> : null}
                        #{index + 1}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-sans font-semibold text-slate-200">
                      {item.username}
                    </td>
                    <td className="py-4 px-4 text-center text-slate-400">
                      {item.sessionsCount} sessions
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center gap-1 text-amber-500">
                        <Flame className="w-4 h-4 fill-current" />
                        <span>{item.currentStreak} days</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right text-blue-400 font-bold text-sm">
                      {item.totalScore > 0 ? `${item.totalScore}%` : '0%'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
