import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Modality } from '@google/genai';
import { db } from './server/db.js';
import { startSession, getNextQuestion, analyzeTurnSpeech } from './server/agents.js';
import { chunkAndEmbedResume } from './server/embeddings.js';
import { compileSessionReport } from './server/reports.js';
import { User, InterviewSession, InterviewTurn, Streak } from './src/types.js';

// Load environmental keys
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// A simple local session auth middleware
let currentUserSession: User | null = {
  id: 'user_1',
  username: 'Sabaridhandapani',
  email: 'sabaridhandapani69@gmail.com',
  role: 'admin',
  createdAt: new Date().toISOString(),
  isBanned: false,
};

// Active sessions tracking for real-time dashboard monitoring
const activeSessions = new Map<string, { userId: string; username: string; email: string; loginTime: string; lastSeen: string }>();

function trackSession(user: User) {
  if (!user) return;
  const existing = activeSessions.get(user.id);
  activeSessions.set(user.id, {
    userId: user.id,
    username: user.username,
    email: user.email,
    loginTime: existing ? existing.loginTime : new Date().toISOString(),
    lastSeen: new Date().toISOString()
  });
}

// Log user activity helper to feed the activity timeline
async function logUserActivity(userId: string, action: string, details: string) {
  try {
    await db.activityLogs.insertOne({
      userId,
      action,
      details,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    console.error('Error logging user activity:', e);
  }
}

// Initialize default administrator session
if (currentUserSession) {
  trackSession(currentUserSession);
}

// Extend global Express Request definition
declare global {
  namespace Express {
    interface Request {
      user: User | null;
    }
  }
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '10mb' }));

  app.use((req, res, next) => {
    req.user = currentUserSession;
    next();
  });

  // ==========================================
  // AUTHENTICATION ENDPOINTS
  // ==========================================

  app.post('/api/auth/register', async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const existing = await db.users.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: 'User with this email already exists.' });
    }

    const newUser = await db.users.insertOne({
      username,
      email,
      role: email.includes('admin') || email === 'sabaridhandapani69@gmail.com' ? 'admin' : 'candidate',
      createdAt: new Date().toISOString(),
      isBanned: false,
    });

    // Automatically initialize their streaks record
    await db.streaks.insertOne({
      userId: newUser.id,
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: '',
    });

    await logUserActivity(newUser.id, 'Account Registration', 'New candidate profile initialized.');

    currentUserSession = newUser;
    trackSession(newUser);
    res.status(201).json(newUser);
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await db.users.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials.' });
    }

    if (user.isBanned) {
      return res.status(403).json({ error: 'Your account has been suspended for placement malpractice.' });
    }

    await logUserActivity(user.id, 'User Authentication', 'Candidate logged in successfully.');

    currentUserSession = user;
    trackSession(user);
    res.json(user);
  });

  app.post('/api/auth/admin-bypass', async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Admin username, email, and password are required.' });
    }

    let user = await db.users.findOne({ email });
    if (!user) {
      user = await db.users.insertOne({
        username,
        email,
        role: 'admin',
        createdAt: new Date().toISOString(),
        isBanned: false,
      });

      // Automatically initialize their streaks record
      await db.streaks.insertOne({
        userId: user.id,
        currentStreak: 0,
        longestStreak: 0,
        lastActiveDate: '',
      });
    } else {
      // Ensure the user has the admin role
      if (user.role !== 'admin') {
        await db.users.updateOne({ id: user.id }, { role: 'admin' });
        user.role = 'admin';
      }
    }

    await logUserActivity(user.id, 'Admin Access Bypass', `Bypassed authentication as Administrator (${username}).`);

    currentUserSession = user;
    trackSession(user);
    res.json(user);
  });

  app.post('/api/auth/logout', (req, res) => {
    if (currentUserSession) {
      activeSessions.delete(currentUserSession.id);
    }
    currentUserSession = null;
    res.json({ success: true });
  });

  app.get('/api/auth/me', (req, res) => {
    if (req.user) {
      trackSession(req.user);
    }
    res.json(req.user);
  });

  // ==========================================
  // RESUME ENDPOINTS
  // ==========================================

  app.post('/api/resume/upload', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated.' });
    const { fileName, textContent } = req.body;

    if (!textContent) {
      return res.status(400).json({ error: 'Resume text is empty.' });
    }

    // Remove existing resume
    await db.resumes.deleteOne({ userId: req.user.id });

    // Parse and embed resume chunks
    const chunks = await chunkAndEmbedResume(textContent);

    const resume = await db.resumes.insertOne({
      userId: req.user.id,
      fileName: fileName || 'resume.txt',
      parsedText: textContent,
      uploadedAt: new Date().toISOString(),
      chunks,
    });

    await logUserActivity(req.user.id, 'Resume Upload', `Uploaded resume file "${fileName || 'resume.txt'}" (${Math.round(textContent.length / 1024)} KB)`);

    res.json({ success: true, resumeId: resume.id, chunksCount: chunks.length });
  });

  app.get('/api/resume', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated.' });
    const resume = await db.resumes.findOne({ userId: req.user.id });
    if (!resume) {
      return res.status(404).json({ error: 'No resume found.' });
    }
    res.json({
      id: resume.id,
      fileName: resume.fileName,
      uploadedAt: resume.uploadedAt,
      textLength: resume.parsedText.length,
    });
  });

  // ==========================================
  // INTERVIEW ENDPOINTS
  // ==========================================

  app.post('/api/interview/start', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated.' });
    const { type } = req.body; // 'general_hr' or 'technical_hr'

    if (type === 'technical_hr') {
      const resume = await db.resumes.findOne({ userId: req.user.id });
      if (!resume) {
        return res.status(400).json({ error: 'Please upload your resume in the dashboard before starting a Technical Interview.' });
      }
    }

    try {
      const { session, greeting } = await startSession(req.user.id, type);
      await logUserActivity(req.user.id, 'Interview Launch', `Started interview session (${type === 'general_hr' ? 'Sarah - General HR' : 'Alex - Technical Evaluation'})`);
      res.json({ session, greeting });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/interview/answer', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated.' });
    const { sessionId, answerText, durationMs } = req.body;

    if (!sessionId || answerText === undefined) {
      return res.status(400).json({ error: 'Session ID and answer text are required.' });
    }

    const session = await db.sessions.findOne({ id: sessionId });
    if (!session) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    try {
      // Find the latest turn that is waiting for an answer
      const turns = await db.turns.find({ sessionId });
      const activeTurn = turns[turns.length - 1];

      if (!activeTurn) {
        return res.status(400).json({ error: 'No active turn found for this session.' });
      }

      // 1. Analyze user speech
      const { metrics, feedback } = await analyzeTurnSpeech(activeTurn.question, answerText, durationMs || 30000);

      // 2. Update active turn with answer and analysis metrics
      await db.turns.updateOne({ id: activeTurn.id }, {
        answerTranscript: answerText,
        metrics,
        feedback,
      });

      // 3. Generate the next question ( Sarah / Alex )
      const { question, isFinished } = await getNextQuestion(sessionId, answerText);

      await logUserActivity(
        req.user.id,
        'Answer Submitted',
        `Answered round query (${answerText.length > 50 ? answerText.slice(0, 50) + '...' : answerText})`
      );

      res.json({
        analysis: { metrics, feedback },
        nextQuestion: question,
        isFinished,
      });
    } catch (err: any) {
      console.error('Error in interview/answer:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/interview/end', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated.' });
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required.' });
    }

    try {
      await db.sessions.updateOne({ id: sessionId }, {
        status: 'completed',
        endedAt: new Date().toISOString(),
      });
      await logUserActivity(req.user.id, 'Session Completed', 'Successfully completed a mockup round evaluation.');
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/interview/sessions', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated.' });
    const sessions = await db.sessions.find({ userId: req.user.id });
    res.json(sessions);
  });

  app.get('/api/interview/sessions/:sessionId', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated.' });
    const session = await db.sessions.findOne({ id: req.params.sessionId });
    if (!session) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    const turns = await db.turns.find({ sessionId: session.id });
    res.json({ session, turns });
  });

  app.get('/api/interview/sessions/:sessionId/report', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated.' });
    const sessionId = req.params.sessionId;

    try {
      const report = await compileSessionReport(sessionId);
      const session = await db.sessions.findOne({ id: sessionId });
      const turns = await db.turns.find({ sessionId });
      res.json({ report, session, turns });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/analytics/history', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated.' });
    try {
      const sessions = await db.sessions.find({ userId: req.user.id, status: 'completed' });
      const history = [];
      for (const s of sessions) {
        const report = await db.reports.findOne({ sessionId: s.id });
        history.push({
          id: s.id,
          type: s.type,
          startedAt: s.startedAt,
          report: report || null,
        });
      }
      res.json(history);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // DASHBOARD & LEADERBOARD ENDPOINTS
  // ==========================================

  app.get('/api/dashboard/stats', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated.' });
    const userId = req.user.id;

    const streak = (await db.streaks.findOne({ userId })) || {
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: '',
    };

    const achievements = await db.achievements.find({ userId });
    const reports = await db.reports.find({}); // Loaded to fetch overall stats
    const sessions = await db.sessions.find({ userId, status: 'completed' });

    // Calculate radar metrics average
    let pronunciationAvg = 0;
    let grammarAvg = 0;
    let fluencyAvg = 0;
    let vocabularyAvg = 0;
    let confidenceAvg = 0;
    let reportsCount = 0;

    for (const s of sessions) {
      const r = reports.find((rep: any) => rep.sessionId === s.id);
      if (r && r.overallScores) {
        pronunciationAvg += r.overallScores.pronunciationScore;
        grammarAvg += r.overallScores.grammarScore;
        fluencyAvg += r.overallScores.fluencyScore;
        vocabularyAvg += r.overallScores.vocabularyScore;
        confidenceAvg += r.overallScores.confidenceScore;
        reportsCount++;
      }
    }

    const radarMetrics = {
      pronunciation: reportsCount > 0 ? Math.round(pronunciationAvg / reportsCount) : 0,
      grammar: reportsCount > 0 ? Math.round(grammarAvg / reportsCount) : 0,
      fluency: reportsCount > 0 ? Math.round(fluencyAvg / reportsCount) : 0,
      vocabulary: reportsCount > 0 ? Math.round(vocabularyAvg / reportsCount) : 0,
      confidence: reportsCount > 0 ? Math.round(confidenceAvg / reportsCount) : 0,
    };

    // Heatmap data
    const heatmap = await db.activityLogs.find({ userId });

    // Word of the day list
    const vocabWords = [
      { word: 'Pragmatic', meaning: 'Dealing with things sensibly and realistically in a way that is based on practical rather than theoretical considerations.', example: 'During a tech interview, outlining a pragmatic trade-off demonstrates professional maturity.', category: 'HR' },
      { word: 'Scalability', meaning: 'The capacity to be changed in size or scale, specifically system designs to handle growing amounts of work.', example: 'In technical sessions, frame your database choice in terms of horizontal scalability.', category: 'Tech' },
      { word: 'Idempotent', meaning: 'An operation that produces the same result no matter how many times it is executed.', example: 'API designs must strive to be idempotent to prevent redundant writes.', category: 'Tech' },
      { word: 'Composure', meaning: 'The state or feeling of being calm and in control of oneself.', example: 'Maintaining posture and speaking with composure helps lower conversational filler rate.', category: 'HR' },
      { word: 'Mitigate', meaning: 'Make less severe, serious, or painful.', example: 'Explain how your exception boundaries mitigate the risk of app crashes.', category: 'Tech' }
    ];
    const wordIndex = new Date().getDate() % vocabWords.length;
    const wordOfTheDay = vocabWords[wordIndex];

    res.json({
      streak,
      achievements,
      radarMetrics,
      heatmap,
      wordOfTheDay,
      totalSessions: sessions.length,
    });
  });

  app.get('/api/dashboard/leaderboard', async (req, res) => {
    const users = await db.users.find({});
    const reports = await db.reports.find({});
    const streaks = await db.streaks.find({});

    const entries = users.map((user) => {
      // Sum scores of completed sessions
      const userReports = reports.filter((r) => {
        return r.sessionId && r.overallScores;
      });

      let totalScore = 0;
      userReports.forEach((rep) => {
        const s = rep.overallScores;
        totalScore += (s.pronunciationScore + s.grammarScore + s.fluencyScore + s.vocabularyScore + s.confidenceScore) / 5;
      });

      const userStreak = streaks.find((s) => s.userId === user.id);

      return {
        userId: user.id,
        username: user.username,
        totalScore: Math.round(totalScore),
        sessionsCount: userReports.length,
        currentStreak: userStreak ? userStreak.currentStreak : 0,
      };
    });

    // Sort descending by score
    entries.sort((a, b) => b.totalScore - a.totalScore);

    res.json(entries);
  });

  // ==========================================
  // PREMIUM AI VOICE (TTS) ENDPOINT
  // ==========================================

  app.post('/api/tts', async (req, res) => {
    const { text, voice } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text content is required for TTS.' });
    }

    const voiceName = voice || 'Zephyr'; // 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(400).json({ error: 'Gemini API Key is not configured for voice synthesizers.' });
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-tts-preview',
        contents: [{ parts: [{ text: `Say naturally: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
      }) as any;

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        res.json({ audio: base64Audio });
      } else {
        res.status(500).json({ error: 'No audio data returned from voice model.' });
      }
    } catch (err: any) {
      console.error('Gemini TTS error:', err);
      res.status(500).json({ error: err.message || 'Error synthesizing speech.' });
    }
  });

  // ==========================================
  // AUDIT & ADMIN ENDPOINTS
  // ==========================================

  app.get('/api/admin/stats', async (req, res) => {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden.' });
    }

    const users = await db.users.find({});
    const sessions = await db.sessions.find({});
    const logs = await db.activityLogs.find({});

    // Filter active sessions within last hour
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    const activeSessionsList = Array.from(activeSessions.values()).filter(s => s.lastSeen > oneHourAgo);

    // Group activities to track each user's specific history
    // Sort logs descending by timestamp
    const sortedLogs = [...logs].sort((a, b) => new Date(b.timestamp || b.created_at).getTime() - new Date(a.timestamp || a.created_at).getTime());

    // Simple active times
    const dauCount = new Set(logs.map((l) => l.userId)).size;

    const auditLogs = await db.adminActions.find({});
    const defaultAuditLogs = [
      { id: '1', admin: 'Sabaridhandapani', action: 'Platform Launch', details: 'Initialized production-grade Mock Interview Platform.', timestamp: new Date().toISOString() },
      { id: '2', admin: 'Sabaridhandapani', action: 'Verify Models', details: 'Validated Gemini models for dual HR interview agents.', timestamp: new Date().toISOString() }
    ];

    res.json({
      users,
      totalSessions: sessions.length,
      dauCount,
      activeSessions: activeSessionsList,
      userActivities: sortedLogs,
      auditLogs: auditLogs.length > 0 ? auditLogs : defaultAuditLogs,
    });
  });

  app.post('/api/admin/user/add', async (req, res) => {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden.' });
    }
    const { username, email, role } = req.body;
    if (!username || !email) {
      return res.status(400).json({ error: 'Username and email are required.' });
    }

    const existing = await db.users.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: 'User with this email already exists.' });
    }

    const newUser = await db.users.insertOne({
      username,
      email,
      role: role || 'candidate',
      createdAt: new Date().toISOString(),
      isBanned: false,
    });

    await db.streaks.insertOne({
      userId: newUser.id,
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: '',
    });

    await logUserActivity(newUser.id, 'Account Created', `Created via Administrator panel by ${req.user.username}`);

    await db.adminActions.insertOne({
      action: 'Create User',
      details: `Created candidate ${username} (${email}) as ${role || 'candidate'}`,
      timestamp: new Date().toISOString()
    });

    res.status(201).json(newUser);
  });

  app.delete('/api/admin/user/:userId', async (req, res) => {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden.' });
    }

    const targetUserId = req.params.userId;
    const userToDelete = await db.users.findOne({ id: targetUserId });
    if (!userToDelete) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (userToDelete.role === 'admin') {
      return res.status(400).json({ error: 'Cannot delete an administrator.' });
    }

    // Delete records across database
    await db.users.deleteOne({ id: targetUserId });
    await db.streaks.deleteMany({ userId: targetUserId });
    await db.resumes.deleteMany({ userId: targetUserId });
    await db.sessions.deleteMany({ userId: targetUserId });
    await db.activityLogs.deleteMany({ userId: targetUserId });

    // Evict from active sessions cache
    activeSessions.delete(targetUserId);

    await db.adminActions.insertOne({
      action: 'Delete User',
      details: `Deleted candidate account ${userToDelete.username} (${userToDelete.email})`,
      timestamp: new Date().toISOString()
    });

    res.json({ success: true });
  });

  app.post('/api/admin/user/:userId/ban', async (req, res) => {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden.' });
    }

    const { ban } = req.body;
    const targetUserId = req.params.userId;
    const userToBan = await db.users.findOne({ id: targetUserId });

    if (!userToBan) {
      return res.status(404).json({ error: 'User not found.' });
    }

    await db.users.updateOne({ id: targetUserId }, { isBanned: !!ban });

    const statusMsg = ban ? 'suspended' : 'activated';
    await logUserActivity(targetUserId, ban ? 'Account Suspended' : 'Account Re-Activated', `Account status changed to ${statusMsg} by Administrator.`);

    await db.adminActions.insertOne({
      action: ban ? 'Suspend User' : 'Unsuspend User',
      details: `Changed suspension status of ${userToBan.username} to ${ban ? 'Banned' : 'Active'}`,
      timestamp: new Date().toISOString()
    });

    res.json({ success: true });
  });

  // ==========================================
  // VITE AND STATIC SERVING
  // ==========================================

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
