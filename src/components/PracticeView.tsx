import React, { useState, useEffect, useRef } from 'react';
import { UserCheck, Code, Upload, Mic, MicOff, Play, CheckCircle2, ChevronRight, HelpCircle, Sparkles, Loader2, Award, ArrowLeft, RefreshCw, Volume2, VolumeX } from 'lucide-react';
import { motion } from 'motion/react';

interface PracticeViewProps {
  onNavigate: (view: string) => void;
  onRefreshStats: () => void;
}

export default function PracticeView({ onNavigate, onRefreshStats }: PracticeViewProps) {
  // Session Configuration State
  const [selectedType, setSelectedType] = useState<'general_hr' | 'technical_hr'>('general_hr');
  const [resumeText, setResumeText] = useState('');
  const [resumeFileName, setResumeFileName] = useState('');
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [isResumeSaved, setIsResumeSaved] = useState(false);

  // Active Simulation State
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(1);
  const [interviewerQuestion, setInterviewerQuestion] = useState('');
  const [userTranscript, setUserTranscript] = useState('');
  const [isFinished, setIsFinished] = useState(false);
  
  // Speech & Voice State
  const [isListening, setIsListening] = useState(false);
  const [speakingTimeSec, setSpeakingTimeSec] = useState(0);
  const [voiceMode, setVoiceMode] = useState<'system' | 'ai' | 'mute'>('system');
  const [isSpeakingInterviewer, setIsSpeakingInterviewer] = useState(false);

  // Analytical Pipeline States
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [latestAnalysis, setLatestAnalysis] = useState<any>(null);

  // HTML Audio & Timing References
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load user resume state on start
  useEffect(() => {
    fetch('/api/resume')
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error();
      })
      .then((data) => {
        setResumeFileName(data.fileName);
        setResumeText(data.parsedText);
        setIsResumeSaved(true);
      })
      .catch(() => {
        setIsResumeSaved(false);
      });
  }, []);

  // Cleanup speech systems on unmount
  useEffect(() => {
    return () => {
      stopVoiceInput();
      stopSystemVoice();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ==========================================
  // RESUME UPLOAD LOGIC
  // ==========================================

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      processResumeFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processResumeFile(file);
    }
  };

  const processResumeFile = (file: File) => {
    setResumeFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setResumeText(text || '');
      setIsResumeSaved(false);
    };
    reader.readAsText(file);
  };

  const handleSaveResume = async () => {
    if (!resumeText) return;
    setIsUploadingResume(true);
    try {
      const res = await fetch('/api/resume/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: resumeFileName, textContent: resumeText }),
      });
      if (res.ok) {
        setIsResumeSaved(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploadingResume(false);
    }
  };

  const handleDeleteResume = async () => {
    if (!window.confirm("Are you sure you want to remove your uploaded resume?")) return;
    setIsUploadingResume(true);
    try {
      const res = await fetch('/api/resume', { method: 'DELETE' });
      if (res.ok) {
        setResumeFileName('');
        setResumeText('');
        setIsResumeSaved(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploadingResume(false);
    }
  };

  // ==========================================
  // INTERVIEW CONTEXT & START LOGIC
  // ==========================================

  const handleStartSimulation = async () => {
    setIsAnalyzing(true);
    setIsFinished(false);
    setLatestAnalysis(null);
    setCurrentTurnIndex(1);
    setUserTranscript('');

    try {
      const res = await fetch('/api/interview/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: selectedType }),
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentSessionId(data.session.id);
        setInterviewerQuestion(data.greeting);
        setIsSimulating(true);
        triggerVoicePlay(data.greeting);
      } else {
        alert(data.error || 'Failed to start interview.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ==========================================
  // SPEECH SYNTHESIS LOGIC (Interviewer Speaks)
  // ==========================================

  const triggerVoicePlay = async (textToSpeak: string) => {
    stopSystemVoice();
    if (voiceMode === 'mute') return;

    if (voiceMode === 'ai') {
      setIsSpeakingInterviewer(true);
      try {
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: textToSpeak,
            voice: selectedType === 'general_hr' ? 'Kore' : 'Zephyr',
          }),
        });
        const data = await response.json();
        if (response.ok && data.audio) {
          const audioUrl = `data:audio/wav;base64,${data.audio}`;
          const audio = new Audio(audioUrl);
          audio.onended = () => setIsSpeakingInterviewer(false);
          await audio.play();
          return;
        }
      } catch (err) {
        console.error('Gemini TTS failed, falling back to System SpeechSynthesis:', err);
      }
    }

    // Fallback or selection: System Speech Synthesis
    if ('speechSynthesis' in window) {
      setIsSpeakingInterviewer(true);
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      // Select appropriate voice based on selected recruiter profile
      const voices = window.speechSynthesis.getVoices();
      if (selectedType === 'general_hr') {
        // Find a warm female system voice
        const femaleVoice = voices.find(v =>
          v.name.toLowerCase().includes('female') ||
          v.name.toLowerCase().includes('samantha') ||
          v.name.toLowerCase().includes('zira') ||
          v.name.toLowerCase().includes('hazel') ||
          v.name.toLowerCase().includes('google us english')
        );
        if (femaleVoice) utterance.voice = femaleVoice;
      } else {
        // Precise male voice
        const maleVoice = voices.find(v =>
          v.name.toLowerCase().includes('male') ||
          v.name.toLowerCase().includes('daniel') ||
          v.name.toLowerCase().includes('david') ||
          v.name.toLowerCase().includes('google uk english male')
        );
        if (maleVoice) utterance.voice = maleVoice;
      }
      utterance.rate = 1.0;
      utterance.onend = () => setIsSpeakingInterviewer(false);
      utterance.onerror = () => setIsSpeakingInterviewer(false);
      speechUtteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    }
  };

  const stopSystemVoice = () => {
    setIsSpeakingInterviewer(false);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  // ==========================================
  // SPEECH RECOGNITION LOGIC (Candidate Speaks)
  // ==========================================

  const startVoiceInput = () => {
    stopSystemVoice();
    setUserTranscript('');
    setIsListening(true);
    setSpeakingTimeSec(0);

    // Keep track of speaking duration
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSpeakingTimeSec((prev) => prev + 1);
    }, 1000);

    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionClass) {
      const rec = new SpeechRecognitionClass();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onresult = (e: any) => {
        let finalTrans = '';
        for (let i = e.resultIndex; i < e.results.length; ++i) {
          if (e.results[i].isFinal) {
            finalTrans += e.results[i][0].transcript + ' ';
          }
        }
        if (finalTrans) {
          setUserTranscript((prev) => prev + finalTrans);
        }
      };

      rec.onerror = (err: any) => {
        console.error('Speech recognition error:', err);
      };

      rec.onend = () => {
        // Restart if they are still listening
        if (isListening) {
          try { rec.start(); } catch (e) {}
        }
      };

      recognitionRef.current = rec;
      rec.start();
    } else {
      // Fallback message for unsupported browsers or missing permissions
      setUserTranscript("SpeechRecognition API not accessible. Please type your placement response in the transcript textbox.");
    }
  };

  const stopVoiceInput = () => {
    setIsListening(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
  };

  // ==========================================
  // ANSWER SUBMISSION & ANALYSIS PIPELINE
  // ==========================================

  const handleSubmitAnswer = async () => {
    stopVoiceInput();
    if (!userTranscript.trim() || !currentSessionId) return;

    setIsAnalyzing(true);
    setLatestAnalysis(null);

    try {
      const response = await fetch('/api/interview/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: currentSessionId,
          answerText: userTranscript,
          durationMs: speakingTimeSec * 1000,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setLatestAnalysis(data.analysis);
        setInterviewerQuestion(data.nextQuestion);
        setIsFinished(data.isFinished);
        setUserTranscript('');
        
        if (!data.isFinished) {
          setCurrentTurnIndex((prev) => prev + 1);
          triggerVoicePlay(data.nextQuestion);
        } else {
          // Trigger concluding sequence
          triggerVoicePlay(data.nextQuestion);
        }
      } else {
        alert(data.error || 'Failed to analyze response.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleEndInterview = async () => {
    stopVoiceInput();
    stopSystemVoice();
    if (!currentSessionId) {
      setIsSimulating(false);
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/interview/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: currentSessionId }),
      });
      if (response.ok) {
        setIsFinished(true);
      } else {
        alert('Failed to end interview.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ==========================================
  // UI VIEW RENDERS
  // ==========================================

  // Render Setup / Launch screen
  if (!isSimulating) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center pb-4 border-b border-slate-200">
          <h2 className="text-xl font-extrabold text-[#0B1E3F] tracking-tight font-display">
            Interview Prep Room
          </h2>
          <button
            onClick={() => onNavigate('dashboard')}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 px-3 py-1.5 rounded-lg bg-white cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Persona selector Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-blue-750 mb-4 font-mono">
                Choose Interview Agent
              </h3>
              <div className="grid grid-cols-1 gap-4">
                <button
                  onClick={() => setSelectedType('general_hr')}
                  className={`p-5 rounded-xl border text-left transition duration-200 cursor-pointer ${
                    selectedType === 'general_hr'
                      ? 'bg-blue-50/50 border-blue-500 ring-1 ring-blue-500/25'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-600">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#0B1E3F]">Sarah (General HR)</h4>
                      <p className="text-xs text-slate-600 mt-1">Behavioral, soft-skills, situational questions tailored to placement criteria.</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setSelectedType('technical_hr')}
                  className={`p-5 rounded-xl border text-left transition duration-200 cursor-pointer ${
                    selectedType === 'technical_hr'
                      ? 'bg-blue-50/50 border-blue-500 ring-1 ring-blue-500/25'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-600">
                      <Code className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#0B1E3F]">Alex (Technical HR)</h4>
                      <p className="text-xs text-slate-600 mt-1">Strictly resume-grounded questions targeting your projects, tools, and technical tools.</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <div className="mt-8 border-t border-slate-100 pt-6">
              <button
                onClick={handleStartSimulation}
                className="w-full py-3 text-sm font-semibold uppercase tracking-wider bg-[#0B1E3F] hover:bg-blue-800 text-white rounded-xl transition duration-200 shadow-md cursor-pointer active:scale-95"
              >
                Launch Live Interview Session
              </button>
            </div>
          </div>

          {/* Resume Upload / Verification Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-blue-750 font-mono">
                  Grounded Resume Base
                </h3>
                {isResumeSaved ? (
                  <span className="text-[10px] font-mono font-bold bg-emerald-50 border border-emerald-200 text-emerald-750 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Grounded
                  </span>
                ) : (
                  <span className="text-[10px] font-mono font-bold bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 rounded-full">
                    Required for Tech
                  </span>
                )}
              </div>

              {/* Drag Drop Area */}
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="border-2 border-dashed border-slate-200 bg-slate-50 rounded-xl p-6 text-center hover:border-slate-350 transition duration-200 cursor-pointer relative"
              >
                <input
                  type="file"
                  id="resumeFile"
                  accept=".txt,.md,.json"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-3" />
                <h4 className="text-xs font-bold text-slate-700">
                  Drag & Drop Resume text file (.txt/.md)
                </h4>
                <p className="text-[10px] text-slate-500 mt-1">
                  Or click here to browse files.
                </p>
              </div>

              {resumeFileName && (
                <div className="mt-3 text-xs text-slate-700 font-mono bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg flex justify-between items-center">
                  <span className="truncate">{resumeFileName}</span>
                  <span className="text-slate-500 shrink-0">{Math.round((resumeText || '').length / 1024)} KB</span>
                </div>
              )}

              {/* Editable paste textbox */}
              <div className="mt-4">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest block mb-2 font-mono">
                  Paste / Edit Resume Content Directly:
                </label>
                <textarea
                  value={resumeText || ''}
                  onChange={(e) => {
                    setResumeText(e.target.value);
                    setIsResumeSaved(false);
                    if (!resumeFileName) setResumeFileName('resume_content.txt');
                  }}
                  placeholder="Paste your skills, languages, professional experience, projects, or certifications here..."
                  className="w-full h-32 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-slate-400 font-mono resize-none leading-relaxed"
                ></textarea>
              </div>
            </div>

            <div className="mt-6 border-t border-slate-100 pt-6 flex gap-3">
              {isResumeSaved && (
                <button
                  onClick={handleDeleteResume}
                  disabled={isUploadingResume}
                  className="px-4 py-2.5 text-xs font-semibold uppercase border border-rose-250 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:border-rose-300 transition duration-200 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-95 shrink-0"
                >
                  Remove
                </button>
              )}
              <button
                onClick={handleSaveResume}
                disabled={isUploadingResume || !resumeText || isResumeSaved}
                className="flex-1 py-2.5 text-xs font-semibold uppercase border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition duration-200 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-95"
              >
                {isUploadingResume ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> Vectorizing Resume...
                  </>
                ) : (
                  <>Save Grounded Resume Content</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active Interview Simulation View
  return (
    <div className="space-y-6">
      {/* Simulation Header */}
      <div className="flex justify-between items-center pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <span className="px-2.5 py-1 text-[10px] font-bold font-mono uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
            Turn {currentTurnIndex} / 5
          </span>
          <span className="text-slate-300">|</span>
          <h2 className="text-md font-bold text-[#0B1E3F] flex items-center gap-2 font-display">
            <Sparkles className="w-4 h-4 text-blue-600" />
            {selectedType === 'general_hr' ? 'Sarah (General HR)' : 'Alex (Technical HR)'}
          </h2>
        </div>
        
        {/* Toggle voice modes & End interview */}
        <div className="flex items-center gap-3 font-mono">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setVoiceMode('system')}
              className={`p-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                voiceMode === 'system' ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-900/10' : 'bg-white text-slate-600 border-slate-200 hover:text-slate-800 hover:border-slate-300'
              }`}
              title="System Voice"
            >
              <Volume2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setVoiceMode('ai')}
              className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold tracking-wider uppercase transition cursor-pointer ${
                voiceMode === 'ai' ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-900/10' : 'bg-white text-slate-600 border-slate-200 hover:text-slate-800 hover:border-slate-300'
              }`}
              title="Premium AI Voice via Gemini TTS"
            >
              AI Voice
            </button>
            <button
              onClick={() => {
                setVoiceMode('mute');
                stopSystemVoice();
              }}
              className={`p-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                voiceMode === 'mute' ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-900/10' : 'bg-white text-slate-600 border-slate-200 hover:text-slate-800 hover:border-slate-300'
              }`}
              title="Mute Interrogator"
            >
              <VolumeX className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleEndInterview}
            className="px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg transition duration-150 flex items-center gap-1 cursor-pointer"
          >
            End Interview
          </button>
        </div>
      </div>

      {/* Recruiter Avatar and Question Prompt */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl"></div>
        <div className="flex gap-4 items-start">
          <div className={`w-14 h-14 rounded-full border flex items-center justify-center font-bold text-lg shrink-0 ${
            isSpeakingInterviewer ? 'border-blue-500 bg-blue-50 text-blue-600 animate-pulse' : 'border-slate-200 bg-slate-50 text-slate-600'
          }`}>
            {selectedType === 'general_hr' ? 'SH' : 'AX'}
          </div>
          <div>
            <span className="text-[9px] font-mono tracking-widest text-slate-400 uppercase block font-bold mb-1">
              {selectedType === 'general_hr' ? 'Sarah • Senior Recruiter' : 'Alex • Technical Evaluator'}
            </span>
            <p className="text-sm text-[#0B1E3F] leading-relaxed font-sans font-bold">
              {interviewerQuestion}
            </p>
            {isSpeakingInterviewer && (
              <div className="flex gap-1.5 mt-3 items-center text-[10px] text-blue-600 font-mono font-semibold">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Synthesizing premium AI voice track...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active Recording and Speech Wave indicator */}
      {!isFinished ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* User speech container */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-blue-700 mb-4 font-mono">
                Your Spoken Answer
              </h3>

              {isListening && (
                <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl mb-4 animate-pulse">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-4 bg-blue-600 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-6 bg-blue-600 rounded-full animate-bounce delay-100"></span>
                    <span className="w-1.5 h-3 bg-blue-600 rounded-full animate-bounce delay-200"></span>
                    <span className="w-1.5 h-5 bg-blue-600 rounded-full animate-bounce delay-300"></span>
                  </div>
                  <span className="text-xs text-blue-700 font-mono font-semibold">
                    Live mic input recording: {speakingTimeSec}s
                  </span>
                </div>
              )}

              {/* Real-time transcript box */}
              <textarea
                value={userTranscript}
                onChange={(e) => setUserTranscript(e.target.value)}
                placeholder="Click the mic icon to dictate your answer or type in this box..."
                className="w-full h-32 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-slate-400 font-mono leading-relaxed"
              ></textarea>
            </div>

            <div className="mt-6 flex gap-3">
              {isListening ? (
                <button
                  onClick={stopVoiceInput}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold uppercase tracking-wider rounded-xl transition duration-200 flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  <MicOff className="w-4 h-4 fill-current" /> Stop Dictating
                </button>
              ) : (
                <button
                  onClick={startVoiceInput}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold uppercase tracking-wider rounded-xl transition duration-200 flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  <Mic className="w-4 h-4 fill-current" /> Activate Microphone
                </button>
              )}

              <button
                onClick={handleSubmitAnswer}
                disabled={!userTranscript.trim() || isAnalyzing}
                className="px-6 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 disabled:opacity-40 font-semibold text-xs uppercase rounded-xl transition duration-200 flex items-center gap-1.5 cursor-pointer"
              >
                {isAnalyzing ? (
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                ) : (
                  <>Submit Answer <ChevronRight className="w-4 h-4" /></>
                )}
              </button>
            </div>
          </div>

          {/* Real-time Analytical feedback scorecard */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-blue-700 mb-4 flex items-center gap-2 font-mono">
                Real-Time Analytical Signal
              </h3>

              {isAnalyzing ? (
                /* Skeleton loader while fetching scores */
                <div className="space-y-4 animate-pulse">
                  <div className="h-4 bg-slate-100 rounded-md w-3/4"></div>
                  <div className="h-3 bg-slate-100 rounded-md w-1/2"></div>
                  <div className="h-20 bg-slate-100 rounded-xl w-full"></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-10 bg-slate-100 rounded-xl"></div>
                    <div className="h-10 bg-slate-100 rounded-xl"></div>
                  </div>
                </div>
              ) : latestAnalysis ? (
                /* Actual rendered metrics */
                <div className="space-y-4">
                  {/* Metric Bars */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                      <span className="text-[9px] font-mono tracking-widest text-slate-500 uppercase block font-bold">Pronunciation</span>
                      <span className="text-lg font-extrabold text-blue-600">{latestAnalysis.metrics.pronunciationScore}%</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                      <span className="text-[9px] font-mono tracking-widest text-slate-500 uppercase block font-bold">Grammar</span>
                      <span className="text-lg font-extrabold text-blue-600">{latestAnalysis.metrics.grammarScore}%</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                      <span className="text-[9px] font-mono tracking-widest text-slate-500 uppercase block font-bold">Fluency</span>
                      <span className="text-lg font-extrabold text-blue-600">{latestAnalysis.metrics.fluencyScore}%</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                      <span className="text-[9px] font-mono tracking-widest text-slate-500 uppercase block font-bold">Confidence</span>
                      <span className="text-lg font-extrabold text-blue-600">{latestAnalysis.metrics.confidenceScore}%</span>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest mb-1 font-mono">Expert Critiques</h4>
                    <p className="text-xs text-slate-600 leading-relaxed italic">
                      "{latestAnalysis.feedback.generalComment}"
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50">
                  <HelpCircle className="w-8 h-8 mb-2" />
                  <p className="text-xs font-mono font-semibold">Awaiting speech metrics submission</p>
                </div>
              )}
            </div>

            {latestAnalysis && (
              <div className="mt-4 text-[10px] font-mono text-slate-500 flex justify-between">
                <span>Speed: <strong className="text-slate-700">{latestAnalysis.metrics.wpm} WPM</strong></span>
                <span>Fillers: <strong className="text-slate-700">{latestAnalysis.metrics.fillerCount} counts</strong></span>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Completion sequence / Report compilation */
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-md max-w-xl mx-auto"
        >
          <Award className="w-16 h-16 text-amber-500 mx-auto mb-4 animate-bounce" />
          <h3 className="text-2xl font-extrabold text-[#0B1E3F] tracking-tight leading-none mb-2 font-display">
            Interview Complete!
          </h3>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            Congratulations! You've successfully completed the 5 mock interview rounds. Your detailed scoring matrix, performance transcripts, and downloadable certification eligibility logs are compiled on your placement registry dashboard.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                onRefreshStats();
                onNavigate('history');
              }}
              className="px-6 py-3 text-xs font-semibold tracking-wider uppercase bg-[#0B1E3F] hover:bg-blue-800 text-white rounded-xl transition duration-200 shadow-md cursor-pointer active:scale-95"
            >
              Analyze Placement Report
            </button>
            <button
              onClick={() => setIsSimulating(false)}
              className="px-6 py-3 text-xs font-semibold tracking-wider uppercase border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition duration-200 rounded-xl cursor-pointer"
            >
              Practice Again
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
