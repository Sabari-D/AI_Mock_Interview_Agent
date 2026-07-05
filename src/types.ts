export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'candidate';
  createdAt: string;
  isBanned: boolean;
}

export interface Resume {
  id: string;
  userId: string;
  fileName: string;
  parsedText: string;
  uploadedAt: string;
  chunks?: { text: string; embedding?: number[] }[];
}

export type InterviewType = 'general_hr' | 'technical_hr';

export interface InterviewSession {
  id: string;
  userId: string;
  type: InterviewType;
  startedAt: string;
  endedAt?: string;
  status: 'active' | 'completed';
}

export interface TurnMetrics {
  pronunciationScore: number; // 0-100
  grammarScore: number;       // 0-100
  fluencyScore: number;       // 0-100
  vocabularyScore: number;     // 0-100
  confidenceScore: number;    // 0-100
  wpm: number;
  fillerCount: number;
}

export interface InterviewTurn {
  id: string;
  sessionId: string;
  question: string;
  answerTranscript: string;
  timestamp: string;
  metrics?: TurnMetrics;
  feedback?: {
    grammarCorrections?: string;
    vocabularySuggestions?: string;
    generalComment?: string;
  };
}

export interface SessionReport {
  id: string;
  sessionId: string;
  overallScores: TurnMetrics;
  recommendationsText: string;
  generatedAt: string;
}

export interface Streak {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string; // YYYY-MM-DD
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  totalScore: number;
  sessionsCount: number;
  currentStreak: number;
}

export interface Achievement {
  id: string;
  userId: string;
  type: string;
  title: string;
  description: string;
  awardedAt: string;
}

export interface DailyActivityLog {
  userId: string;
  date: string; // YYYY-MM-DD
  timeSpentMinutes: number;
  sessionsCount: number;
}

export interface VocabularyWord {
  word: string;
  meaning: string;
  example: string;
  category: string;
}
