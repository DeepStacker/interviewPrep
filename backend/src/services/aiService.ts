import Groq from 'groq-sdk';
import axios from 'axios';
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
  numberOfQuestions: number = 5,
  context?: { interviewType?: string; companyType?: string }
): Promise<GeneratedQuestion[]> => {
  const interviewType = context?.interviewType || 'mixed';
  const companyType = context?.companyType || 'startup';
  const systemPrompt = `You are an expert interview coach specializing in ${role} positions. Generate interview questions at ${difficulty} difficulty level.
  Interview type: ${interviewType}. Company context: ${companyType}.
  Return questions as a JSON array with exactly ${numberOfQuestions} questions in this format: {"questions": [{"text": "question 1"}, {"text": "question 2"}, ...]}`;

  try {
    const prompt = `Generate ${numberOfQuestions} ${difficulty} level ${interviewType} interview questions for a ${role} position at a ${companyType} company.`;
    const content = await getAiResponse(systemPrompt, prompt, {
      temperature: 0.7,
      maxTokens: 2000,
    });

    return parseQuestionsFromContent(
      content,
      role,
      difficulty,
      numberOfQuestions,
      interviewType,
      companyType
    );
  } catch (error) {
    console.error('Error generating questions:', error);
    return buildFallbackQuestions(role, difficulty, numberOfQuestions, interviewType, companyType);
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
    const prompt = `Question: ${question}\n\nCandidate's Answer: ${userAnswer}\n\nPlease evaluate this answer and provide constructive feedback.`;
    const content = await getAiResponse(systemPrompt, prompt, {
      temperature: 0.5,
      maxTokens: 1500,
    });

    return parseEvaluationFromContent(content);
  } catch (error) {
    console.error('Error evaluating answer:', error);
    return buildFallbackEvaluation(role, question, userAnswer);
  }
};

const getAiResponse = async (
  systemPrompt: string,
  userPrompt: string,
  options: { temperature: number; maxTokens: number }
): Promise<string> => {
  const errors: unknown[] = [];

  try {
    if (config.ai.groqApiKey) {
      const content = await callGroq(systemPrompt, userPrompt, options);
      if (content) return content;
    }
  } catch (error) {
    errors.push(error);
    console.error('Groq provider failed:', error);
  }

  try {
    if (config.ai.openrouterKey) {
      const content = await callOpenRouter(systemPrompt, userPrompt, options);
      if (content) return content;
    }
  } catch (error) {
    errors.push(error);
    console.error('OpenRouter provider failed:', error);
  }

  try {
    if (config.ai.googleAiKey) {
      const content = await callGoogleAi(systemPrompt, userPrompt);
      if (content) return content;
    }
  } catch (error) {
    errors.push(error);
    console.error('Google AI provider failed:', error);
  }

  if (errors.length > 0) {
    throw errors[errors.length - 1];
  }

  throw new Error('No AI provider configured');
};

const callGroq = async (
  systemPrompt: string,
  userPrompt: string,
  options: { temperature: number; maxTokens: number }
): Promise<string> => {
  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system' as const,
        content: systemPrompt,
      },
      {
        role: 'user',
        content: userPrompt,
      },
    ],
    temperature: options.temperature,
    max_tokens: options.maxTokens,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from Groq');
  }

  return content;
};

const callOpenRouter = async (
  systemPrompt: string,
  userPrompt: string,
  options: { temperature: number; maxTokens: number }
): Promise<string> => {
  const response = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      model: config.ai.aiModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: options.temperature,
      max_tokens: options.maxTokens,
    },
    {
      headers: {
        Authorization: `Bearer ${config.ai.openrouterKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 20000,
    }
  );

  const content = response.data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('No response from OpenRouter');
  }

  return content;
};

const callGoogleAi = async (
  systemPrompt: string,
  userPrompt: string
): Promise<string> => {
  const model = 'gemini-1.5-flash';
  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.ai.googleAiKey}`,
    {
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
        },
      ],
    },
    {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 20000,
    }
  );

  const content = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) {
    throw new Error('No response from Google AI');
  }

  return content;
};

const parseQuestionsFromContent = (
  content: string,
  role: string,
  difficulty: string,
  numberOfQuestions: number,
  interviewType: string,
  companyType: string
): GeneratedQuestion[] => {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return buildFallbackQuestions(role, difficulty, numberOfQuestions, interviewType, companyType);
  }

  const parsed = JSON.parse(jsonMatch[0]);
  const questions = Array.isArray(parsed.questions)
    ? parsed.questions.filter((q: any) => typeof q?.text === 'string' && q.text.trim().length > 0)
    : [];

  if (questions.length === 0) {
    return buildFallbackQuestions(role, difficulty, numberOfQuestions, interviewType, companyType);
  }

  return questions.slice(0, numberOfQuestions);
};

const parseEvaluationFromContent = (content: string): EvaluationResult => {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Invalid JSON response from AI provider');
  }

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    score: Math.max(1, Math.min(10, parseInt(parsed.score) || 5)),
    strengths: parsed.strengths || 'Good effort',
    missingPoints: parsed.missingPoints || 'Could be more detailed',
    idealAnswer: parsed.idealAnswer || 'Consider expanding on your approach',
  };
};

const buildFallbackQuestions = (
  role: string,
  difficulty: string,
  numberOfQuestions: number,
  interviewType: string,
  companyType: string
): GeneratedQuestion[] => {
  const roleText = role?.trim() || 'software engineer';
  const difficultyText = difficulty?.trim() || 'medium';
  const type = (interviewType || 'mixed').toLowerCase();

  const technicalQuestions = [
    `Tell me about a recent project where you had the largest impact as a ${roleText}.`,
    `How do you break down a complex ${roleText} problem and communicate your approach?`,
    `Describe a production issue you handled end-to-end and what you learned from it.`,
    `What trade-offs do you consider when choosing between speed of delivery and code quality?`,
    `How do you validate that a feature is correct before release?`,
    `How would you improve reliability and observability for a service owned by the ${roleText} team?`,
    `What metrics would you track to evaluate success after shipping a new feature?`,
  ];

  const behavioralQuestions = [
    `Explain a time you disagreed with a teammate on technical direction and how you resolved it.`,
    `Describe a moment when you had to influence stakeholders without direct authority.`,
    `Tell me about a failure in your work and what changed in your approach afterward.`,
    `How do you prioritize competing deadlines under pressure?`,
    `Share an example of mentoring or unblocking another engineer.`,
  ];

  const systemDesignQuestions = [
    `Design a notification platform that supports millions of users with low latency.`,
    `How would you design a scalable feature flag service used by many teams?`,
    `Design a job queue system for asynchronous ${roleText} workloads.`,
    `How would you detect and handle cascading failures in a distributed system?`,
    `Design a metrics and alerting pipeline for critical product flows.`,
  ];

  let baseQuestions: string[];
  if (type === 'technical') {
    baseQuestions = technicalQuestions;
  } else if (type === 'behavioral') {
    baseQuestions = behavioralQuestions;
  } else if (type === 'system_design') {
    baseQuestions = systemDesignQuestions;
  } else if (type === 'rapid_fire') {
    baseQuestions = [...technicalQuestions, ...behavioralQuestions].map((q) => `Rapid fire: ${q}`);
  } else {
    baseQuestions = [...technicalQuestions.slice(0, 4), ...behavioralQuestions.slice(0, 2), ...systemDesignQuestions.slice(0, 2)];
  }

  if ((companyType || '').toLowerCase() === 'mnc') {
    baseQuestions.push('How do you balance long-term architecture goals with compliance and process constraints in large organizations?');
  }

  if ((companyType || '').toLowerCase() === 'startup') {
    baseQuestions.push('How would you ship a robust MVP quickly with limited engineering resources?');
  }

  const selected = baseQuestions.slice(0, Math.max(1, numberOfQuestions));
  return selected.map((text) => ({
    text: `[${difficultyText.toUpperCase()}] ${text}`,
  }));
};

const buildFallbackEvaluation = (
  role: string,
  question: string,
  userAnswer: string
): EvaluationResult => {
  const answerLength = userAnswer.trim().length;
  const score = Math.max(4, Math.min(8, Math.round(answerLength / 120) + 4));
  const conciseQuestion = question.trim() || `the ${role} interview question`;

  return {
    score,
    strengths:
      answerLength > 80
        ? 'Your response includes concrete context and shows structured thinking.'
        : 'Your response addresses the question and provides a clear starting point.',
    missingPoints:
      'Add measurable outcomes, key trade-offs, and one short example of execution details.',
    idealAnswer:
      `A strong answer to "${conciseQuestion}" should briefly describe context, your decisions, trade-offs considered, and measurable impact.`,
  };
};
