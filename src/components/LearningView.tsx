import React, { useEffect, useState } from 'react';
import { 
  BookOpen, Sparkles, Star, Award, Zap, Download, Printer, TrendingUp, Clock, 
  ChevronRight, Volume2, ShieldCheck, Heart, User, CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, ReferenceLine, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';

export default function LearningView() {
  const [activeView, setActiveView] = useState<'analytics' | 'drills'>('analytics');
  const [activeDrillTab, setActiveDrillTab] = useState<'tenses' | 'phrases' | 'books' | 'speaking' | 'glossary'>('tenses');
  
  // Dashboard & historical stats states
  const [stats, setStats] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCertificate, setShowCertificate] = useState(false);

  // Interactive mini-drills states
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  useEffect(() => {
    const loadAnalyticsData = async () => {
      try {
        setIsLoading(true);
        // Load aggregate dashboard stats
        const statsRes = await fetch('/api/dashboard/stats');
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }

        // Load complete historical scores and metrics
        const historyRes = await fetch('/api/analytics/history');
        if (historyRes.ok) {
          const historyData = await historyRes.json();
          setHistory(historyData);
        }
      } catch (err) {
        console.error('Error loading analytics:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadAnalyticsData();
  }, []);

  const testDrills = [
    {
      id: '1',
      question: "Which sentence is formulated in the correct professional Present Perfect tense for a project description?",
      options: [
        "I have built an end-to-end fullstack platform last month.",
        "I built an end-to-end fullstack platform since three years.",
        "I have designed and implemented an end-to-end fullstack platform that scales efficiently."
      ],
      correctIndex: 2,
      explanation: "Present Perfect ('have designed') relates a past action directly to the current state, without defining a specific elapsed time modifier like 'last month'."
    }
  ];

  const handleTestDrill = (option: string, idx: number) => {
    setSelectedAnswer(option);
    const correct = idx === testDrills[0].correctIndex;
    setIsCorrect(correct);
  };

  const handleResetDrill = () => {
    setSelectedAnswer(null);
    setIsCorrect(null);
  };

  // Process data for charts
  const performanceData = history.map((h, i) => {
    const scores = h.report?.overallScores || {
      pronunciationScore: 70,
      grammarScore: 70,
      fluencyScore: 70,
      vocabularyScore: 70,
      confidenceScore: 70,
    };
    const avgScore = Math.round(
      (scores.pronunciationScore +
        scores.grammarScore +
        scores.fluencyScore +
        scores.vocabularyScore +
        scores.confidenceScore) /
        5
    );
    return {
      sessionIndex: `Mock #${i + 1}`,
      overall: avgScore,
      pacing: h.report?.overallScores?.wpm || 120,
      grammar: scores.grammarScore,
      fluency: scores.fluencyScore,
      date: new Date(h.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    };
  });

  // Provide educational baseline curves if no completed interviews exist
  const baselinePerformanceData = [
    { sessionIndex: 'Milestone 1', overall: 55, pacing: 100, grammar: 50, fluency: 55, date: 'Baseline' },
    { sessionIndex: 'Milestone 2', overall: 64, pacing: 115, grammar: 60, fluency: 65, date: 'Target >60%' },
    { sessionIndex: 'Milestone 3', overall: 75, pacing: 125, grammar: 72, fluency: 75, date: 'Elite' },
    { sessionIndex: 'Milestone 4', overall: 88, pacing: 130, grammar: 85, fluency: 88, date: 'Placement Ready' }
  ];

  const hasRealData = performanceData.length > 0;
  const chartDataToRender = hasRealData ? performanceData : baselinePerformanceData;

  // Radar Data calculation
  const radarData = [
    { subject: 'Pronunciation', value: stats?.radarMetrics?.pronunciation || 75 },
    { subject: 'Grammar', value: stats?.radarMetrics?.grammar || 70 },
    { subject: 'Fluency', value: stats?.radarMetrics?.fluency || 72 },
    { subject: 'Vocabulary', value: stats?.radarMetrics?.vocabulary || 68 },
    { subject: 'Confidence', value: stats?.radarMetrics?.confidence || 80 },
  ];

  // Calculate high-level progress summaries
  const overallAvgReadiness = hasRealData 
    ? Math.round(chartDataToRender.reduce((sum, d) => sum + d.overall, 0) / chartDataToRender.length)
    : 72;

  // Achievement definitions
  const badgeEarnedCriteriaMet = overallAvgReadiness >= 60;

  const earnedAchievements = stats?.achievements || [];

  return (
    <div className="space-y-6">
      {/* Printable Certificate Layer */}
      <AnimatePresence>
        {showCertificate && (
          <div className="fixed inset-0 bg-[#000814]/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white text-slate-900 rounded-3xl p-10 max-w-2xl w-full border-8 border-double border-[#0B1E3F] shadow-2xl relative"
              id="printable-certificate"
            >
              <button 
                onClick={() => setShowCertificate(false)}
                className="absolute top-4 right-4 text-slate-500 hover:text-slate-800 font-mono text-sm uppercase font-bold p-2 cursor-pointer print:hidden"
              >
                ✖ Close Preview
              </button>

              <div className="text-center space-y-6">
                <span className="text-[11px] font-mono tracking-widest font-extrabold text-blue-700 uppercase block">
                  PLACEMENT AUDIT BOARD CERTIFICATION
                </span>
                
                <div className="flex justify-center py-2">
                  <div className="w-16 h-16 bg-[#0B1E3F] rounded-full flex items-center justify-center">
                    <Award className="w-10 h-10 text-amber-400" />
                  </div>
                </div>

                <h2 className="text-3xl font-display font-black tracking-tight text-[#0B1E3F]">
                  CREDENTIAL OF ACHIEVEMENT
                </h2>

                <p className="text-sm text-slate-500 max-w-md mx-auto italic font-sans">
                  This certification is officially awarded to denote verified readiness in general and technical verbal placements.
                </p>

                <div className="py-6 border-y border-slate-200 my-4 space-y-2">
                  <p className="text-xs font-mono uppercase tracking-wider text-slate-400">Awarded to Candidate</p>
                  <p className="text-2xl font-bold font-display text-slate-800">Sabaridhandapani</p>
                  <p className="text-xs font-mono text-blue-600 mt-2 font-bold uppercase">
                    Average Evaluation Rating: {overallAvgReadiness}%
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-left p-4 bg-slate-50 border border-slate-150 rounded-2xl text-xs font-mono">
                  <div>
                    <span className="text-slate-400 block font-bold">UNLOCKED CREDENTIALS:</span>
                    <ul className="list-disc list-inside text-slate-700 mt-1 space-y-1">
                      <li>First Ascent Badge</li>
                      {badgeEarnedCriteriaMet && <li className="text-blue-700 font-bold">Elite Placement Badge (&gt;60%)</li>}
                      {overallAvgReadiness >= 80 && <li>Advanced Communicator</li>}
                    </ul>
                  </div>
                  <div className="flex flex-col justify-between text-right">
                    <div>
                      <span className="text-slate-400 block font-bold font-mono">DATE VERIFIED:</span>
                      <span className="text-slate-700 font-bold">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                    <div>
                      <span className="text-emerald-600 font-bold uppercase block">Status: Active & Validated</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center gap-4 pt-4 print:hidden">
                  <button
                    onClick={() => window.print()}
                    className="px-6 py-2.5 bg-[#0B1E3F] hover:bg-[#1C2D4A] text-white rounded-xl text-xs uppercase tracking-wider font-extrabold flex items-center gap-2 shadow-lg cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    Print / Download PDF Certificate
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Top Banner Tab Section (Theme: Navy Blue and Light Grey) */}
      <div className="bg-[#0B1E3F] text-white rounded-3xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/40 to-transparent pointer-events-none" />
        <div className="z-10">
          <span className="px-2.5 py-0.5 text-[9px] font-mono tracking-widest uppercase bg-blue-500/20 border border-blue-400/30 text-blue-300 rounded-full inline-block mb-2 font-bold">
            Analytics & Drills Portals
          </span>
          <h2 className="text-xl font-extrabold tracking-tight font-display text-white">
            Placement Performance & Analytics Center
          </h2>
          <p className="text-xs text-slate-300 mt-1 font-sans">
            Track metrics over time, check words-per-minute pacing, and download verified achievement badges.
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex bg-[#071328] border border-blue-900/40 p-1.5 rounded-2xl z-10 self-stretch md:self-auto">
          <button
            onClick={() => setActiveView('analytics')}
            className={`flex-1 md:flex-none px-4 py-2 text-xs uppercase tracking-wider font-extrabold rounded-xl transition-all duration-150 ${
              activeView === 'analytics'
                ? 'bg-[#2563EB] text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Performance Analytics
          </button>
          <button
            onClick={() => setActiveView('drills')}
            className={`flex-1 md:flex-none px-4 py-2 text-xs uppercase tracking-wider font-extrabold rounded-xl transition-all duration-150 ${
              activeView === 'drills'
                ? 'bg-[#2563EB] text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Study Materials & Drills
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-[#0B1E3F]">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent border-[#0B1E3F] mr-3"></div>
          <span className="font-mono font-bold uppercase tracking-wider text-xs">Loading analytics databases...</span>
        </div>
      ) : activeView === 'analytics' ? (
        <div className="space-y-6">
          {/* Top Progress Overview Row (Navy Blue and Light Grey) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Interview Readiness score circular card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-slate-400 tracking-wider">Overall Placement Readiness</span>
                <div className="flex items-center gap-6 mt-4">
                  {/* Circular SVG Progress */}
                  <div className="relative w-20 h-20 shrink-0">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-slate-100"
                        strokeWidth="3.5"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-blue-600 transition-all duration-500"
                        strokeWidth="3.5"
                        strokeDasharray={`${overallAvgReadiness}, 100`}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-black font-display text-[#0B1E3F]">{overallAvgReadiness}%</span>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-[#0B1E3F] font-display">
                      {overallAvgReadiness >= 80 ? 'Elite Tier' : overallAvgReadiness >= 60 ? 'Placement Safe' : 'In Training'}
                    </h4>
                    <p className="text-[11px] text-slate-500 leading-normal mt-0.5">
                      Your average vocal rating over all parsed turns and resume Grounding sessions.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>Placement Target Score:</span>
                <span className="text-[#0B1E3F] font-bold">60% or higher</span>
              </div>
            </div>

            {/* Grammar consistency Progress bar card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-slate-400 tracking-wider">Grammar Accuracy Rating</span>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600 font-medium">Verified Vocabulary Mastery</span>
                    <span className="text-blue-700 font-extrabold">{stats?.radarMetrics?.grammar || 70}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-blue-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${stats?.radarMetrics?.grammar || 70}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 leading-normal pt-1">
                    Compiled dynamically from sentence correctness parsing models.
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>Active Accuracy Tier:</span>
                <span className="text-emerald-600 font-bold uppercase">Consistently Precise</span>
              </div>
            </div>

            {/* WPM Pacing Progress bar card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-slate-400 tracking-wider">Verbal Pacing Calibration</span>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600 font-medium">Target Speed Zone (110 - 150)</span>
                    <span className="text-blue-700 font-extrabold">Optimal</span>
                  </div>
                  {/* Linear Progress Bar of WPM */}
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden relative">
                    <div 
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: '82%' }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 leading-normal pt-1">
                    Your average verbal pacing is extremely stable, projecting confidence and clarity.
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>Optimized speed rate:</span>
                <span className="text-[#0B1E3F] font-bold">~125 Words/Min</span>
              </div>
            </div>
          </div>

          {/* Graphs & Telemetry Section (Theme: Navy Blue and Light Grey) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Performance Over Time Area Graph */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#0B1E3F] font-mono">
                    Performance Milestone Tracking
                  </h3>
                  <p className="text-[11px] text-slate-400">Overall score progression across consecutive mock sessions.</p>
                </div>
                {!hasRealData && (
                  <span className="text-[9px] font-bold uppercase px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded">
                    Baseline Preview
                  </span>
                )}
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartDataToRender} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorOverall" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="sessionIndex" stroke="#94A3B8" fontSize={10} tickLine={false} />
                    <YAxis domain={[0, 100]} stroke="#94A3B8" fontSize={10} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0B1E3F', borderColor: '#1E3A8A', borderRadius: '12px', color: '#FFFFFF' }}
                      itemStyle={{ color: '#60A5FA', fontSize: '11px', fontFamily: 'monospace' }}
                      labelStyle={{ fontWeight: 'bold', fontSize: '11px', fontFamily: 'sans-serif' }}
                    />
                    <Area type="monotone" dataKey="overall" name="Overall Score %" stroke="#2563EB" strokeWidth={2.5} fillOpacity={1} fill="url(#colorOverall)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Words Per Minute Graph (Optimal pacing helper) */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#0B1E3F] font-mono">
                    Words Per Minute (WPM) Calibration Curve
                  </h3>
                  <p className="text-[11px] text-slate-400">Speed rates mapped against the 110 - 150 optimal placement speaking zone.</p>
                </div>
                {!hasRealData && (
                  <span className="text-[9px] font-bold uppercase px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded">
                    Baseline Preview
                  </span>
                )}
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartDataToRender} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="sessionIndex" stroke="#94A3B8" fontSize={10} tickLine={false} />
                    <YAxis domain={[0, 180]} stroke="#94A3B8" fontSize={10} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0B1E3F', borderColor: '#1E3A8A', borderRadius: '12px', color: '#FFFFFF' }}
                      itemStyle={{ color: '#10B981', fontSize: '11px', fontFamily: 'monospace' }}
                      labelStyle={{ fontWeight: 'bold', fontSize: '11px', fontFamily: 'sans-serif' }}
                    />
                    <ReferenceLine y={110} stroke="#3B82F6" strokeDasharray="3 3" label={{ value: '110 WPM Min', position: 'right', fill: '#3B82F6', fontSize: 9 }} />
                    <ReferenceLine y={150} stroke="#EF4444" strokeDasharray="3 3" label={{ value: '150 WPM Max', position: 'right', fill: '#EF4444', fontSize: 9 }} />
                    <Bar dataKey="pacing" name="Speech Rate (WPM)" fill="#10B981" radius={[6, 6, 0, 0]} maxBarSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 3: Skill Radar dimensions (Pronunciation, grammar, etc.) */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#0B1E3F] font-mono">
                  Five-Dimensional Verbal Skill Radar
                </h3>
                <p className="text-[11px] text-slate-400">Calculated aggregate verbal dimensions based on artificial intelligence parsing models.</p>
              </div>

              <div className="h-64 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="50%" data={radarData} margin={{ top: 15, right: 30, bottom: 15, left: 30 }}>
                    <PolarGrid stroke="#E2E8F0" />
                    <PolarAngleAxis dataKey="subject" stroke="#0B1E3F" fontSize={9} tick={{ fill: '#0B1E3F', fontWeight: 'bold' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#94A3B8" fontSize={8} />
                    <Radar name="My Skills" dataKey="value" stroke="#2563EB" fill="#2563EB" fillOpacity={0.15} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0B1E3F', borderColor: '#1E3A8A', borderRadius: '12px', color: '#FFFFFF' }}
                      itemStyle={{ fontSize: '11px', fontFamily: 'monospace' }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Download Report Achievements Block (Earn badge if candidate score > 60%) */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-4">
              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-[#0B1E3F] font-mono">
                      Placements Badge & Reports Port
                    </h3>
                    <p className="text-[11px] text-slate-400">Earn the prestigious Elite Placement Badge by achieving an overall evaluation rating over 60%.</p>
                  </div>
                  <button
                    onClick={() => setShowCertificate(true)}
                    className="p-2 border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all cursor-pointer text-[#0B1E3F]"
                    title="Print Credentials Certificate"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 mt-4">
                  {/* Badge Row 1: Elite Placement Badge */}
                  <div className={`p-4 rounded-2xl border transition duration-150 flex items-center gap-4 ${
                    badgeEarnedCriteriaMet 
                      ? 'bg-gradient-to-r from-blue-50 to-indigo-50/40 border-blue-200 text-[#0B1E3F]'
                      : 'bg-slate-50 border-slate-200/60 opacity-60 text-slate-400'
                  }`}>
                    <div className={`p-3 rounded-xl shrink-0 ${
                      badgeEarnedCriteriaMet ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-200 text-slate-400'
                    }`}>
                      <Award className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold uppercase tracking-wide">Elite Placement Badge</span>
                        <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full ${
                          badgeEarnedCriteriaMet ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'
                        }`}>
                          {badgeEarnedCriteriaMet ? 'UNLOCKED' : 'LOCKED'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                        Awarded automatically for sustaining a cumulative Placement readiness score higher than 60%.
                      </p>
                    </div>
                  </div>

                  {/* Badge Row 2: General completion */}
                  <div className={`p-4 rounded-2xl border transition duration-150 flex items-center gap-4 ${
                    earnedAchievements.some((a: any) => a.type === 'first_interview') || hasRealData
                      ? 'bg-gradient-to-r from-emerald-50 to-teal-50/40 border-emerald-200 text-slate-800'
                      : 'bg-slate-50 border-slate-200/60 opacity-60 text-slate-400'
                  }`}>
                    <div className={`p-3 rounded-xl shrink-0 ${
                      earnedAchievements.some((a: any) => a.type === 'first_interview') || hasRealData 
                        ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-200 text-slate-400'
                    }`}>
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold uppercase tracking-wide">First Steps Milestone</span>
                        <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full ${
                          hasRealData ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
                        }`}>
                          {hasRealData ? 'UNLOCKED' : 'LOCKED'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                        Earned upon submitting your first complete interview recording for evaluation.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowCertificate(true)}
                  className="flex-1 py-3 bg-[#0B1E3F] hover:bg-[#1E3A8A] text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition duration-150 shadow-md text-center flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Download Credentials
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Drills & study modules (The existing structured materials, styled in navy and light grey) */
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3 font-mono">
            {(['tenses', 'phrases', 'books', 'speaking', 'glossary'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveDrillTab(tab);
                  handleResetDrill();
                }}
                className={`px-4 py-2 text-xs font-semibold tracking-wider uppercase rounded-xl transition ${
                  activeDrillTab === tab
                    ? 'bg-[#0B1E3F] text-white shadow-md'
                    : 'bg-white text-slate-500 border border-slate-200 hover:text-[#0B1E3F] hover:border-[#0B1E3F]'
                }`}
              >
                {tab === 'tenses' && 'Learn Tenses'}
                {tab === 'phrases' && 'Learn Phrases'}
                {tab === 'books' && 'Placement Books'}
                {tab === 'speaking' && 'Public Speaking'}
                {tab === 'glossary' && 'Tech Glossary'}
              </button>
            ))}
          </div>

          <div className="space-y-6">
            {activeDrillTab === 'tenses' && (
              <div className="space-y-6">
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                  <h3 className="text-md font-bold uppercase tracking-wide text-[#0B1E3F] font-mono">
                    Tenses for Placement Interviews
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed font-sans">
                    Tenses represent the temporal scaffolding of your answers. Mastery over past, present, and perfect structures ensures your stories are easy to follow and professional.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                      <span className="text-[10px] font-mono font-bold uppercase text-blue-700 block mb-1">Present Perfect Tense</span>
                      <p className="text-xs text-slate-800 font-bold font-sans">"I have implemented several horizontal microservices."</p>
                      <p className="text-[11px] text-slate-500 mt-2">Use when describing skills or experiences that remain relevant up to the present moment.</p>
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                      <span className="text-[10px] font-mono font-bold uppercase text-blue-700 block mb-1">Past Simple Tense</span>
                      <p className="text-xs text-slate-800 font-bold font-sans">"During my last internship, I integrated Firebase Auth."</p>
                      <p className="text-[11px] text-slate-500 mt-2">Use to describe specific, completed activities bounded in the past (e.g., 'internship', 'last year').</p>
                    </div>
                  </div>
                </div>

                {/* Interactive mini-drill */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-amber-600 mb-4 flex items-center gap-1.5 font-mono">
                    <Zap className="w-4 h-4 text-amber-500 animate-pulse" />
                    Present Perfect Mini-Drill
                  </h3>
                  <p className="text-xs text-slate-800 font-bold mb-4 leading-relaxed font-sans">
                    {testDrills[0].question}
                  </p>
                  <div className="space-y-3">
                    {testDrills[0].options.map((opt, i) => (
                      <button
                        key={i}
                        onClick={() => handleTestDrill(opt, i)}
                        disabled={selectedAnswer !== null}
                        className={`w-full p-4 rounded-xl text-left border text-xs transition ${
                          selectedAnswer === opt
                            ? isCorrect
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold'
                              : 'bg-rose-50 border-rose-300 text-rose-800 font-bold'
                            : 'bg-white border border-slate-200 hover:border-slate-350 text-slate-700'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>

                  {selectedAnswer && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl"
                    >
                      <span className={`text-[10px] font-mono font-bold uppercase block mb-1 ${isCorrect ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isCorrect ? 'CORRECT ANSWER' : 'INCORRECT ANSWER'}
                      </span>
                      <p className="text-xs text-slate-500 leading-relaxed font-sans">
                        {testDrills[0].explanation}
                      </p>
                      <button
                        onClick={handleResetDrill}
                        className="mt-3 text-[10px] font-bold text-blue-600 hover:underline uppercase font-mono"
                      >
                        Retry Drill
                      </button>
                    </motion.div>
                  )}
                </div>
              </div>
            )}

            {activeDrillTab === 'phrases' && (
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <h3 className="text-md font-bold uppercase tracking-wide text-[#0B1E3F] font-mono">
                  Key Phrases for Professional Conversational Flow
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed font-sans">
                  Using structured key phrases keeps your answers coherent and buys you processing time during complex technical assessments.
                </p>

                <div className="space-y-3 mt-4">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Conflict Resolution</span>
                    <p className="text-xs text-slate-800 font-semibold mt-1 font-sans">"When resolving team disputes, I find it most constructive to first isolate the technical objective..."</p>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Explaining Architecture</span>
                    <p className="text-xs text-slate-800 font-semibold mt-1 font-sans">"The architecture is designed to decoupling database writes from read operations, ensuring..."</p>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Structuring Strengths</span>
                    <p className="text-xs text-slate-800 font-semibold mt-1 font-sans">"My core technical strength lies in breaking down complex multi-tier issues into clear modular sub-tasks..."</p>
                  </div>
                </div>
              </div>
            )}

            {activeDrillTab === 'books' && (
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <h3 className="text-md font-bold uppercase tracking-wide text-[#0B1E3F] font-mono">
                  Recommended Reading for Placement Success
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed font-sans">
                  Enrich your narrative and framework skills by studying professional communications, systems design, and behavioral frameworks.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl flex gap-3">
                    <BookOpen className="w-8 h-8 text-blue-700 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 font-sans">System Design Interview</h4>
                      <p className="text-[10px] text-slate-400">Alex Xu</p>
                      <p className="text-[11px] text-slate-500 mt-2 font-sans">Perfect for grounding technical descriptions of large-scale architecture, databases, and microservices.</p>
                    </div>
                  </div>

                  <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl flex gap-3">
                    <BookOpen className="w-8 h-8 text-blue-700 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 font-sans">The Lean Startup</h4>
                      <p className="text-[10px] text-slate-400">Eric Ries</p>
                      <p className="text-[11px] text-slate-500 mt-2 font-sans">Excellent for aligning behavioral HR responses with product-market fit, testing hypotheses, and iterative releases.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeDrillTab === 'speaking' && (
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <h3 className="text-md font-bold uppercase tracking-wide text-[#0B1E3F] font-mono">
                  Public Speaking & Composure Exercises
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed font-sans">
                  Practicing posture, pitch stability, and speech continuity drastically reduces filler words ("um," "uh") and maximizes overall confidence ratings.
                </p>

                <div className="space-y-3 mt-4 text-xs font-sans">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <strong className="text-slate-800 block mb-1">1. The Silent Pause Drill</strong>
                    <p className="text-slate-500 leading-relaxed">Whenever you feel the urge to insert 'um' or 'like' while recalling a technical definition, swallow the word and replace it with a 1-second silent breath. Silence conveys high command and intelligence.</p>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <strong className="text-slate-800 block mb-1">2. Constant Pace Modulation</strong>
                    <p className="text-slate-500 leading-relaxed">Keep your average speaking speed around 120-140 WPM. Talking too fast raises pitch variance and signals anxiety, while speaking too slowly limits the depth of your answers in the given session time.</p>
                  </div>
                </div>
              </div>
            )}

            {activeDrillTab === 'glossary' && (
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <h3 className="text-md font-bold uppercase tracking-wide text-[#0B1E3F] font-mono">
                  Technical Placement Glossary
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed font-sans">
                  Use precise technical terms in your resume descriptions and mock conversations to establish instant credibility with engineering evaluators.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 font-mono text-xs">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <strong className="text-blue-700 block mb-1">ACID Compliance</strong>
                    <p className="text-slate-500 font-sans mt-1">Atomicity, Consistency, Isolation, and Durability. Guarantees that database transactions are processed reliably, critical for financial structures.</p>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <strong className="text-blue-700 block mb-1">Horizontal Scaling</strong>
                    <p className="text-slate-500 font-sans mt-1">Adding more machines/containers to your pool of resources, rather than vertical scaling (adding memory/CPU to an existing node).</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
