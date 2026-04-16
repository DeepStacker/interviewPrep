import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import {
  saveBehaviorMetrics,
  generateSessionBehaviorSummary,
  generateBehavioralInsights,
  BehaviorMetrics,
} from '../services/behaviorService';
import {
  analyzeVoice,
  analyzeBehavior,
  calculateResponseTime,
  saveVideoRecording,
  saveScreenRecording,
} from '../services/mediaService';
import pool from '../config/database';

const router = Router();

// Submit and analyze behavior metrics for an answer
router.post('/behavior/submit', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const {
      answerId,
      userAnswer,
      videoData,
      screenData,
      audioData,
      questionShownAt,
    } = req.body;

    if (!answerId || !userAnswer) {
      res.status(400).json({ error: 'answerId and userAnswer are required' });
      return;
    }

    const ownership = await pool.query(
      `SELECT a.id, q.session_id
       FROM answers a
       JOIN questions q ON q.id = a.question_id
       JOIN sessions s ON s.id = q.session_id
       WHERE a.id = $1 AND s.user_id = $2`,
      [answerId, req.userId]
    );

    if (ownership.rows.length === 0) {
      res.status(404).json({ error: 'Answer not found' });
      return;
    }

    const sessionId = ownership.rows[0].session_id as number;

    const audioBuffer = decodeMediaPayload(audioData);
    const videoBuffer = decodeMediaPayload(videoData);
    const screenBuffer = decodeMediaPayload(screenData);

    const videoSavePromise =
      videoBuffer.length > 0
        ? saveVideoRecording(videoBuffer, sessionId, answerId)
        : Promise.resolve<string | undefined>(undefined);

    const screenSavePromise =
      screenBuffer.length > 0
        ? saveScreenRecording(screenBuffer, sessionId, answerId)
        : Promise.resolve<string | undefined>(undefined);

    const voicePromise = analyzeVoice(audioBuffer, userAnswer);
    const behaviorPromise =
      videoBuffer.length > 0
        ? analyzeBehavior(videoBuffer)
        : Promise.resolve<Awaited<ReturnType<typeof analyzeBehavior>> | null>(null);

    const [videoRecordingUrl, screenRecordingUrl, voiceAnalysis, behaviorAnalysis] = await Promise.all([
      videoSavePromise,
      screenSavePromise,
      voicePromise,
      behaviorPromise,
    ]);

    // Calculate response time
    const responseTime = questionShownAt
      ? calculateResponseTime(
          new Date(questionShownAt),
          new Date()
        )
      : 0;

    // Create behavior metrics
    const metrics: BehaviorMetrics = {
      answerId,
      confidence: behaviorAnalysis?.confidence || voiceAnalysis.confidence,
      speakingPace:
        (voiceAnalysis.speakingPace / 150) * 10, // Normalize to 1-10 scale
      pauseFrequency: voiceAnalysis.pauseData.count,
      eyeContactPercentage: (behaviorAnalysis?.eyeContact || 75) / 10, // Normalize
      facialExpressionScore: behaviorAnalysis?.facialExpression || 7,
      bodyMovementScore: behaviorAnalysis?.bodyMovement || 6,
      voiceClarity: voiceAnalysis.voiceClarity,
      voiceToneConfidence: voiceAnalysis.confidence,
      speakingDurationSeconds: Math.ceil(
        voiceAnalysis.wordCount / (voiceAnalysis.speakingPace / 60)
      ),
      silenceDurationSeconds: Math.ceil(
        voiceAnalysis.pauseData.totalDuration
      ),
      wordCount: voiceAnalysis.wordCount,
      uniqueWords: voiceAnalysis.uniqueWords,
      fillerWordsCount: voiceAnalysis.fillerWords.count,
      fillerWordPercentage: voiceAnalysis.fillerWords.percentage,
      responseTimeSeconds: responseTime,
      videoRecordingUrl,
      screenRecordingUrl,
      audioTranscript: voiceAnalysis.transcript,
      overallBehaviorScore: calculateOverallBehaviorScore({
        confidence: behaviorAnalysis?.confidence || voiceAnalysis.confidence,
        eyeContact: behaviorAnalysis?.eyeContact || 75,
        voiceClarity: voiceAnalysis.voiceClarity,
        facialExpression: behaviorAnalysis?.facialExpression || 7,
        fillerPercentage: voiceAnalysis.fillerWords.percentage,
      }),
    };

    // Save behavior metrics
    const savedMetrics = await saveBehaviorMetrics(metrics);

    res.status(201).json(savedMetrics);
  } catch (error) {
    console.error('Behavior submission error:', error);
    res.status(500).json({ error: 'Failed to submit behavior data' });
  }
});

// Get behavior metrics for an answer
router.get('/behavior/answer/:answerId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const result = await pool.query(
      `SELECT bm.* FROM behavior_metrics bm
       JOIN answers a ON bm.answer_id = a.id
       JOIN questions q ON a.question_id = q.id
       JOIN sessions s ON q.session_id = s.id
       WHERE bm.answer_id = $1 AND s.user_id = $2`,
      [req.params.answerId, req.userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Behavior metrics not found' });
      return;
    }

    res.json(mapBehaviorRow(result.rows[0]));
  } catch (error) {
    console.error('Get behavior metrics error:', error);
    res.status(500).json({ error: 'Failed to get behavior metrics' });
  }
});

// Get session behavior summary
router.get('/behavior/session/:sessionId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Verify session ownership
    const sessionResult = await pool.query(
      'SELECT * FROM sessions WHERE id = $1 AND user_id = $2',
      [req.params.sessionId, req.userId]
    );

    if (sessionResult.rows.length === 0) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    // Get or generate behavior summary
    let summaryResult = await pool.query(
      'SELECT * FROM session_behavior_summary WHERE session_id = $1',
      [req.params.sessionId]
    );

    if (summaryResult.rows.length === 0) {
      // Generate summary if not exists
      try {
        await generateSessionBehaviorSummary(parseInt(req.params.sessionId as string));
        summaryResult = await pool.query(
          'SELECT * FROM session_behavior_summary WHERE session_id = $1',
          [req.params.sessionId as string]
        );
      } catch (error) {
        // No behavior data yet
        res.status(404).json({ error: 'No behavior data available yet' });
        return;
      }
    }

    res.json(mapBehaviorSummaryRow(summaryResult.rows[0]));
  } catch (error) {
    console.error('Get session behavior summary error:', error);
    res.status(500).json({ error: 'Failed to get behavior summary' });
  }
});

// Get behavioral insights for session
router.get('/behavior/insights/:sessionId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Verify session ownership
    const sessionResult = await pool.query(
      'SELECT * FROM sessions WHERE id = $1 AND user_id = $2',
      [req.params.sessionId, req.userId]
    );

    if (sessionResult.rows.length === 0) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const insightsResult = await pool.query(
      'SELECT * FROM behavioral_insights WHERE session_id = $1',
      [req.params.sessionId]
    );

    if (insightsResult.rows.length === 0) {
      res.status(404).json({ error: 'No insights available yet' });
      return;
    }

    res.json(mapInsightsRow(insightsResult.rows[0]));
  } catch (error) {
    console.error('Get behavioral insights error:', error);
    res.status(500).json({ error: 'Failed to get insights' });
  }
});

// Get all behavior metrics for a session
router.get('/behavior/session/:sessionId/all', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Verify session ownership
    const sessionResult = await pool.query(
      'SELECT * FROM sessions WHERE id = $1 AND user_id = $2',
      [req.params.sessionId, req.userId]
    );

    if (sessionResult.rows.length === 0) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const metricsResult = await pool.query(
      `SELECT bm.* FROM behavior_metrics bm
       JOIN answers a ON bm.answer_id = a.id
       JOIN questions q ON a.question_id = q.id
       WHERE q.session_id = $1
       ORDER BY q.question_number ASC`,
      [req.params.sessionId]
    );

    res.json(metricsResult.rows.map(mapBehaviorRow));
  } catch (error) {
    console.error('Get session behavior metrics error:', error);
    res.status(500).json({ error: 'Failed to get behavior metrics' });
  }
});

const calculateOverallBehaviorScore = (data: {
  confidence: number;
  eyeContact: number;
  voiceClarity: number;
  facialExpression: number;
  fillerPercentage: number;
}): number => {
  const weights = {
    confidence: 0.25,
    eyeContact: 0.2,
    voiceClarity: 0.2,
    facialExpression: 0.15,
    fillerWords: 0.2,
  };

  const fillerScore = Math.max(0, 10 - data.fillerPercentage);

  const score =
    (data.confidence / 10) * 10 * weights.confidence +
    (data.eyeContact / 100) * 10 * weights.eyeContact +
    data.voiceClarity * weights.voiceClarity +
    data.facialExpression * weights.facialExpression +
    fillerScore * weights.fillerWords;

  return Math.round(score * 10) / 10;
};

const mapBehaviorRow = (row: any) => ({
  id: row.id,
  answerId: row.answer_id,
  confidence: row.confidence,
  speakingPace: row.speaking_pace,
  pauseFrequency: row.pause_frequency,
  eyeContactPercentage: row.eye_contact_percentage,
  facialExpressionScore: row.facial_expression_score,
  bodyMovementScore: row.body_movement_score,
  voiceClarity: row.voice_clarity,
  voiceToneConfidence: row.voice_tone_confidence,
  speakingDurationSeconds: row.speaking_duration_seconds,
  silenceDurationSeconds: row.silence_duration_seconds,
  wordCount: row.word_count,
  uniqueWords: row.unique_words,
  fillerWordsCount: row.filler_words_count,
  fillerWordPercentage: row.filler_word_percentage,
  responseTimeSeconds: row.response_time_seconds,
  videoRecordingUrl: row.video_recording_url,
  screenRecordingUrl: row.screen_recording_url,
  audioTranscript: row.audio_transcript,
  overallBehaviorScore: row.overall_behavior_score,
  createdAt: row.created_at,
});

const mapBehaviorSummaryRow = (row: any) => ({
  id: row.id,
  sessionId: row.session_id,
  avgConfidence: row.avg_confidence,
  avgEyeContact: row.avg_eye_contact,
  avgSpeakingPace: row.avg_speaking_pace,
  avgVoiceClarity: row.avg_voice_clarity,
  avgFacialExpression: row.avg_facial_expression,
  avgBodyMovement: row.avg_body_movement,
  totalFillerWords: row.total_filler_words,
  avgFillerWordPercentage: row.avg_filler_word_percentage,
  totalSpeakingDurationSeconds: row.total_speaking_duration_seconds,
  consistencyScore: row.consistency_score,
  improvementTrend: row.improvement_trend,
});

const mapInsightsRow = (row: any) => ({
  id: row.id,
  sessionId: row.session_id,
  strengthsIdentified: row.strengths_identified,
  areasForImprovement: row.areas_for_improvement,
  confidenceLevel: row.confidence_level,
  communicationStyle: row.communication_style,
  bodyLanguageFeedback: row.body_language_feedback,
  eyeContactFeedback: row.eye_contact_feedback,
  pacingFeedback: row.pacing_feedback,
  articulationFeedback: row.articulation_feedback,
  overallPresentationScore: row.overall_presentation_score,
  recommendations: row.recommendations,
});

const decodeMediaPayload = (payload: unknown): Buffer => {
  if (typeof payload !== 'string' || payload.trim().length === 0) {
    return Buffer.from([]);
  }

  const raw = payload.includes(',') ? payload.split(',')[1] : payload;
  try {
    return Buffer.from(raw, 'base64');
  } catch {
    return Buffer.from([]);
  }
};

export default router;
