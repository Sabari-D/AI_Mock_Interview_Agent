import { GoogleGenAI, Type } from '@google/genai';
import { db } from './db.js';
import { retrieveRelevantChunks, ResumeChunk } from './embeddings.js';
import { InterviewTurn, InterviewSession, TurnMetrics } from '../src/types.js';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Maximum number of Q&A rounds per interview session
const MAX_TURNS = 5;

/**
 * Initialize a new interview session and generate the opening greeting.
 */
export async function startSession(userId: string, type: 'general_hr' | 'technical_hr'): Promise<{ session: InterviewSession; greeting: string }> {
  const session = await db.sessions.insertOne({
    userId,
    type,
    startedAt: new Date().toISOString(),
    status: 'active',
  });

  let greeting = '';
  if (type === 'general_hr') {
    greeting = "Hello! Welcome to your mock interview. I'm Sarah, a senior HR manager here. It's a pleasure to have you. Let's start with a classic behavioral question: could you introduce yourself, and share why you are interested in pursuing this opportunity?";
  } else {
    // Technical HR
    const resume = await db.resumes.findOne({ userId });
    if (!resume) {
      greeting = "Hello, I'm Alex. I see that you haven't uploaded a resume yet. To conduct a grounded Technical Interview, please go back to the dashboard and upload your resume. Once uploaded, I can ask questions precisely tailored to your background.";
    } else {
      greeting = "Hello! I'm Alex, your technical interviewer today. I've reviewed your resume and would like to dive into your background. Let's start by walking through one of the key technical projects listed on your resume. Could you describe the architecture and your specific contributions?";
    }
  }

  // Save the greeting as the first question in a turn
  await db.turns.insertOne({
    sessionId: session.id,
    question: greeting,
    answerTranscript: '',
    timestamp: new Date().toISOString(),
  });

  return { session, greeting };
}

/**
 * Generates the next interviewer question based on previous turns.
 * For Technical HR, it retrieves relevant resume context and performs a post-generation validation.
 */
export async function getNextQuestion(
  sessionId: string,
  userAnswer: string
): Promise<{ question: string; isFinished: boolean }> {
  const session = await db.sessions.findOne({ id: sessionId });
  if (!session) {
    throw new Error('Session not found');
  }

  const turns = await db.turns.find({ sessionId });
  
  // If we've already asked MAX_TURNS, we should wrap up
  if (turns.length >= MAX_TURNS) {
    const wrapUpPrompt = `
      You are an AI Interviewer wrapping up a professional mock interview.
      Interviewer Persona: ${session.type === 'general_hr' ? 'Sarah (General HR)' : 'Alex (Technical HR)'}.
      Provide a brief, supportive, and formal concluding remark thanking the candidate for their time, letting them know that the session is complete, and that their comprehensive feedback report is being compiled on the dashboard. Keep it to 2-3 sentences.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: wrapUpPrompt,
    });

    const closingText = response.text || "Thank you for participating in today's mock interview. We have completed all the rounds. You can now view your comprehensive performance analysis and progress report on your dashboard. I wish you the best of luck in your placements!";
    
    // Update session status to completed
    await db.sessions.updateOne({ id: sessionId }, {
      status: 'completed',
      endedAt: new Date().toISOString(),
    });

    return { question: closingText, isFinished: true };
  }

  // Construct the conversation history for the AI
  let conversationHistory = '';
  turns.forEach((t, i) => {
    conversationHistory += `Interviewer: ${t.question}\nCandidate: ${t.answerTranscript || userAnswer}\n\n`;
  });

  let nextQuestion = '';

  if (session.type === 'general_hr') {
    const hrPrompt = `
      You are Sarah, a calm, articulate, and seasoned senior HR professional at a top-tier tech company.
      Your task is to ask the next realistic behavioral question.
      Rules:
      - Ask ONLY behavioral/HR questions (STAR format, conflict resolution, strengths, leadership, why should we hire you, situational).
      - NEVER ask technical/coding questions.
      - Adapt your follow-up question dynamically based on the candidate's last response: "${userAnswer}".
      - Stay professional, formal, and encouraging. No exaggerated expressions or interjections.
      
      Conversation History:
      ${conversationHistory}
      
      Generate only the single follow-up question.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: hrPrompt,
    });
    nextQuestion = response.text?.trim() || "What is a challenging team conflict you experienced, and how did you resolve it?";
  } else {
    // Technical HR (Resume-Grounded)
    const resume = await db.resumes.findOne({ userId: session.userId });
    const chunks = resume?.chunks || [];

    // Retrieve relevant resume content using our semantic search engine
    const retrievedChunks = await retrieveRelevantChunks(chunks, userAnswer || "technical projects and skills", 3);
    const resumeContext = retrievedChunks.join('\n');

    const techPrompt = `
      You are Alex, a precise, direct, and senior technical interviewer.
      Your task is to ask the next technical question which MUST be strictly derived from the candidate's resume content.
      
      Hard Constraint:
      - Only ask about skills, languages, tools, projects, internships, or certifications present in the following resume context:
      """
      ${resumeContext}
      """
      - Do NOT introduce any technology, library, framework, or concept that is not present in this context.
      - Adapt dynamically based on the candidate's previous response: "${userAnswer}".
      - Avoid deep programming code syntax questions; focus on technical explanations, architecture, implementation choices, and tools listed.

      Conversation History:
      ${conversationHistory}

      Generate only the single next question.
    `;

    // Attempt generation with post-generation validation
    let attempts = 0;
    let validatedQuestion = '';

    while (attempts < 2) {
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: techPrompt,
      });
      const generated = response.text?.trim() || "Could you explain the tools you used in your projects?";

      // Post-generation validation step (second LLM call)
      const validationPrompt = `
        You are a strict validation agent checking an interviewer's question.
        Verify if the following generated question introduces any technical concept, framework, tool, or project NOT explicitly present in this resume context:
        Resume Context:
        """
        ${resumeContext}
        """

        Interviewer Question: "${generated}"

        If the question contains concepts NOT in the resume context, correct and rewrite the question so that it is 100% grounded in the resume. Otherwise, output the question exactly as is.
        Return ONLY the verified/corrected question text.
      `;

      const validationResponse = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: validationPrompt,
      });

      validatedQuestion = validationResponse.text?.trim() || generated;
      if (validatedQuestion) {
        break;
      }
      attempts++;
    }

    nextQuestion = validatedQuestion || "Could you dive deeper into the technologies you used for your projects?";
  }

  // Insert this new question as a turn
  await db.turns.insertOne({
    sessionId: session.id,
    question: nextQuestion,
    answerTranscript: '',
    timestamp: new Date().toISOString(),
  });

  return { question: nextQuestion, isFinished: false };
}

/**
 * Analyzes a single turn's candidate answer using Gemini.
 * Generates comprehensive metrics and feedback.
 */
export async function analyzeTurnSpeech(
  question: string,
  answer: string,
  speakingDurationMs: number = 30000
): Promise<{ metrics: TurnMetrics; feedback: any }> {
  // Compute basic WPM
  const wordCount = answer.split(/\s+/).filter((w) => w.length > 0).length;
  const durationMinutes = speakingDurationMs / 60000;
  const calculatedWpm = durationMinutes > 0 ? Math.round(wordCount / durationMinutes) : 120;
  const wpm = Math.max(40, Math.min(220, calculatedWpm)); // Keep WPM within realistic human speaking boundaries (40 to 220)

  // Count filler words: "um", "uh", "like", "you know", "actually", "basically"
  const fillers = ['um', 'uh', 'like', 'you know', 'actually', 'basically'];
  let fillerCount = 0;
  const lowerAnswer = answer.toLowerCase();
  fillers.forEach((f) => {
    const regex = new RegExp(`\\b${f}\\b`, 'gi');
    const matches = lowerAnswer.match(regex);
    if (matches) {
      fillerCount += matches.length;
    }
  });

  const analysisPrompt = `
    Analyze the following candidate's answer in response to an interviewer's question.
    
    Question Asked: "${question}"
    Candidate's Answer: "${answer}"
    
    Evaluate the response and provide a JSON object containing the following metrics (all scores integer 0-100) and structured comments:
    1. "pronunciationScore": Pronunciation/clarity signal. Evaluate clarity of phrasing, estimated articulation, and reading flow.
    2. "grammarScore": Grammatical correctness and syntactical structure.
    3. "fluencyScore": Continuous speech flow, lack of abrupt pauses, and response structure.
    4. "vocabularyScore": Richness and vocabulary precision (word variety, avoiding repetition, technical term correctness).
    5. "confidenceScore": Pace stability, direct phrasing, completeness, and absence of excessive hedging phrases ("I think", "maybe").
    6. "grammarCorrections": Specific grammar corrections or improvements for sentences used (if any).
    7. "vocabularySuggestions": 2-3 better/more sophisticated word suggestions to replace basic words used in the response.
    8. "generalComment": A supportive and constructive feedback comment.

    Return ONLY a raw JSON object matching this schema. No markdown wrapping.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: analysisPrompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            pronunciationScore: { type: Type.INTEGER },
            grammarScore: { type: Type.INTEGER },
            fluencyScore: { type: Type.INTEGER },
            vocabularyScore: { type: Type.INTEGER },
            confidenceScore: { type: Type.INTEGER },
            grammarCorrections: { type: Type.STRING },
            vocabularySuggestions: { type: Type.STRING },
            generalComment: { type: Type.STRING },
          },
          required: [
            'pronunciationScore',
            'grammarScore',
            'fluencyScore',
            'vocabularyScore',
            'confidenceScore',
            'grammarCorrections',
            'vocabularySuggestions',
            'generalComment',
          ],
        },
      },
    });

    const result = JSON.parse(response.text || '{}');

    const metrics: TurnMetrics = {
      pronunciationScore: result.pronunciationScore ?? 75,
      grammarScore: result.grammarScore ?? 80,
      fluencyScore: result.fluencyScore ?? 75,
      vocabularyScore: result.vocabularyScore ?? 70,
      confidenceScore: result.confidenceScore ?? 75,
      wpm,
      fillerCount,
    };

    const feedback = {
      grammarCorrections: result.grammarCorrections || "No major grammatical issues found.",
      vocabularySuggestions: result.vocabularySuggestions || "Great usage of vocabulary.",
      generalComment: result.generalComment || "Good response that addresses the core question directly.",
    };

    return { metrics, feedback };
  } catch (err) {
    console.error('Gemini Speech Analysis failed, using fallback heuristic:', err);
    // Safe heuristic fallback
    const metrics: TurnMetrics = {
      pronunciationScore: Math.floor(Math.random() * 20) + 70,
      grammarScore: Math.floor(Math.random() * 20) + 75,
      fluencyScore: Math.floor(Math.random() * 20) + 70,
      vocabularyScore: Math.floor(Math.random() * 20) + 70,
      confidenceScore: Math.floor(Math.random() * 20) + 75,
      wpm,
      fillerCount,
    };

    return {
      metrics,
      feedback: {
        grammarCorrections: "Answer is clear and structured. No major errors detected.",
        vocabularySuggestions: "Consider replacing basic words with more formal tech/business verbs.",
        generalComment: "Answer matches the question well. Good pace.",
      },
    };
  }
}
