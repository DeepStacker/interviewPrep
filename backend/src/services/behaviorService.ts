import pool from '../config/database';

export interface BehaviorMetrics {
  answerId: number;
  confidence: number;
  speakingPace: number;
  pauseFrequency: number;
  eyeContactPercentage: number;
  facialExpressionScore: number;
  bodyMovementScore: number;
  voiceClarity: number;
  voiceToneConfidence: number;
  speakingDurationSeconds: number;
  silenceDurationSeconds: number;
  wordCount: number;
  uniqueWords: number;
  fillerWordsCount: number;
  fillerWordPercentage: number;
  responseTimeSeconds: number;
  videoRecordingUrl?: string;
  screenRecordingUrl?: string;
  audioTranscript?: string;
  overallBehaviorScore: number;
}

export interface SessionBehaviorSummary {
  sessionId: number;
  avgConfidence: number;
  avgEyeContact: number;
  avgSpeakingPace: number;
  avgVoiceClarity: number;
  avgFacialExpression: number;
  avgBodyMovement: number;
  totalFillerWords: number;
  avgFillerWordPercentage: number;
  totalSpeakingDurationSeconds: number;
  consistencyScore: number;
  improvementTrend: number;
}

export interface BehavioralInsights {
  sessionId: number;
  strengthsIdentified: string;
  areasForImprovement: string;
  confidenceLevel: string;
  communicationStyle: string;
  bodyLanguageFeedback: string;
  eyeContactFeedback: string;
  pacingFeedback: string;
  articulationFeedback: string;
  overallPresentationScore: number;
  recommendations: string;
}

export const saveBehaviorMetrics = async (
  metrics: BehaviorMetrics
): Promise<any> => {
  try {
    const result = await pool.query(
      `INSERT INTO behavior_metrics (
        answer_id, confidence, speaking_pace, pause_frequency, eye_contact_percentage,
        facial_expression_score, body_movement_score, voice_clarity, voice_tone_confidence,
        speaking_duration_seconds, silence_duration_seconds, word_count, unique_words,
        filler_words_count, filler_word_percentage, response_time_seconds,
        video_recording_url, screen_recording_url, audio_transcript, overall_behavior_score
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *`,
      [
        metrics.answerId,
        metrics.confidence,
        metrics.speakingPace,
        metrics.pauseFrequency,
        metrics.eyeContactPercentage,
        metrics.facialExpressionScore,
        metrics.bodyMovementScore,
        metrics.voiceClarity,
        metrics.voiceToneConfidence,
        metrics.speakingDurationSeconds,
        metrics.silenceDurationSeconds,
        metrics.wordCount,
        metrics.uniqueWords,
        metrics.fillerWordsCount,
        metrics.fillerWordPercentage,
        metrics.responseTimeSeconds,
        metrics.videoRecordingUrl,
        metrics.screenRecordingUrl,
        metrics.audioTranscript,
        metrics.overallBehaviorScore,
      ]
    );

    return mapBehaviorMetricsRow(result.rows[0]);
  } catch (error) {
    console.error('Error saving behavior metrics:', error);
    throw error;
  }
};

export const generateSessionBehaviorSummary = async (
  sessionId: number
): Promise<SessionBehaviorSummary> => {
  try {
    const result = await pool.query(
      `SELECT
        AVG(confidence) as avg_confidence,
        AVG(eye_contact_percentage) as avg_eye_contact,
        AVG(speaking_pace) as avg_speaking_pace,
        AVG(voice_clarity) as avg_voice_clarity,
        AVG(facial_expression_score) as avg_facial_expression,
        AVG(body_movement_score) as avg_body_movement,
        SUM(filler_words_count) as total_filler_words,
        AVG(filler_word_percentage) as avg_filler_word_percentage,
        SUM(speaking_duration_seconds) as total_speaking_duration_seconds
      FROM behavior_metrics bm
      JOIN answers a ON bm.answer_id = a.id
      JOIN questions q ON a.question_id = q.id
      WHERE q.session_id = $1`,
      [sessionId]
    );

    if (result.rows.length === 0) {
      throw new Error('No behavior metrics found for session');
    }

    const row = result.rows[0];
    const summary: SessionBehaviorSummary = {
      sessionId,
      avgConfidence: parseFloat(row.avg_confidence || '0'),
      avgEyeContact: parseFloat(row.avg_eye_contact || '0'),
      avgSpeakingPace: parseFloat(row.avg_speaking_pace || '0'),
      avgVoiceClarity: parseFloat(row.avg_voice_clarity || '0'),
      avgFacialExpression: parseFloat(row.avg_facial_expression || '0'),
      avgBodyMovement: parseFloat(row.avg_body_movement || '0'),
      totalFillerWords: parseInt(row.total_filler_words || '0', 10),
      avgFillerWordPercentage: parseFloat(row.avg_filler_word_percentage || '0'),
      totalSpeakingDurationSeconds: parseInt(row.total_speaking_duration_seconds || '0', 10),
      consistencyScore: 0, // Calculate from variance
      improvementTrend: 0, // Calculate from trend analysis
    };

    // Calculate consistency score based on variance
    const consistencyResult = await pool.query(
      `SELECT STDDEV(overall_behavior_score) as stddev FROM behavior_metrics bm
       JOIN answers a ON bm.answer_id = a.id
       JOIN questions q ON a.question_id = q.id
       WHERE q.session_id = $1`,
      [sessionId]
    );

    const stddev = parseFloat(consistencyResult.rows[0]?.stddev || '5');
    summary.consistencyScore = Math.max(0, Math.min(10, 10 - stddev / 2));

    // Save summary
    await pool.query(
      `INSERT INTO session_behavior_summary (
        session_id, avg_confidence, avg_eye_contact, avg_speaking_pace, avg_voice_clarity,
        avg_facial_expression, avg_body_movement, total_filler_words, avg_filler_word_percentage,
        total_speaking_duration_seconds, consistency_score
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        sessionId,
        summary.avgConfidence,
        summary.avgEyeContact,
        summary.avgSpeakingPace,
        summary.avgVoiceClarity,
        summary.avgFacialExpression,
        summary.avgBodyMovement,
        summary.totalFillerWords,
        summary.avgFillerWordPercentage,
        summary.totalSpeakingDurationSeconds,
        summary.consistencyScore,
      ]
    );

    return summary;
  } catch (error) {
    console.error('Error generating behavior summary:', error);
    throw error;
  }
};

export const generateBehavioralInsights = async (
  sessionId: number,
  summary: SessionBehaviorSummary
): Promise<BehavioralInsights> => {
  try {
    const insights: BehavioralInsights = {
      sessionId,
      strengthsIdentified: generateStrengths(summary),
      areasForImprovement: generateImprovementAreas(summary),
      confidenceLevel: getConfidenceLevel(summary.avgConfidence),
      communicationStyle: getCommunicationStyle(summary),
      bodyLanguageFeedback: getBodyLanguageFeedback(summary),
      eyeContactFeedback: getEyeContactFeedback(summary.avgEyeContact),
      pacingFeedback: getPacingFeedback(summary.avgSpeakingPace),
      articulationFeedback: getArticulationFeedback(summary),
      overallPresentationScore: calculateOverallScore(summary),
      recommendations: generateRecommendations(summary),
    };

    // Save insights
    await pool.query(
      `INSERT INTO behavioral_insights (
        session_id, strengths_identified, areas_for_improvement, confidence_level,
        communication_style, body_language_feedback, eye_contact_feedback, pacing_feedback,
        articulation_feedback, overall_presentation_score, recommendations
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        sessionId,
        insights.strengthsIdentified,
        insights.areasForImprovement,
        insights.confidenceLevel,
        insights.communicationStyle,
        insights.bodyLanguageFeedback,
        insights.eyeContactFeedback,
        insights.pacingFeedback,
        insights.articulationFeedback,
        insights.overallPresentationScore,
        insights.recommendations,
      ]
    );

    return insights;
  } catch (error) {
    console.error('Error generating behavioral insights:', error);
    throw error;
  }
};

const generateStrengths = (summary: SessionBehaviorSummary): string => {
  const strengths: string[] = [];

  if (summary.avgConfidence > 7) strengths.push('High confidence and composure');
  if (summary.avgEyeContact > 7) strengths.push('Good eye contact maintained');
  if (summary.avgVoiceClarity > 7) strengths.push('Clear and articulate speech');
  if (summary.avgFacialExpression > 7)
    strengths.push('Expressive facial expressions');
  if (summary.avgFillerWordPercentage < 5)
    strengths.push('Minimal use of filler words');
  if (summary.consistencyScore > 7)
    strengths.push('Consistent performance throughout');

  return strengths.join('; ') || 'Showed engagement and effort';
};

const generateImprovementAreas = (summary: SessionBehaviorSummary): string => {
  const areas: string[] = [];

  if (summary.avgConfidence < 6) areas.push('Build more confidence in responses');
  if (summary.avgEyeContact < 6) areas.push('Maintain better eye contact');
  if (summary.avgVoiceClarity < 6) areas.push('Improve voice clarity and pacing');
  if (summary.avgFacialExpression < 6) areas.push('Use more facial expressions');
  if (summary.avgFillerWordPercentage > 10)
    areas.push('Reduce filler words (um, uh, like)');
  if (summary.consistencyScore < 6)
    areas.push('Maintain consistency across answers');

  return areas.join('; ') || 'Continue practicing for improvement';
};

const getConfidenceLevel = (avgConfidence: number): string => {
  if (avgConfidence >= 8) return 'Highly Confident';
  if (avgConfidence >= 6) return 'Confident';
  if (avgConfidence >= 4) return 'Moderately Confident';
  return 'Needs Confidence Building';
};

const getCommunicationStyle = (summary: SessionBehaviorSummary): string => {
  const clarity = summary.avgVoiceClarity;
  const pace = summary.avgSpeakingPace;

  if (clarity > 7 && pace > 6) return 'Professional and Clear';
  if (clarity > 6 && pace > 5) return 'Effective and Engaging';
  if (clarity < 5 || pace < 4) return 'Needs More Structure';
  return 'Conversational';
};

const getBodyLanguageFeedback = (summary: SessionBehaviorSummary): string => {
  const movement = summary.avgBodyMovement;
  const facial = summary.avgFacialExpression;

  if (movement > 7) return 'Good use of gestures and movement';
  if (facial > 7) return 'Expressive facial expressions enhance message';
  if (movement < 3 && facial < 3) return 'Show more enthusiasm with body language';
  return 'Body language supports message adequately';
};

const getEyeContactFeedback = (avgEyeContact: number): string => {
  if (avgEyeContact > 8)
    return 'Excellent eye contact maintained throughout';
  if (avgEyeContact > 6) return 'Good eye contact with minor lapses';
  if (avgEyeContact > 4) return 'Inconsistent eye contact maintained';
  return 'Needs significant improvement in eye contact';
};

const getPacingFeedback = (avgPace: number): string => {
  if (avgPace > 7) return 'Well-paced delivery, easy to follow';
  if (avgPace > 5) return 'Acceptable pacing with some variations';
  if (avgPace < 3)
    return 'Speaking too slowly, consider picking up pace';
  return 'Speaking too quickly, slow down for clarity';
};

const getArticulationFeedback = (summary: SessionBehaviorSummary): string => {
  const clarity = summary.avgVoiceClarity;
  const filler = summary.avgFillerWordPercentage;

  if (clarity > 7 && filler < 5) return 'Excellent articulation and word choice';
  if (clarity > 5 && filler < 10) return 'Clear articulation with minimal filler words';
  if (filler > 15) return 'Work on reducing filler words for clearer speech';
  return 'Good articulation overall';
};

const calculateOverallScore = (summary: SessionBehaviorSummary): number => {
  const weights = {
    confidence: 0.2,
    eyeContact: 0.15,
    voiceClarity: 0.15,
    facialExpression: 0.1,
    bodyMovement: 0.1,
    speakingPace: 0.1,
    fillerWords: 0.1,
    consistency: 0.1,
  };

  const score =
    summary.avgConfidence * weights.confidence +
    summary.avgEyeContact * weights.eyeContact +
    summary.avgVoiceClarity * weights.voiceClarity +
    summary.avgFacialExpression * weights.facialExpression +
    summary.avgBodyMovement * weights.bodyMovement +
    summary.avgSpeakingPace * weights.speakingPace +
    (10 - Math.min(summary.avgFillerWordPercentage, 10)) * weights.fillerWords +
    summary.consistencyScore * weights.consistency;

  return Math.round(score * 10) / 10;
};

const generateRecommendations = (summary: SessionBehaviorSummary): string => {
  const recommendations: string[] = [];

  if (summary.avgConfidence < 7)
    recommendations.push('Practice more to build confidence');
  if (summary.avgEyeContact < 7)
    recommendations.push('Practice maintaining eye contact during interviews');
  if (summary.avgFillerWordPercentage > 10)
    recommendations.push('Record yourself and practice eliminating filler words');
  if (summary.avgSpeakingPace < 5)
    recommendations.push('Work on speaking at a moderate, steady pace');
  if (summary.consistencyScore < 7)
    recommendations.push('Practice consistency across different question types');

  if (recommendations.length === 0) {
    recommendations.push('Continue practicing to maintain and improve performance');
  }

  return recommendations.join('; ');
};

const mapBehaviorMetricsRow = (row: any) => ({
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
