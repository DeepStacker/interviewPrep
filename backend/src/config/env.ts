import * as dotenv from 'dotenv';

dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';
const jwtSecret = process.env.JWT_SECRET || (isProduction ? undefined : 'dev-secret-key');

if (isProduction && !jwtSecret) {
  throw new Error('JWT_SECRET must be provided in production');
}

export const config = {
  app: {
    port: parseInt(process.env.PORT || '5000', 10),
    nodeEnv,
  },
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost/interviewPrep',
  },
  auth: {
    googleClientId: process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
    jwtSecret: jwtSecret || 'dev-secret-key',
  },
  ai: {
    provider: process.env.DEFAULT_AI_PROVIDER || 'groq',
    groqApiKey: process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY,
    openrouterKey: process.env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY,
    googleAiKey: process.env.GOOGLE_AI_KEY || process.env.VITE_GOOGLE_AI_KEY,
    cerebrasApiKey: process.env.CEREBRAS_API_KEY || process.env.VITE_CEREBRAS_API_KEY,
    xaiApiKey: process.env.XAI_API_KEY || process.env.VITE_XAI_API_KEY,
    aiModel: process.env.AI_MODEL || process.env.VITE_AI_MODEL || 'meta-llama/llama-3.3-70b-instruct:free',
  },
  coding: {
    judge0Url: process.env.JUDGE0_URL || 'https://ce.judge0.com',
    judge0ApiKey: process.env.JUDGE0_API_KEY,
  },
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:3000',
  },
};
