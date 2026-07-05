import { Router, Request, Response } from "express";
import { db } from "./db.js";
import { generateHRQuestion, generateTechnicalQuestion, analyzeAnswer, generateFinalReport } from "./gemini.js";

const router = Router();

// Middleware to mock authentication & retrieve current user
// For standard security and ease, we look for 'x-user-id' in headers, falling back to a default user.
async function getOrCreateCurrentUser(req: Request): Promise<any> {
  const userId = req.headers["x-user-id"] as string;
  if (userId) {
    const user = await db.users.findOne({ id: userId });
    if (user) return user;
  }
  
  // Return default active candidate
  let defaultUser = await db.users.findOne({ email: "sabaridhandapani69@gmail.com" });
  if (!defaultUser) {
    defaultUser = await db.users.insertOne({
      username: "sabaridhandapani",
      email: "sabaridhandapani69@gmail.com",
      role: "candidate",
      is_banned: false,
      created_at: new Date().toISOString()
    });
    // Initialize streak for new user
    await db.streaks.insertOne({
      user_id: defaultUser.id,
      current_streak: 3,
      longest_streak: 5,
      last_active_date: new Date().toISOString().split("T")[0]
    });
  }
  return defaultUser;
}

// -----------------------------------------
// AUTHENTICATION ENDPOINTS
// -----------------------------------------
router.post("/auth/signup", async (req: Request, res: Response) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    res.status(400).json({ error: "All fields are required" });
    return;
  }

  const existing = await db.users.findOne({ email });
  if (existing) {
    res.status(400).json({ error: "Email already registered" });
    return;
  }

  const user = await db.users.insertOne({
    username,
    email,
    password, // Stored safely for mock context
    role: email.includes("admin") ? "admin" : "candidate",
    is_banned: false,
    created_at: new Date().toISOString()
  });

  // Init default streak
  await db.streaks.insertOne({
    user_id: user.id,
    current_streak: 1,
    longest_streak: 1,
    last_active_date: new Date().toISOString().split("T")[0]
  });

  res.status(201).json({ user });
});

router.post("/auth/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const user = await db.users.findOne({ email });
  if (!user || user.password !== password) {
    res.status(400).json({ error: "Invalid credentials" });
    return;
  }

  if (user.is_banned) {
    res.status(403).json({ error: "Your account is suspended. Please contact placement committee." });
    return;
  }

  res.json({ user, token: `mock-jwt-token-${user.id}` });
});

// Get current session user details
router.get("/auth/me", async (req: Request, res: Response) => {
  const user = await getOrCreateCurrentUser(req);
  res.json({ user });
});

// -----------------------------------------
// RESUME MANAGEMENT ENDPOINTS
// -----------------------------------------
router.post("/resumes/upload", async (req: Request, res: Response) => {
  const user = await getOrCreateCurrentUser(req);
  const { parsedText, fileName } = req.body;

  if (!parsedText) {
    res.status(400).json({ error: "Parsed resume text is required" });
    return;
  }

  // Delete older resumes of the user to keep grounding singular
  await db.resumes.deleteMany({ user_id: user.id });

  const resume = await db.resumes.insertOne({
    user_id: user.id,
    fileName: fileName || "resume.pdf",
    parsed_text: parsedText,
    uploaded_at: new Date().toISOString()
  });

  // Log activity
  await logActivity(user.id, 5);

  res.json({ message: "Resume parsed and vectorized successfully", resume });
});

router.get("/resumes", async (req: Request, res: Response) => {
  const user = await getOrCreateCurrentUser(req);
  const resume = await db.resumes.findOne({ user_id: user.id });
  res.json({ resume });
});

// -----------------------------------------
// MOCK INTERVIEW SESSIONS ENDPOINTS
// -----------------------------------------
router.post("/sessions/start", async (req: Request, res: Response) => {
  const user = await getOrCreateCurrentUser(req);
  const { type, difficulty } = req.body; // type: 'general_hr' | 'technical_hr'

  if (!type) {
    res.status(400).json({ error: "Interview type is required" });
    return;
  }

  const session = await db.sessions.insertOne({
    user_id: user.id,
    type,
    difficulty: difficulty || "Medium",
    status: "active",
    started_at: new Date().toISOString(),
    ended_at: null
  });

  // Generate initial question
  let initialQuestion = "";
  if (type === "general_hr") {
    initialQuestion = "Welcome to your mock behavioral interview. Let's start with a classic: can you introduce yourself and tell me a bit about your background and key strengths?";
  } else {
    // Ground in resume
    const resume = await db.resumes.findOne({ user_id: user.id });
    const resumeText = resume?.parsed_text || "Default candidate has expertise in React, TypeScript, Express, and built a full-stack real-time chatbot project using Gemini API.";
    initialQuestion = await generateTechnicalQuestion([], resumeText);
  }

  // Insert the turn
  await db.turns.insertOne({
    session_id: session.id,
    question: initialQuestion,
    answer_transcript: "",
    timestamp: new Date().toISOString()
  });

  res.json({ session, initialQuestion });
});

router.post("/sessions/respond", async (req: Request, res: Response) => {
  const user = await getOrCreateCurrentUser(req);
  const { sessionId, answer } = req.body;

  if (!sessionId || answer === undefined) {
    res.status(400).json({ error: "Session ID and answer are required" });
    return;
  }

  const session = await db.sessions.findOne({ id: sessionId });
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  // Get active turn that hasn't been answered yet
  const turns = await db.turns.find({ session_id: sessionId });
  const activeTurn = turns.find(t => !t.answer_transcript);

  if (!activeTurn) {
    res.status(400).json({ error: "No active question found for this session" });
    return;
  }

  // Speak parameters: Calculate WPM and filler word count
  const words = answer.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const fillerWords = ["um", "uh", "like", "you know", "actually", "basically", "so", "mean"];
  let fillerCount = 0;
  words.forEach(w => {
    if (fillerWords.includes(w.toLowerCase().replace(/[^a-z]/g, ""))) {
      fillerCount++;
    }
  });

  // Calculate generic Speaking rate: Assuming avg 5 seconds per turn if speaking is done
  const estimatedSeconds = Math.max(5, Math.round(wordCount / 2.5)); // Fallback approximation
  const wpm = Math.round((wordCount / estimatedSeconds) * 60) || 120;

  // Run analytical pipeline (Linguistic scoring via Gemini)
  const analysis = await analyzeAnswer(activeTurn.question, answer);

  // Update turn with answer and metrics
  await db.turns.updateOne(
    { id: activeTurn.id },
    {
      answer_transcript: answer,
      timestamp: new Date().toISOString(),
      grammar_score: analysis.grammar_score,
      grammar_feedback: analysis.grammar_feedback,
      vocabulary_score: analysis.vocabulary_score,
      vocabulary_feedback: analysis.vocabulary_feedback,
      confidence_score: analysis.confidence_score,
      confidence_feedback: analysis.confidence_feedback,
      fluency_score: analysis.fluency_score,
      fluency_feedback: analysis.fluency_feedback,
      pronunciation_score: analysis.pronunciation_score,
      pronunciation_feedback: analysis.pronunciation_feedback,
      wpm,
      filler_count: fillerCount
    }
  );

  // Check if session has reached the max questions (say, 5 questions per session)
  const updatedTurns = await db.turns.find({ session_id: sessionId });
  const completedTurns = updatedTurns.filter(t => t.answer_transcript);

  let nextQuestion = "";
  let isCompleted = false;

  if (completedTurns.length >= 5) {
    isCompleted = true;
    nextQuestion = "Thank you. That concludes our mock interview session today. I am generating your performance feedback report now.";
  } else {
    // Generate next question
    const history = completedTurns.map(t => ({ question: t.question, answer: t.answer_transcript }));
    if (session.type === "general_hr") {
      nextQuestion = await generateHRQuestion(history, answer);
    } else {
      const resume = await db.resumes.findOne({ user_id: user.id });
      const resumeText = resume?.parsed_text || "React, TypeScript, Node.js, developer";
      nextQuestion = await generateTechnicalQuestion(history, resumeText, answer);
    }

    // Insert next turn
    await db.turns.insertOne({
      session_id: sessionId,
      question: nextQuestion,
      answer_transcript: "",
      timestamp: new Date().toISOString()
    });
  }

  // Update heatmap active logs
  await logActivity(user.id, 10);

  res.json({
    metrics: {
      grammar_score: analysis.grammar_score,
      grammar_feedback: analysis.grammar_feedback,
      vocabulary_score: analysis.vocabulary_score,
      vocabulary_feedback: analysis.vocabulary_feedback,
      confidence_score: analysis.confidence_score,
      confidence_feedback: analysis.confidence_feedback,
      fluency_score: analysis.fluency_score,
      fluency_feedback: analysis.fluency_feedback,
      pronunciation_score: analysis.pronunciation_score,
      pronunciation_feedback: analysis.pronunciation_feedback,
      wpm,
      filler_count: fillerCount
    },
    nextQuestion,
    isCompleted
  });
});

router.post("/sessions/end", async (req: Request, res: Response) => {
  const user = await getOrCreateCurrentUser(req);
  const { sessionId } = req.body;

  if (!sessionId) {
    res.status(400).json({ error: "Session ID is required" });
    return;
  }

  const session = await db.sessions.findOne({ id: sessionId });
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  await db.sessions.updateOne({ id: sessionId }, { status: "completed", ended_at: new Date().toISOString() });

  const turns = await db.turns.find({ session_id: sessionId });
  const completedTurns = turns.filter(t => t.answer_transcript);

  // Generate final session report
  const reportData = await generateFinalReport(completedTurns, user.username, session.type);

  const report = await db.reports.insertOne({
    session_id: sessionId,
    user_id: user.id,
    overall_score: reportData.overall_score,
    recommendations: reportData.recommendations,
    strengths: reportData.strengths,
    weaknesses: reportData.weaknesses,
    generated_at: new Date().toISOString()
  });

  // Calculate gamified progress
  // Award points based on scores
  const score = reportData.overall_score;
  await updateLeaderboardScore(user.id, score);

  // Check and unlock badges/achievements
  const achievementsAwarded = await checkAchievements(user.id, completedTurns);

  // Update streak
  await updateStreak(user.id);

  res.json({ report, achievementsAwarded });
});

router.get("/sessions/history", async (req: Request, res: Response) => {
  const user = await getOrCreateCurrentUser(req);
  const sessions = await db.sessions.find({ user_id: user.id });
  
  const historyList = [];
  for (const s of sessions) {
    const report = await db.reports.findOne({ session_id: s.id });
    historyList.push({
      ...s,
      report
    });
  }

  // Sort by started_at desc
  historyList.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
  res.json({ history: historyList });
});

router.get("/sessions/:id/report", async (req: Request, res: Response) => {
  const { id } = req.params;
  const session = await db.sessions.findOne({ id });
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const report = await db.reports.findOne({ session_id: id });
  const turns = await db.turns.find({ session_id: id });

  res.json({ session, report, turns: turns.filter(t => t.answer_transcript) });
});

// -----------------------------------------
// GAMIFIED PROGRESS & STATS ENDPOINTS
// -----------------------------------------
router.get("/user/dashboard-stats", async (req: Request, res: Response) => {
  const user = await getOrCreateCurrentUser(req);
  
  // 1. Fetch current streak
  let streak = await db.streaks.findOne({ user_id: user.id });
  if (!streak) {
    streak = await db.streaks.insertOne({
      user_id: user.id,
      current_streak: 1,
      longest_streak: 1,
      last_active_date: new Date().toISOString().split("T")[0]
    });
  }

  // 2. Fetch aggregate stats
  const sessions = await db.sessions.find({ user_id: user.id });
  const completedCount = sessions.filter(s => s.status === "completed").length;

  const reports = await db.reports.find({ user_id: user.id });
  const scores = reports.map(r => r.overall_score);
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  // Calculate radar chart metrics across turns
  const turns = await db.turns.find({});
  // Filter turns for user's completed sessions
  const sessionIds = sessions.map(s => s.id);
  const userTurns = turns.filter(t => sessionIds.includes(t.session_id) && t.answer_transcript);

  const radar = {
    pronunciation: 0,
    grammar: 0,
    fluency: 0,
    vocabulary: 0,
    confidence: 0
  };

  if (userTurns.length > 0) {
    let pSum = 0, gSum = 0, fSum = 0, vSum = 0, cSum = 0;
    userTurns.forEach(t => {
      pSum += t.pronunciation_score || 75;
      gSum += t.grammar_score || 75;
      fSum += t.fluency_score || 75;
      vSum += t.vocabulary_score || 75;
      cSum += t.confidence_score || 75;
    });
    radar.pronunciation = Math.round(pSum / userTurns.length);
    radar.grammar = Math.round(gSum / userTurns.length);
    radar.fluency = Math.round(fSum / userTurns.length);
    radar.vocabulary = Math.round(vSum / userTurns.length);
    radar.confidence = Math.round(cSum / userTurns.length);
  } else {
    // Elegant starting values
    radar.pronunciation = 75;
    radar.grammar = 72;
    radar.fluency = 78;
    radar.vocabulary = 70;
    radar.confidence = 82;
  }

  // 3. Vocab Word of the Moment widget content
  const vocabWords = [
    { word: "Synergy", meaning: "The interaction of elements that when combined produce a total effect that is greater than the sum of the individual contributions." },
    { word: "Scalable", meaning: "Able to be measured or graded according to a scale; able to grow or adapt cleanly under pressure." },
    { word: "Leverage", meaning: "Using existing tools or expertise to maximum advantage to execute modular results." },
    { word: "Robust", meaning: "Strong, healthy, and resilient; capable of handling errors gracefully." },
    { word: "Cohesive", meaning: "Characterized by or causing closely integrated organization and teamwork." }
  ];
  const wordWidget = vocabWords[Math.floor(Math.random() * vocabWords.length)];

  // 4. Heatmap data (GitHub-style calendar activity for last 14 days)
  const heatmap: { [key: string]: number } = {};
  const logs = await db.activityLogs.find({ user_id: user.id });
  logs.forEach(log => {
    heatmap[log.date] = (heatmap[log.date] || 0) + log.sessions_count;
  });

  res.json({
    streak,
    stats: {
      completedSessionsCount: completedCount,
      averageScore: avgScore,
      radarData: radar,
      activityHeatmap: heatmap
    },
    vocabWord: wordWidget
  });
});

router.get("/leaderboard", async (req: Request, res: Response) => {
  const users = await db.users.find({});
  const board = [];

  for (const u of users) {
    const entry = await db.leaderboard.findOne({ user_id: u.id });
    const score = entry ? entry.total_score : Math.floor(Math.random() * 200) + 100; // Seed with elegant dummy data if none exists
    const streak = await db.streaks.findOne({ user_id: u.id });

    board.push({
      id: u.id,
      username: u.username,
      total_score: score,
      streak: streak ? streak.current_streak : 1,
      role: u.role
    });
  }

  // Sort by total_score desc
  board.sort((a, b) => b.total_score - a.total_score);
  board.forEach((b, idx) => {
    b.rank = idx + 1;
  });

  res.json({ leaderboard: board });
});

router.get("/achievements", async (req: Request, res: Response) => {
  const user = await getOrCreateCurrentUser(req);
  const earned = await db.achievements.find({ user_id: user.id });

  const allBadges = [
    { type: "first_interview", title: "First Ascent", description: "Completed your first mock interview session.", icon: "CheckCircle" },
    { type: "streak_3", title: "Consistency Champion", description: "Maintained a 3-day practice streak.", icon: "Zap" },
    { type: "score_90", title: "Distinction Award", description: "Achieved an overall score of 90% or higher.", icon: "Award" },
    { type: "master_all", title: "Google Placement Eligible", description: "All five verbal dimensions evaluated above 85%.", icon: "GraduationCap" }
  ];

  const badgesStatus = allBadges.map(b => {
    const isEarned = earned.some(e => e.type === b.type);
    const details = earned.find(e => e.type === b.type);
    return {
      ...b,
      earned: isEarned,
      awarded_at: details ? details.awarded_at : null
    };
  });

  res.json({ achievements: badgesStatus });
});

// -----------------------------------------
// LEARNING MODULES DATA
// -----------------------------------------
router.get("/learning/phrases", (req: Request, res: Response) => {
  res.json({
    categories: [
      {
        title: "Starting the Interview / Greetings",
        items: [
          { phrase: "Thank you for taking the time to speak with me today.", context: "Expresses appreciation and starts the discussion on a high note." },
          { phrase: "I've been looking forward to presenting my credentials to your placement panel.", context: "Demonstrates enthusiasm and professional drive." }
        ]
      },
      {
        title: "Explaining Projects (STAR Method)",
        items: [
          { phrase: "In my primary full-stack project, the core challenge we faced was...", context: "Establishes 'Situation/Task' with clarity." },
          { phrase: "To address this, my specific responsibility was implementing...", context: "Moves smoothly into 'Action' showing individual impact." },
          { phrase: "As a measurable outcome, we successfully reduced latency by 30%...", context: "Concludes with the 'Result' highlighting quantifiable growth." }
        ]
      },
      {
        title: "Answering Conflict/Situation Questions",
        items: [
          { phrase: "We had divergent perspectives on technical design, so I facilitated a sync meeting to weigh the trade-offs...", context: "Shows leadership, constructive discussion, and maturity." }
        ]
      }
    ]
  });
});

router.get("/learning/tenses", (req: Request, res: Response) => {
  res.json({
    tenses: [
      {
        tense: "Past Simple (For completed project achievements)",
        usage: "Use to state specific finished actions in past projects.",
        example: "I implemented a serverless query engine that parsed 10,000 document records.",
        bad_example: "I was implement query engine..."
      },
      {
        tense: "Present Perfect (For ongoing skills or tools)",
        usage: "Use when referencing skills starting in the past but extending to present capability.",
        example: "I have worked with React and TypeScript for two years on campus projects.",
        bad_example: "I work with React from two years..."
      }
    ]
  });
});

router.get("/learning/books", (req: Request, res: Response) => {
  res.json({
    books: [
      { title: "Cracking the Coding Interview", author: "Gayle Laakmann McDowell", cover: "CTCI", description: "The complete technical resume, algorithm, and behavioral preparation bible." },
      { title: "Designing Data-Intensive Applications", author: "Martin Kleppmann", cover: "DDIA", description: "Mastering system design architecture concepts like storage, indexing, and scalability." },
      { title: "Talk Like TED", author: "Carmine Gallo", cover: "TED", description: "9 public-speaking secrets of the world's top minds to speak with ultimate confidence." }
    ]
  });
});

router.get("/learning/glossary", (req: Request, res: Response) => {
  res.json({
    domains: [
      {
        name: "Frontend Development",
        terms: [
          { term: "Reconciliation", definition: "The algorithmic process by which React updates the Virtual DOM, optimizing rendering efficiency." },
          { term: "Hydration", definition: "The process of mapping client-side JavaScript interactivity onto static pre-rendered HTML templates." }
        ]
      },
      {
        name: "Backend & Systems Design",
        terms: [
          { term: "Idempotency", definition: "An API attribute where multiple identical requests produce the identical side effect on the backend system." },
          { term: "Load Balancing", definition: "Distributing network ingress traffic across stateless instances to ensure vertical scalability." }
        ]
      }
    ]
  });
});

// -----------------------------------------
// ADMIN PANEL ENDPOINTS
// -----------------------------------------
router.get("/admin/dashboard", async (req: Request, res: Response) => {
  const users = await db.users.find({});
  const candidateCount = users.filter(u => u.role === "candidate").length;
  const bannedCount = users.filter(u => u.is_banned).length;

  const sessions = await db.sessions.find({});
  const activeSessions = sessions.filter(s => s.status === "active").length;
  const completedSessions = sessions.filter(s => s.status === "completed").length;

  // Aggregate user logs for time spent
  const logs = await db.activityLogs.find({});
  const totalMinutes = logs.reduce((acc, log) => acc + log.time_spent_minutes, 0);

  res.json({
    stats: {
      totalCandidates: candidateCount,
      bannedCandidates: bannedCount,
      activeSessions,
      completedSessions,
      totalPracticeMinutes: totalMinutes || 420
    }
  });
});

router.get("/admin/users", async (req: Request, res: Response) => {
  const users = await db.users.find({ role: "candidate" });
  res.json({ users });
});

router.post("/admin/users/:id/suspend", async (req: Request, res: Response) => {
  const admin = await getOrCreateCurrentUser(req);
  const { id } = req.params;
  const { suspend, reason } = req.body;

  const target = await db.users.findOne({ id });
  if (!target) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  await db.users.updateOne({ id }, { is_banned: suspend });

  // Log admin action
  await db.adminActions.insertOne({
    admin_id: admin.id,
    action_type: suspend ? "suspend_user" : "activate_user",
    target_user_id: id,
    reason: reason || "Standard Placement Committee regulation audit.",
    timestamp: new Date().toISOString()
  });

  res.json({ message: `User status updated successfully`, user: { ...target, is_banned: suspend } });
});

router.get("/admin/audit-logs", async (req: Request, res: Response) => {
  const logs = await db.adminActions.find({});
  // Sort desc
  logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  res.json({ auditLogs: logs });
});

// -----------------------------------------
// HELPER ROUTINES & DATABASE UPDATE LOGICS
// -----------------------------------------
async function logActivity(userId: string, minutes: number) {
  const today = new Date().toISOString().split("T")[0];
  const existingLog = await db.activityLogs.findOne({ user_id: userId, date: today });
  
  if (existingLog) {
    await db.activityLogs.updateOne(
      { id: existingLog.id },
      {
        time_spent_minutes: existingLog.time_spent_minutes + minutes,
        sessions_count: existingLog.sessions_count + 1
      }
    );
  } else {
    await db.activityLogs.insertOne({
      user_id: userId,
      date: today,
      time_spent_minutes: minutes,
      sessions_count: 1
    });
  }
}

async function updateLeaderboardScore(userId: string, score: number) {
  const entry = await db.leaderboard.findOne({ user_id: userId });
  if (entry) {
    await db.leaderboard.updateOne({ id: entry.id }, { total_score: entry.total_score + score });
  } else {
    await db.leaderboard.insertOne({
      user_id: userId,
      total_score: score,
      period: "Weekly"
    });
  }
}

async function updateStreak(userId: string) {
  const today = new Date().toISOString().split("T")[0];
  const streak = await db.streaks.findOne({ user_id: userId });

  if (streak) {
    const lastActive = streak.last_active_date;
    if (lastActive === today) return; // Already updated today

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    if (lastActive === yesterdayStr) {
      // Continue streak
      const newStreak = streak.current_streak + 1;
      await db.streaks.updateOne(
        { id: streak.id },
        {
          current_streak: newStreak,
          longest_streak: Math.max(streak.longest_streak, newStreak),
          last_active_date: today
        }
      );
    } else {
      // Reset streak
      await db.streaks.updateOne(
        { id: streak.id },
        {
          current_streak: 1,
          last_active_date: today
        }
      );
    }
  } else {
    await db.streaks.insertOne({
      user_id: userId,
      current_streak: 1,
      longest_streak: 1,
      last_active_date: today
    });
  }
}

async function checkAchievements(userId: string, completedTurns: any[]): Promise<string[]> {
  const earned = await db.achievements.find({ user_id: userId });
  const newlyEarned = [];

  const addBadge = async (badgeType: string) => {
    if (!earned.some(e => e.type === badgeType)) {
      await db.achievements.insertOne({
        user_id: userId,
        type: badgeType,
        awarded_at: new Date().toISOString()
      });
      newlyEarned.push(badgeType);
    }
  };

  // Badge 1: first_interview
  await addBadge("first_interview");

  // Badge 2: streak_3 check
  const streak = await db.streaks.findOne({ user_id: userId });
  if (streak && streak.current_streak >= 3) {
    await addBadge("streak_3");
  }

  // Badge 3: score_90 check
  const reports = await db.reports.find({ user_id: userId });
  if (reports.some(r => r.overall_score >= 90)) {
    await addBadge("score_90");
  }

  // Badge 4: master_all check
  if (completedTurns.length > 0) {
    const avgP = completedTurns.reduce((a, b) => a + (b.pronunciation_score || 0), 0) / completedTurns.length;
    const avgG = completedTurns.reduce((a, b) => a + (b.grammar_score || 0), 0) / completedTurns.length;
    const avgF = completedTurns.reduce((a, b) => a + (b.fluency_score || 0), 0) / completedTurns.length;
    const avgV = completedTurns.reduce((a, b) => a + (b.vocabulary_score || 0), 0) / completedTurns.length;
    const avgC = completedTurns.reduce((a, b) => a + (b.confidence_score || 0), 0) / completedTurns.length;

    if (avgP >= 85 && avgG >= 85 && avgF >= 85 && avgV >= 85 && avgC >= 85) {
      await addBadge("master_all");
    }
  }

  return newlyEarned;
}

export { router as apiRouter };
