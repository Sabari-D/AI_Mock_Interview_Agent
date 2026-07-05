import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Calculate cosine similarity between two vectors
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0.0;
  let normA = 0.0;
  let normB = 0.0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export interface ResumeChunk {
  text: string;
  vector?: number[];
}

export async function chunkAndEmbedResume(parsedText: string): Promise<ResumeChunk[]> {
  // Simple paragraph-based and sentence-based chunking
  const sentencesOrParas = parsedText
    .split(/\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20); // Keep meaningful paragraphs/lines

  const chunks: ResumeChunk[] = [];
  const apiKey = process.env.GEMINI_API_KEY;

  for (const text of sentencesOrParas) {
    if (apiKey) {
      try {
        const response: any = await ai.models.embedContent({
          model: 'gemini-embedding-2-preview',
          contents: text,
        });
        const embeddingValues = response.embedding?.values || response.embeddings?.[0]?.values;
        if (embeddingValues) {
          chunks.push({
            text,
            vector: embeddingValues,
          });
          continue;
        }
      } catch (err) {
        console.error('Embedding generation failed for chunk:', err);
      }
    }
    // Fallback if API call fails or apiKey is missing
    chunks.push({ text });
  }

  return chunks;
}

export async function retrieveRelevantChunks(
  chunks: ResumeChunk[],
  query: string,
  topK: number = 3
): Promise<string[]> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || chunks.every((c) => !c.vector)) {
    // Keyword matching fallback
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const scored = chunks.map((chunk) => {
      let score = 0;
      const lowerText = chunk.text.toLowerCase();
      for (const word of queryWords) {
        if (lowerText.includes(word)) {
          score += 1;
        }
      }
      return { chunk, score };
    });
    // Sort descending and take topK
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK).map((s) => s.chunk.text);
  }

  try {
    const queryEmbeddingResponse: any = await ai.models.embedContent({
      model: 'gemini-embedding-2-preview',
      contents: query,
    });
    const queryVector = queryEmbeddingResponse.embedding?.values || queryEmbeddingResponse.embeddings?.[0]?.values;
    if (!queryVector) {
      return chunks.slice(0, topK).map((c) => c.text);
    }

    const scoredChunks = chunks
      .filter((c) => c.vector)
      .map((chunk) => {
        const similarity = cosineSimilarity(chunk.vector!, queryVector);
        return { text: chunk.text, similarity };
      });

    scoredChunks.sort((a, b) => b.similarity - a.similarity);
    return scoredChunks.slice(0, topK).map((s) => s.text);
  } catch (err) {
    console.error('Error retrieving chunks with embeddings, fallback to first topK:', err);
    return chunks.slice(0, topK).map((c) => c.text);
  }
}
