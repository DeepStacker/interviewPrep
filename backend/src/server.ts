import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import * as dotenv from 'dotenv';
import { initializeDatabase } from './config/database';
import pool from './config/database';
import { config } from './config/env';
import { errorHandler } from './middleware/auth';

// Import routes
import authRoutes from './routes/auth';
import sessionsRoutes from './routes/sessions';
import questionsRoutes from './routes/questions';
import answersRoutes from './routes/answers';
import analyticsRoutes from './routes/analytics';
import behaviorRoutes from './routes/behavior';
import codingRoutes from './routes/coding';
import systemDesignRoutes from './routes/systemDesign';
import resumeRoutes from './routes/resume';
import roadmapRoutes from './routes/roadmap';
import mockInterviewRoutes from './routes/mockInterview';
import leaderboardRoutes from './routes/leaderboard';
import badgesRoutes from './routes/badges';
import companiesRoutes from './routes/companies';

dotenv.config();

const app = express();

// Security & Performance Middleware
app.use(helmet({
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
})); // Add security headers
app.use(compression()); // Gzip compression
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// CORS configuration
app.use(
  cors({
    origin: config.frontend.url || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Routes
app.use('/api', authRoutes);
app.use('/api', sessionsRoutes);
app.use('/api', questionsRoutes);
app.use('/api', answersRoutes);
app.use('/api', analyticsRoutes);
app.use('/api', behaviorRoutes);
app.use('/api', codingRoutes);
app.use('/api', systemDesignRoutes);
app.use('/api', resumeRoutes);
app.use('/api', roadmapRoutes);
app.use('/api', mockInterviewRoutes);
app.use('/api', leaderboardRoutes);
app.use('/api', badgesRoutes);
app.use('/api', companiesRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'OK' });
});

app.get('/healthz', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/readyz', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'ready' });
  } catch (error) {
    res.status(503).json({ status: 'not_ready' });
  }
});

// Error handler
app.use(errorHandler);

// Initialize and start server
export const startServer = async () => {
  try {
    // Initialize database
    await initializeDatabase();

    // Start server
    app.listen(config.app.port, () => {
      console.log(`🚀 Server running on port ${config.app.port}`);
      console.log(`Environment: ${config.app.nodeEnv}`);
      console.log(`Frontend URL: ${config.frontend.url}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

export default app;
