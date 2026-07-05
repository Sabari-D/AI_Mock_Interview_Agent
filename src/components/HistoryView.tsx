import React, { useEffect, useState } from 'react';
import { Award, FileText, ChevronRight, Loader2, ArrowLeft, Download, Printer, User, BrainCircuit } from 'lucide-react';
import { motion } from 'motion/react';

interface HistoryViewProps {
  onNavigate: (view: string) => void;
}

export default function HistoryView({ onNavigate }: HistoryViewProps) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [reportDetails, setReportDetails] = useState<any>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);

  useEffect(() => {
    fetch('/api/interview/sessions')
      .then((res) => res.json())
      .then((data) => {
        setSessions(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setIsLoading(false);
      });
  }, []);

  const handleOpenReport = async (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setIsLoadingReport(true);
    setReportDetails(null);
    try {
      const res = await fetch(`/api/interview/sessions/${sessionId}/report`);
      const data = await res.json();
      if (res.ok) {
        setReportDetails(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingReport(false);
    }
  };

  const triggerPrintReport = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-[#0B1E3F]">
        <Loader2 className="w-8 h-8 animate-spin text-[#0B1E3F] mr-2" />
        <span className="font-mono font-bold uppercase tracking-wider text-xs">Loading sessions registry...</span>
      </div>
    );
  }

  if (selectedSessionId) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center pb-4 border-b border-slate-200">
          <button
            onClick={() => {
              setSelectedSessionId(null);
              setReportDetails(null);
            }}
            className="text-xs font-bold text-slate-500 hover:text-[#0B1E3F] flex items-center gap-1 border border-slate-200 px-3 py-1.5 rounded-lg bg-white shadow-sm cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to History
          </button>

          {reportDetails && (
            <button
              onClick={triggerPrintReport}
              className="text-xs font-bold bg-[#0B1E3F] hover:bg-[#1E3A8A] text-white flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-mono tracking-wider uppercase shadow-md transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" /> Print / Save Report
            </button>
          )}
        </div>

        {isLoadingReport ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
            <span className="font-mono font-bold uppercase tracking-widest text-xs">Compiling Placement Assessment...</span>
          </div>
        ) : reportDetails ? (
          /* Report details view styled for screen and printing */
          <div className="space-y-6 print:bg-white print:text-slate-950 print:p-8 rounded-3xl" id="printable-report">
            {/* Header block */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm print:bg-white print:border-none print:shadow-none">
              <div className="flex flex-wrap justify-between items-start gap-4">
                <div>
                  <h1 className="text-2xl font-black text-[#0B1E3F] print:text-slate-950 tracking-tight mb-1 font-display">
                    Placement Mock Assessment Report
                  </h1>
                  <p className="text-xs text-slate-500 print:text-slate-500 font-mono">
                    Session ID: {reportDetails.session.id} | Type: {reportDetails.session.type === 'general_hr' ? 'General HR (Behavioral)' : 'Technical HR (Resume-Grounded)'}
                  </p>
                </div>
                <div className="text-right print:text-left">
                  <span className="px-3 py-1 text-[10px] font-bold font-mono uppercase tracking-wider bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full inline-block">
                    Session Completed
                  </span>
                  <p className="text-xs text-slate-400 print:text-slate-600 font-mono mt-1">
                    Generated: {new Date(reportDetails.report.generatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Score matrix breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 print:grid-cols-5">
              <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm text-center print:bg-white print:border-slate-300">
                <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase block font-bold">Pronunciation</span>
                <span className="text-2xl font-black text-blue-700 print:text-blue-600 block mt-1 font-display">
                  {reportDetails.report.overallScores.pronunciationScore}%
                </span>
              </div>
              <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm text-center print:bg-white print:border-slate-300">
                <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase block font-bold">Grammar</span>
                <span className="text-2xl font-black text-blue-700 print:text-blue-600 block mt-1 font-display">
                  {reportDetails.report.overallScores.grammarScore}%
                </span>
              </div>
              <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm text-center print:bg-white print:border-slate-300">
                <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase block font-bold">Fluency</span>
                <span className="text-2xl font-black text-blue-700 print:text-blue-600 block mt-1 font-display">
                  {reportDetails.report.overallScores.fluencyScore}%
                </span>
              </div>
              <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm text-center print:bg-white print:border-slate-300">
                <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase block font-bold">Vocabulary</span>
                <span className="text-2xl font-black text-blue-700 print:text-blue-600 block mt-1 font-display">
                  {reportDetails.report.overallScores.vocabularyScore}%
                </span>
              </div>
              <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm text-center print:bg-white print:border-slate-300">
                <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase block font-bold">Confidence</span>
                <span className="text-2xl font-black text-blue-700 print:text-blue-600 block mt-1 font-display">
                  {reportDetails.report.overallScores.confidenceScore}%
                </span>
              </div>
            </div>

            {/* Recommendations Content */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm print:bg-white print:border-none print:shadow-none print:p-0">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#0B1E3F] print:text-blue-600 mb-4 flex items-center gap-2 font-mono">
                <BrainCircuit className="w-4 h-4 text-blue-600" />
                Interviewer Assessment & Placement Feedback
              </h2>
              {/* Render custom markdown details */}
              <div className="text-xs text-slate-600 print:text-slate-850 leading-relaxed space-y-4 font-sans whitespace-pre-line border-b border-slate-100 pb-6 mb-6">
                {reportDetails.report.recommendationsText}
              </div>

              {/* Certificate of achievement note if applicable */}
              {reportDetails.report.overallScores.pronunciationScore >= 50 &&
              reportDetails.report.overallScores.grammarScore >= 50 &&
              reportDetails.report.overallScores.fluencyScore >= 50 &&
              reportDetails.report.overallScores.vocabularyScore >= 50 &&
              reportDetails.report.overallScores.confidenceScore >= 50 ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex gap-4 items-center print:border-slate-300 print:bg-slate-50">
                  <div className="p-3 bg-emerald-600 text-white rounded-xl shrink-0 shadow-sm">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-emerald-800 print:text-slate-950">Certificate of Placement Readiness Unlocked</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-normal">
                      Exceptional! Since all five core dimensions scored ≥50% in this session, you have unlocked the Placement readiness credential.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200/60 rounded-2xl p-4 text-[11px] text-amber-800">
                  Note: Reach scores of ≥50% across all five dimensions in a single session to unlock your printable Certificate of Placement Readiness.
                </div>
              )}
            </div>

            {/* Conversation Transcript */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm print:bg-white print:border-none print:shadow-none print:p-0">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#0B1E3F] print:text-sky-600 mb-4 flex items-center gap-2 font-mono">
                <FileText className="w-4 h-4 text-blue-600" />
                Performance Q&A Transcript
              </h2>
              <div className="space-y-4 font-mono text-xs">
                {reportDetails.turns.map((turn: any, index: number) => (
                  <div key={turn.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 print:bg-slate-50 print:border-slate-200">
                    <div className="flex justify-between text-[10px] text-slate-400 font-bold border-b border-slate-150 pb-1.5 mb-1.5 print:border-slate-200 print:text-slate-600">
                      <span>ROUND {index + 1}</span>
                      {turn.metrics && (
                        <span>WPM: {turn.metrics.wpm} | Fillers: {turn.metrics.fillerCount} counts</span>
                      )}
                    </div>
                    <p className="text-slate-800"><strong className="text-blue-700">Sarah/Alex:</strong> {turn.question}</p>
                    {turn.answerTranscript ? (
                      <p className="text-slate-600 mt-2 pl-4 border-l-2 border-slate-200"><strong className="text-slate-800">Your Answer:</strong> {turn.answerTranscript}</p>
                    ) : (
                      <p className="text-slate-400 italic">No answer submitted for this turn.</p>
                    )}
                    {turn.feedback && (
                      <div className="mt-3 pt-2 border-t border-slate-200 text-[11px] space-y-1 bg-white border border-slate-100 p-3 rounded-lg">
                        <p><strong className="text-rose-600 font-sans">Grammar Critique:</strong> {turn.feedback.grammarCorrections}</p>
                        <p><strong className="text-emerald-600 font-sans">Vocab Suggestions:</strong> {turn.feedback.vocabularySuggestions}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center pb-4 border-b border-slate-200">
        <h2 className="text-xl font-black text-[#0B1E3F] tracking-tight font-display">
          Performance Histories
        </h2>
        <span className="text-xs text-slate-400 font-mono">
          {sessions.length} completed interviews
        </span>
      </div>

      {sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 border border-dashed border-slate-200 rounded-3xl bg-white">
          <FileText className="w-12 h-12 mb-3 text-slate-300" />
          <h3 className="text-sm font-bold text-slate-500">No mock history available</h3>
          <p className="text-xs text-slate-400 mt-1 mb-4">Complete your first practice interview to generate transcripts and reports.</p>
          <button
            onClick={() => onNavigate('practice')}
            className="px-5 py-2.5 bg-[#0B1E3F] hover:bg-[#1E3A8A] text-white font-extrabold text-xs rounded-xl uppercase tracking-wider shadow-md active:scale-95 transition-all cursor-pointer"
          >
            Launch Prep Room
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {sessions.map((sess) => (
            <div
              key={sess.id}
              onClick={() => handleOpenReport(sess.id)}
              className="bg-white border border-slate-200 hover:border-[#0B1E3F]/40 hover:shadow-sm transition duration-150 rounded-2xl p-5 shadow-sm flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-blue-700">
                  <BrainCircuit className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                    {sess.type === 'general_hr' ? 'General HR Interview' : 'Resume Grounded Tech Interview'}
                  </h4>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Date: {new Date(sess.startedAt).toLocaleDateString()} | Session: {sess.id}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
