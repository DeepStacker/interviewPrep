import Groq from 'groq-sdk';
import { config } from '../config/env';

const groq = new Groq({
  apiKey: config.ai.groqApiKey,
});

export interface GeneratedQuestion {
  text: string;
}

export interface EvaluationResult {
  score: number;
  strengths: string;
  missingPoints: string;
  idealAnswer: string;
}

export const generateQuestions = async (
  role: string,
  difficulty: string,
  numberOfQuestions: number = 5
): Promise<GeneratedQuestion[]> => {
  const systemPrompt = `You are an expert interview coach specializing in ${role} positions. Generate interview questions at ${difficulty} difficulty level.
  Return questions as a JSON array with exactly ${numberOfQuestions} questions in this format: {"questions": [{"text": "question 1"}, {"text": "question 2"}, ...]}`;

  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system' as const,
          content: systemPrompt,
        },
        {
          role: 'user',
          content: `Generate ${numberOfQuestions} ${difficulty} level interview questions for a ${role} position.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No response from Groq');

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid JSON response from Groq');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return parsed.questions || [];
  } catch (error) {
    console.error('Error generating questions:', error);
    throw error;
  }
};

export const evaluateAnswer = async (
  role: string,
  question: string,
  userAnswer: string,
  difficulty: string
): Promise<EvaluationResult> => {
  const systemPrompt = `You are an expert interview coach evaluating a ${role} candidate's response to an interview question at ${difficulty} difficulty.
  Evaluate their answer and respond with ONLY a valid JSON object (no markdown, no extra text) in this exact format:
  {"score": <1-10>, "strengths": "<what they did well>", "missingPoints": "<what they could improve>", "idealAnswer": "<example of a good answer>"}`;

  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system' as const,
          content: systemPrompt,
        },
        {
          role: 'user',
          content: `Question: ${question}\n\nCandidate's Answer: ${userAnswer}\n\nPlease evaluate this answer and provide constructive feedback.`,
        },
      ],
      temperature: 0.5,
      max_tokens: 1500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No response from Groq');

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Raw response:', content);
      throw new Error('Invalid JSON response from Groq');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate and normalize response
    const result: EvaluationResult = {
      score: Math.max(1, Math.min(10, parseInt(parsed.score) || 5)),
      strengths: parsed.strengths || 'Good effort',
      missingPoints: parsed.missingPoints || 'Could be more detailed',
      idealAnswer: parsed.idealAnswer || 'Consider expanding on your approach',
    };

    return result;
  } catch (error) {
    console.error('Error evaluating answer:', error);
    throw error;
  }
};
