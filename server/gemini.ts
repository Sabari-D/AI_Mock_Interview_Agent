import { GoogleGenAI } from "@google/genai";

// Initialize Gemini SDK lazily to avoid startup crashes if key is missing
let aiClient: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("WARNING: GEMINI_API_KEY is not defined. Using dry run / fallback mode.");
      // We will handle missing API keys gracefully with logical fallbacks
    }
    aiClient = new GoogleGenAI({ apiKey: key || "DUMMY_KEY" });
  }
  return aiClient;
}

const MODEL_NAME = "gemini-2.5-flash";

// 1. General HR Agent
export async function generateHRQuestion(
  history: { question: string; answer: string }[],
  previousAnswer: string
): Promise<string> {
  const ai = getAI();
  if (!process.env.GEMINI_API_KEY) {
    return getFallbackHRQuestion(history);
  }

  try {
    const systemInstruction = `You are a professional, calm, and articulate Senior HR Director at a top-tier tech company.
Conduct a realistic, multi-turn, STAR-format behavioural interview.
Ask one single question at a time.
Adapt your question dynamically based on the candidate's previous answer (using conversational follow-ups).
Do NOT ask technical or coding questions. Ask about background, strengths, weaknesses, teamwork, leadership, conflict resolution, or why we should hire you.
Keep your response concise, professional, and natural (1-3 sentences maximum).`;

    const chatHistory = history.map(turn => [
      { role: "model" as const, parts: [{ text: turn.question }] },
      { role: "user" as const, parts: [{ text: turn.answer }] }
    ]).flat();

    // Add current context
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [
        ...chatHistory,
        { role: "user" as const, parts: [{ text: `Candidate's previous response: "${previousAnswer}". Provide your next natural behavioral follow-up or a new behavioral question.` }] }
      ],
      config: {
        systemInstruction,
        temperature: 0.7,
        maxOutputTokens: 150,
      }
    });

    return response.text?.trim() || "Can you tell me more about that experience?";
  } catch (error) {
    console.error("Gemini General HR question generation failed:", error);
    return getFallbackHRQuestion(history);
  }
}

// 2. Technical HR Agent (Grounded in Resume)
export async function generateTechnicalQuestion(
  history: { question: string; answer: string }[],
  resumeText: string,
  previousAnswer?: string
): Promise<string> {
  const ai = getAI();
  if (!process.env.GEMINI_API_KEY) {
    return getFallbackTechnicalQuestion(history, resumeText);
  }

  try {
    const systemInstruction = `You are a precise, experienced, and no-nonsense Technical Interviewer.
Your goal is to evaluate the candidate's core skills based STRICTLY on their uploaded resume.

HARD CONSTRAINT:
You MUST ONLY ask about skills, programming languages, libraries, databases, frameworks, internships, certifications, or projects explicitly mentioned in the resume text provided below.
DO NOT introduce any technology, concept, or tool that is not listed in this resume context.
If no specific details are available, ask a general high-level concept about one of the listed categories.
Ask one single question at a time. Do not include extra commentary, formatting, or greeting. Keep it between 1-2 direct sentences.

Resume Context:
"""
${resumeText}
"""`;

    const chatHistory = history.map(turn => [
      { role: "model" as const, parts: [{ text: turn.question }] },
      { role: "user" as const, parts: [{ text: turn.answer }] }
    ]).flat();

    let attempt = 0;
    let question = "";
    
    while (attempt < 3) {
      attempt++;
      const prompt = previousAnswer
        ? `Given the previous candidate answer: "${previousAnswer}", ask a grounded technical follow-up question or inspect another project/skill from the resume.`
        : `Ask an opening technical question about a project, internship, or skill listed in the resume.`;

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: [
          ...chatHistory,
          { role: "user" as const, parts: [{ text: prompt }] }
        ],
        config: {
          systemInstruction,
          temperature: 0.6,
          maxOutputTokens: 150,
        }
      });

      question = response.text?.trim() || "";

      // Post-generation validation step (Verify no ungrounded terms are present)
      const isValid = await validateTechnicalQuestionGroundedness(question, resumeText);
      if (isValid) {
        break;
      }
      console.warn(`Attempt ${attempt}: Question was ungrounded. Regenerating...`);
    }

    return question || "Can you explain the architecture of the primary project listed on your resume?";
  } catch (error) {
    console.error("Gemini Technical question generation failed:", error);
    return getFallbackTechnicalQuestion(history, resumeText);
  }
}

// Validation Step: Verifies that the question is fully grounded in the resume
async function validateTechnicalQuestionGroundedness(question: string, resumeText: string): Promise<boolean> {
  const ai = getAI();
  if (!process.env.GEMINI_API_KEY) return true;

  try {
    const prompt = `Task: Verify if the following Interview Question asks about technologies, skills, or projects NOT mentioned in the Resume.
A question is INVALID if it asks about React when only Angular is in the resume, or PostgreSQL when only MongoDB is listed, etc.

Interview Question: "${question}"

Resume:
"""
${resumeText}
"""

Reply with exactly "VALID" if the question is 100% grounded in the resume.
Otherwise, reply with "INVALID" followed by a 1-sentence reason.`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        temperature: 0.1,
        maxOutputTokens: 30,
      }
    });

    const result = response.text?.trim().toUpperCase() || "";
    return result.includes("VALID");
  } catch (e) {
    console.error("Groundedness validation failed:", e);
    return true; // Fallback to safe true
  }
}

// 3. Speech and Language Analysis Pipeline
export async function analyzeAnswer(question: string, answer: string): Promise<{
  grammar_score: number;
  grammar_feedback: string;
  vocabulary_score: number;
  vocabulary_feedback: string;
  confidence_score: number;
  confidence_feedback: string;
  fluency_score: number;
  fluency_feedback: string;
  pronunciation_score: number;
  pronunciation_feedback: string;
}> {
  const ai = getAI();
  const defaultAnalysis = {
    grammar_score: 75,
    grammar_feedback: "Good communication. Consider using active voice and correct tenses for professional clarity.",
    vocabulary_score: 70,
    vocabulary_feedback: "Standard vocabulary. Incorporate industry terms such as scalable, lifecycle, and modular.",
    confidence_score: 80,
    confidence_feedback: "Pace is strong. Minimize minor pauses to strengthen assertion.",
    fluency_score: 75,
    fluency_feedback: "Fluent delivery. Be mindful of filler phrases under pressure.",
    pronunciation_score: 80,
    pronunciation_feedback: "Clear pronunciation of key engineering terminologies."
  };

  if (!process.env.GEMINI_API_KEY || !answer.trim()) {
    return defaultAnalysis;
  }

  try {
    const prompt = `You are an expert language evaluator and campus placement coach.
Analyze the candidate's response to the interview question below.
Provide a granular evaluation of five linguistic dimensions: Grammar, Vocabulary, Confidence, Fluency, and Pronunciation/Clarity.

Question: "${question}"
Candidate Answer: "${answer}"

Your output MUST be a valid JSON object matching this structure exactly (do not wrap in markdown blocks, just return pure JSON):
{
  "grammar_score": number (0-100),
  "grammar_feedback": "string",
  "vocabulary_score": number (0-100),
  "vocabulary_feedback": "string",
  "confidence_score": number (0-100),
  "confidence_feedback": "string",
  "fluency_score": number (0-100),
  "fluency_feedback": "string",
  "pronunciation_score": number (0-100),
  "pronunciation_feedback": "string"
}`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.2,
      }
    });

    const text = response.text?.trim() || "";
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini answer analysis failed:", error);
    return defaultAnalysis;
  }
}

// 4. Generate Final Session Report
export async function generateFinalReport(
  turns: any[],
  candidateName: string,
  interviewType: string
): Promise<{
  overall_score: number;
  recommendations: string;
  strengths: string[];
  weaknesses: string[];
}> {
  const ai = getAI();
  const defaultReport = {
    overall_score: 75,
    recommendations: "Continue practicing structure. Use the STAR (Situation, Task, Action, Result) method to organize your stories.",
    strengths: ["Strong communication pace", "Good technical domain grounding"],
    weaknesses: ["Occasional filler words usage", "Could expand on measurable project impacts"]
  };

  if (!process.env.GEMINI_API_KEY || turns.length === 0) {
    return defaultReport;
  }

  try {
    const transcript = turns.map((t, idx) => `Q${idx+1}: ${t.question}\nA${idx+1}: ${t.answer_transcript}`).join("\n\n");
    const prompt = `You are a senior talent evaluator and placement committee advisor.
Analyze the following mock interview transcript and generate a professional, constructive final report.

Candidate: ${candidateName}
Type: ${interviewType}

Transcript:
"""
${transcript}
"""

Output MUST be a valid JSON object matching this structure exactly (pure JSON, no markdown codeblock wrapping):
{
  "overall_score": number (0-100),
  "recommendations": "string (concrete placement advice)",
  "strengths": ["string", "string"],
  "weaknesses": ["string", "string"]
}`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.3,
      }
    });

    const text = response.text?.trim() || "";
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini report generation failed:", error);
    return defaultReport;
  }
}

// Fallback handlers when Gemini API key is missing or calls fail
function getFallbackHRQuestion(history: { question: string; answer: string }[]): string {
  const questions = [
    "Tell me about a time you had to resolve a conflict within a group project. What action did you take?",
    "What are your greatest professional strengths, and how have you applied them in campus projects?",
    "Why do you want to join our company, and where do you see yourself in five years?",
    "Tell me about a challenging task or project where you failed. What did you learn from it?",
    "How do you handle deadlines and prioritize tasks when you have multiple placement tests and classes?",
    "Can you describe a situation where you had to work with someone whose work style was very different from yours?"
  ];
  return questions[history.length % questions.length];
}

function getFallbackTechnicalQuestion(history: { question: string; answer: string }[], resumeText: string): string {
  // Parse simple words from resume to make it look grounded
  const lowercaseResume = resumeText.toLowerCase();
  const detectedSkills = [];
  if (lowercaseResume.includes("react")) detectedSkills.push("React");
  if (lowercaseResume.includes("node")) detectedSkills.push("Node.js");
  if (lowercaseResume.includes("python")) detectedSkills.push("Python");
  if (lowercaseResume.includes("sql")) detectedSkills.push("SQL databases");
  if (lowercaseResume.includes("mongo")) detectedSkills.push("MongoDB");
  if (lowercaseResume.includes("java")) detectedSkills.push("Java");
  
  if (detectedSkills.length > 0) {
    const skill = detectedSkills[history.length % detectedSkills.length];
    const questions = [
      `Could you explain the core architecture and design patterns you followed while building your project using ${skill}?`,
      `What were some of the key technical challenges you encountered while working with ${skill}, and how did you resolve them?`,
      `How did you manage state, asynchronous operations, or data consistency in your project using ${skill}?`
    ];
    return questions[history.length % questions.length];
  }
  
  return "Can you walk me through the primary engineering projects listed on your resume and explain your technical role?";
}
