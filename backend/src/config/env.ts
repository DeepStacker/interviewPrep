import * as dotenv from 'dotenv';

dotenv.config();

export const config = {
  app: {
    port: parseInt(process.env.PORT || '5000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost/interviewPrep',
  },
  auth: {
    googleClientId: process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
    jwtSecret: process.env.JWT_SECRET || 'dev-secret-key',
  },
  ai: {
    provider: process.env.DEFAULT_AI_PROVIDER || 'groq',
    groqApiKey: process.env.GROQ_API_KEY,
    openrouterKey: process.env.OPENROUTER_API_KEY,
    googleAiKey: process.env.GOOGLE_AI_KEY,
  },
  coding: {
    judge0Url: process.env.JUDGE0_URL || 'https://ce.judge0.com',
    judge0ApiKey: process.env.JUDGE0_API_KEY,
  },
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:5173',
  },
};
