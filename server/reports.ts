import { GoogleGenAI } from '@google/genai';
import { db } from './db.js';
import { InterviewTurn, TurnMetrics, SessionReport, User, InterviewSession } from '../src/types.js';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

export async function compileSessionReport(sessionId: string): Promise<SessionReport> {
  // Check if report already exists
  const existingReport = await db.reports.findOne({ sessionId });
  if (existingReport) {
    return existingReport;
  }

  const session = await db.sessions.findOne({ id: sessionId });
  if (!session) {
    throw new Error('Session not found');
  }

  const allTurns = await db.turns.find({ sessionId });
  const turns = allTurns.filter((t) => t.answerTranscript !== '');

  if (turns.length === 0) {
    // If no answers were recorded yet, create a default blank/low report
    const blankScores: TurnMetrics = {
      pronunciationScore: 0,
      grammarScore: 0,
      fluencyScore: 0,
      vocabularyScore: 0,
      confidenceScore: 0,
      wpm: 0,
      fillerCount: 0,
    };
    
    return db.reports.insertOne({
      sessionId,
      overallScores: blankScores,
      recommendationsText: "No answers were recorded during this session.",
      generatedAt: new Date().toISOString(),
    });
  }

  // Calculate averages
  let sumPronunciation = 0;
  let sumGrammar = 0;
  let sumFluency = 0;
  let sumVocabulary = 0;
  let sumConfidence = 0;
  let sumWpm = 0;
  let totalFillers = 0;

  turns.forEach((t) => {
    const m = t.metrics || {
      pronunciationScore: 70,
      grammarScore: 70,
      fluencyScore: 70,
      vocabularyScore: 70,
      confidenceScore: 70,
      wpm: 120,
      fillerCount: 0,
    };
    sumPronunciation += m.pronunciationScore;
    sumGrammar += m.grammarScore;
    sumFluency += m.fluencyScore;
    sumVocabulary += m.vocabularyScore;
    sumConfidence += m.confidenceScore;
    sumWpm += m.wpm;
    totalFillers += m.fillerCount;
  });

  const count = turns.length;
  const overallScores: TurnMetrics = {
    pronunciationScore: Math.round(sumPronunciation / count),
    grammarScore: Math.round(sumGrammar / count),
    fluencyScore: Math.round(sumFluency / count),
    vocabularyScore: Math.round(sumVocabulary / count),
    confidenceScore: Math.round(sumConfidence / count),
    wpm: Math.round(sumWpm / count),
    fillerCount: totalFillers,
  };

  // Compile transcripts for Gemini recommendation
  let transcriptText = '';
  turns.forEach((t, i) => {
    transcriptText += `Round ${i + 1}:\nQuestion: ${t.question}\nAnswer: ${t.answerTranscript}\n\n`;
  });

  const recommendationPrompt = `
    You are an executive talent coach and expert interviewer compiling a final performance review.
    
    Interview Type: ${session.type === 'general_hr' ? 'General HR (Behavioral)' : 'Technical HR (Resume-Grounded)'}
    Overall Scores calculated:
    - Pronunciation & Articulation: ${overallScores.pronunciationScore}/100
    - Grammar & Syntax: ${overallScores.grammarScore}/100
    - Fluency & Continuity: ${overallScores.fluencyScore}/100
    - Vocabulary Variety & Depth: ${overallScores.vocabularyScore}/100
    - Confidence & Delivery: ${overallScores.confidenceScore}/100
    - Average Speed: ${overallScores.wpm} Words Per Minute
    - Total Filler Words Used: ${overallScores.fillerCount}
    
    Q&A Transcript:
    ${transcriptText}
    
    Generate a highly professional, constructive executive feedback report covering:
    1. Key Strengths (specific reference to vocabulary, confidence, or content structure).
    2. Areas for Improvement (phrasing, grammar, pause management, or technical clarity).
    3. Concrete, Actionable Recommendations for upcoming placements.
    
    Output structured markdown format with clear bold sections. Keep it concise, formal, and authoritative.
  `;

  let recommendationsText = '';
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: recommendationPrompt,
    });
    recommendationsText = response.text || "Feedback compilation completed successfully. Keep practicing to improve scores.";
  } catch (err) {
    console.error('Failed to generate report text via Gemini:', err);
    recommendationsText = `
### Overall Assessment
You have completed the mock interview.

### Key Strengths
- **Steady Pace**: Your average speed is ${overallScores.wpm} WPM, which is very clear and easy to follow.
- **Engagement**: You answered questions directly and demonstrated key concepts.

### Areas for Improvement
- **Filler Word Usage**: You used ${overallScores.fillerCount} filler words. Practice speaking with silent pauses rather than vocal fillers.
- **Grammatical Precision**: Work on tightening sentence structures for professional meetings.

### Next Steps & Recommendations
1. Practice STAR format responses for situational inquiries.
2. Review technical definitions in our learning modules to expand vocabulary.
    `;
  }

  const report = await db.reports.insertOne({
    sessionId,
    overallScores,
    recommendationsText,
    generatedAt: new Date().toISOString(),
  });

  // Check and award badges/achievements on successful completion
  await checkAchievements(session.userId, overallScores);

  // Update streaks
  await updateStreak(session.userId);

  return report;
}

/**
 * Checks and updates achievements based on scores.
 * Certificate is auto-unlocked once all five core skills reach >= 50.
 */
async function checkAchievements(userId: string, scores: TurnMetrics) {
  const achievements = await db.achievements.find({ userId });
  const award = async (type: string, title: string, desc: string) => {
    if (!achievements.some((a: any) => a.type === type)) {
      await db.achievements.insertOne({
        userId,
        type,
        title,
        description: desc,
        awardedAt: new Date().toISOString(),
      });
    }
  };

  // 1. First Interview Completed
  await award('first_interview', 'First Steps', 'Successfully completed your first full-scale AI mock interview.');

  // 2. High Fluency Award (Fluency >= 80)
  if (scores.fluencyScore >= 80) {
    await award('fluent_speaker', 'Fluent Communicator', 'Achieved a fluency score of 80% or higher in a session.');
  }

  // 3. Perfect Confidence Award (Confidence >= 80)
  if (scores.confidenceScore >= 80) {
    await award('confident_star', 'Confidence Master', 'Demonstrated exceptional composure with a confidence score >= 80%.');
  }

  // 4. Grammar Guru (Grammar >= 80)
  if (scores.grammarScore >= 80) {
    await award('grammar_guru', 'Grammar Guru', 'Demonstrated immaculate syntactical correctness with a score >= 80%.');
  }

  // 4.5. Overall Score Above 60% Badge (Candidate score > 60%)
  const overallAvg = (scores.pronunciationScore + scores.grammarScore + scores.fluencyScore + scores.vocabularyScore + scores.confidenceScore) / 5;
  if (overallAvg >= 60) {
    await award('score_above_60', 'Elite Placement Badge', 'Earned by achieving an overall communication score above 60%.');
  }

  // 5. Certificate of Achievement (ALL five skills >= 50)
  if (
    scores.pronunciationScore >= 50 &&
    scores.grammarScore >= 50 &&
    scores.fluencyScore >= 50 &&
    scores.vocabularyScore >= 50 &&
    scores.confidenceScore >= 50
  ) {
    await award('certificate_eligible', 'Placement Certified', 'All core communication dimensions scored >= 50%. Certified Placement Ready.');
  }
}

/**
 * Updates streak record for the candidate.
 */
async function updateStreak(userId: string) {
  const todayStr = new Date().toISOString().split('T')[0];
  let streak = await db.streaks.findOne({ userId });

  if (!streak) {
    streak = await db.streaks.insertOne({
      userId,
      currentStreak: 1,
      longestStreak: 1,
      lastActiveDate: todayStr,
    });
  } else {
    const lastDate = streak.lastActiveDate;
    if (lastDate === todayStr) {
      // Already active today, nothing to change
    } else {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (lastDate === yesterdayStr) {
        // Consecutive day
        const current = (streak.currentStreak || 0) + 1;
        const longest = Math.max(streak.longestStreak || 0, current);
        await db.streaks.updateOne({ userId }, {
          currentStreak: current,
          longestStreak: longest,
          lastActiveDate: todayStr,
        });
      } else {
        // Broke streak
        await db.streaks.updateOne({ userId }, {
          currentStreak: 1,
          lastActiveDate: todayStr,
        });
      }
    }
  }

  // Log activity
  const logs = await db.activityLogs.find({ userId, date: todayStr });
  if (logs.length === 0) {
    await db.activityLogs.insertOne({
      userId,
      date: todayStr,
      timeSpentMinutes: 10, // Default average session duration
      sessionsCount: 1,
    });
  } else {
    const existing = logs[0];
    await db.activityLogs.updateOne({ id: existing.id }, {
      timeSpentMinutes: (existing.timeSpentMinutes || 0) + 10,
      sessionsCount: (existing.sessionsCount || 0) + 1,
    });
  }
}
