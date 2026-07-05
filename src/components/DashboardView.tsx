import React, { useEffect, useState } from 'react';
import { Award, Flame, BookOpen, Star, Calendar, Zap } from 'lucide-react';
import { motion } from 'motion/react';

interface DashboardProps {
  stats: any;
  onNavigate: (view: string) => void;
}

export default function DashboardView({ stats, onNavigate }: DashboardProps) {
  const [activeWord, setActiveWord] = useState<any>(null);

  useEffect(() => {
    if (stats?.wordOfTheDay) {
      setActiveWord(stats.wordOfTheDay);
    }
  }, [stats]);

  // Render a simple beautiful custom SVG Radar Chart representing the five dimensions
  const renderRadarChart = () => {
    const metrics = [
      { name: 'Pronunciation', value: stats?.radarMetrics?.pronunciation ?? 75 },
      { name: 'Grammar', value: stats?.radarMetrics?.grammar ?? 80 },
      { name: 'Fluency', value: stats?.radarMetrics?.fluency ?? 70 },
      { name: 'Vocabulary', value: stats?.radarMetrics?.vocabulary ?? 75 },
      { name: 'Confidence', value: stats?.radarMetrics?.confidence ?? 85 },
    ];

    const centerX = 200;
    const centerY = 160;
    const radius = 80;
    const pointsCount = metrics.length;

    // Calculate coordinates for polygon
    const points = metrics.map((m, i) => {
      const angle = (Math.PI * 2 / pointsCount) * i - Math.PI / 2;
      const r = (m.value / 100) * radius;
      const x = centerX + r * Math.cos(angle);
      const y = centerY + r * Math.sin(angle);
      return { x, y, name: m.name, val: m.value };
    });

    // Outer grid coordinate outline (100% mark)
    const gridPoints = Array.from({ length: 5 }).map((_, level) => {
      const currentRadius = (radius / 5) * (level + 1);
      return metrics.map((_, i) => {
        const angle = (Math.PI * 2 / pointsCount) * i - Math.PI / 2;
        const x = centerX + currentRadius * Math.cos(angle);
        const y = centerY + currentRadius * Math.sin(angle);
        return `${x},${y}`;
      }).join(' ');
    });

    const polygonPoints = points.map(p => `${p.x},${p.y}`).join(' ');

    return (
      <div className="flex flex-col items-center justify-center p-6 bg-white border border-slate-200 rounded-3xl shadow-sm">
        <h3 className="text-sm font-bold tracking-wide uppercase text-[#0B1E3F] mb-4 flex items-center gap-2 font-mono">
          <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
          Skill Radar Dimensions
        </h3>
        <div className="relative w-80 h-64">
          <svg className="w-full h-full" viewBox="0 0 400 320">
            {/* Grid Levels */}
            {gridPoints.map((gp, idx) => (
              <polygon
                key={idx}
                points={gp}
                fill="none"
                stroke="#E2E8F0"
                strokeWidth="1"
              />
            ))}
            
            {/* Grid Axes */}
            {metrics.map((_, i) => {
              const angle = (Math.PI * 2 / pointsCount) * i - Math.PI / 2;
              const x2 = centerX + radius * Math.cos(angle);
              const y2 = centerY + radius * Math.sin(angle);
              return (
                <line
                  key={i}
                  x1={centerX}
                  y1={centerY}
                  x2={x2}
                  y2={y2}
                  stroke="#E2E8F0"
                  strokeWidth="1.5"
                />
              );
            })}

            {/* Polygon representing user scores */}
            {stats?.totalSessions > 0 ? (
              <>
                <polygon
                  points={polygonPoints}
                  fill="rgba(37, 99, 235, 0.15)"
                  stroke="#2563EB"
                  strokeWidth="2.5"
                  className="transition-all duration-500"
                />
                {/* Dots on points */}
                {points.map((p, i) => (
                  <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r="4"
                    fill="#2563EB"
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                  />
                ))}
              </>
            ) : (
              <text
                x={centerX}
                y={centerY}
                textAnchor="middle"
                className="text-xs fill-slate-400 font-mono uppercase font-bold"
              >
                No completed interviews
              </text>
            )}

            {/* Axis Labels */}
            {metrics.map((m, i) => {
              const angle = (Math.PI * 2 / pointsCount) * i - Math.PI / 2;
              const offset = 104;
              const x = centerX + offset * Math.cos(angle);
              const y = centerY + offset * Math.sin(angle);
              let textAnchor = 'middle';
              if (Math.cos(angle) > 0.1) textAnchor = 'start';
              if (Math.cos(angle) < -0.1) textAnchor = 'end';

              return (
                <text
                  key={i}
                  x={x}
                  y={y + 4}
                  textAnchor={textAnchor}
                  className="text-[11px] fill-[#0B1E3F] font-bold uppercase tracking-wider font-mono"
                >
                  {m.name}
                </text>
              );
            })}
          </svg>
        </div>
        {stats?.totalSessions > 0 && (
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 mt-3 w-full border-t border-slate-100 pt-3 text-[11px] font-mono text-slate-500">
            {metrics.map((m, idx) => (
              <div key={idx} className="flex justify-between">
                <span>{m.name}:</span>
                <span className="text-blue-700 font-bold">{m.value}%</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Render GitHub-Style Activity Heatmap
  const renderHeatmap = () => {
    // Generate dates for the last 5 weeks
    const dates: string[] = [];
    const today = new Date();
    for (let i = 27; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }

    const activityMap = new Map<string, number>();
    if (stats?.heatmap) {
      stats.heatmap.forEach((l: any) => {
        activityMap.set(l.date, l.sessionsCount);
      });
    }

    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <h3 className="text-sm font-bold tracking-wide uppercase text-[#0B1E3F] mb-4 flex items-center gap-2 font-mono">
          <Calendar className="w-4 h-4 text-blue-600" />
          Active Heatmap (Past 28 Days)
        </h3>
        <div className="flex flex-wrap gap-2 justify-start items-center">
          {dates.map((dateStr) => {
            const count = activityMap.get(dateStr) || 0;
            const dateObj = new Date(dateStr);
            const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            
            let color = 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-500';
            if (count === 1) color = 'bg-blue-50 border-blue-200 text-blue-600';
            if (count === 2) color = 'bg-blue-100 border-blue-300 text-blue-700';
            if (count >= 3) color = 'bg-[#0B1E3F] border-[#071328] text-white';

            return (
              <div
                key={dateStr}
                className={`w-8 h-8 rounded-lg flex flex-col items-center justify-center border text-[9px] font-mono font-bold transition-all ${color} cursor-help`}
                title={`${count} interviews completed on ${formattedDate}`}
              >
                {dateObj.getDate()}
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 mt-4 text-[10px] font-mono text-slate-400 justify-end">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-slate-100 border border-slate-200"></span>
            No Practice
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-blue-50 border border-blue-200"></span>
            1 Session
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-blue-100 border border-blue-300"></span>
            2 Sessions
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-[#0B1E3F]"></span>
            3+ Sessions
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#0B1E3F] via-blue-900 to-[#0B1E3F] border border-blue-900/10 rounded-3xl p-8 shadow-md">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -z-10"></div>
        <div className="max-w-2xl relative z-10">
          <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-300 bg-blue-950/80 border border-blue-800 rounded-full mb-3 inline-block font-mono">
            Campus Placement Ready
          </span>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-none mb-3 font-display">
            AI Mock Interview Agent
          </h1>
          <p className="text-xs text-slate-200 mb-6 leading-relaxed font-sans">
            Harness state-of-the-art dual AI interviewers to perfect your behavioral poise, syntactical grammar, and tech explanation skills. Gamified progress, vector-embedded resume validation, and real-time clarity analysis in one premium dashboard.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate('practice')}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all active:scale-95 shadow-md"
            >
              <Zap className="w-4 h-4 fill-current" />
              Launch Interview Simulator
            </button>
            <button
              onClick={() => onNavigate('learn')}
              className="px-5 py-2.5 text-xs font-extrabold tracking-wider uppercase border border-blue-900/40 bg-[#071328] text-blue-200 hover:bg-blue-950 rounded-xl transition duration-200 cursor-pointer"
            >
              Explore Drill Modules
            </button>
          </div>
        </div>
      </div>

      {/* Grid for key widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Streaks and Badges */}
        <div className="md:col-span-2 space-y-6">
          {/* Quick metrics row */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <Flame className="w-6 h-6 text-amber-500 fill-amber-500/20 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">
                  Current Streak
                </span>
                <span className="text-lg font-black text-[#0B1E3F]">
                  {stats?.streak?.currentStreak ?? 0} {stats?.streak?.currentStreak === 1 ? 'Day' : 'Days'}
                </span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <Flame className="w-6 h-6 text-blue-500 fill-blue-500/20" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">
                  Longest Streak
                </span>
                <span className="text-lg font-black text-[#0B1E3F]">
                  {stats?.streak?.longestStreak ?? 0} Days
                </span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm col-span-2 md:col-span-1 flex items-center gap-4">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <Award className="w-6 h-6 text-emerald-600 fill-emerald-500/20" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">
                  Completed
                </span>
                <span className="text-lg font-black text-[#0B1E3F]">
                  {stats?.totalSessions ?? 0} {stats?.totalSessions === 1 ? 'Session' : 'Sessions'}
                </span>
              </div>
            </div>
          </div>

          {/* Activity calendar heat map */}
          {renderHeatmap()}
        </div>

        {/* Right Column: Skill Radar Chart */}
        <div>
          {renderRadarChart()}
        </div>
      </div>

      {/* Vocabulary word of the day widget */}
      {activeWord && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 px-3 py-1 text-[9px] font-bold tracking-wider uppercase text-blue-700 bg-blue-50 border-l border-b border-slate-200 rounded-bl-xl font-mono">
            {activeWord.category} Word of the Moment
          </div>
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl mt-1">
              <BookOpen className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h4 className="text-lg font-black text-[#0B1E3F] font-display tracking-wide">
                {activeWord.word}
              </h4>
              <p className="text-xs text-slate-500 font-medium italic mt-0.5">
                "{activeWord.meaning}"
              </p>
              <div className="mt-3 text-xs bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-slate-600 italic font-mono leading-relaxed">
                <span className="font-bold text-blue-700 font-sans">Interview Example:</span> {activeWord.example}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
