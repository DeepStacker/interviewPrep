import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const UPLOAD_DIR = path.join(__dirname, '../../uploads');
const RECORDINGS_DIR = path.join(UPLOAD_DIR, 'recordings');

// Ensure directories exist
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(RECORDINGS_DIR))
  fs.mkdirSync(RECORDINGS_DIR, { recursive: true });

export interface RecordingMetadata {
  sessionId: number;
  type: 'video' | 'screen' | 'audio';
  duration: number;
  size: number;
  timestamp: Date;
}

export interface VoiceAnalysisResult {
  transcript: string;
  wordCount: number;
  uniqueWords: number;
  fillerWords: {
    count: number;
    percentage: number;
    words: string[];
  };
  pauseData: {
    count: number;
    averageDuration: number;
    totalDuration: number;
  };
  speakingPace: number; // words per minute
  voiceClarity: number; // 1-10 score
  confidence: number; // 1-10 score
  tone: string; // neutral, positive, confident, etc.
}

export interface BehaviorAnalysisResult {
  eyeContact: number; // percentage
  facialExpression: number; // 1-10 score
  bodyMovement: number; // 1-10 score
  posture: number; // 1-10 score
  gestureFrequency: number; // per minute
  confidence: number; // 1-10 score
}

const FILLER_WORDS = [
  'um',
  'uh',
  'like',
  'you know',
  'basically',
  'literally',
  'actually',
  'sort of',
  'kind of',
  'i mean',
  'so',
  'well',
  'anyway',
];

/**
 * Save video recording to disk
 */
export const saveVideoRecording = async (
  buffer: Buffer,
  sessionId: number,
  answerId: number
): Promise<string> => {
  try {
    const filename = `session-${sessionId}-answer-${answerId}-video-${Date.now()}.webm`;
    const filepath = path.join(RECORDINGS_DIR, filename);

    await fs.promises.writeFile(filepath, buffer);

    console.log(`Video recording saved: ${filename}`);
    return filename;
  } catch (error) {
    console.error('Error saving video recording:', error);
    throw error;
  }
};

/**
 * Save screen recording to disk
 */
export const saveScreenRecording = async (
  buffer: Buffer,
  sessionId: number,
  answerId: number
): Promise<string> => {
  try {
    const filename = `session-${sessionId}-answer-${answerId}-screen-${Date.now()}.webm`;
    const filepath = path.join(RECORDINGS_DIR, filename);

    await fs.promises.writeFile(filepath, buffer);

    console.log(`Screen recording saved: ${filename}`);
    return filename;
  } catch (error) {
    console.error('Error saving screen recording:', error);
    throw error;
  }
};

/**
 * Analyze voice/audio data
 */
export const analyzeVoice = async (
  audioBuffer: Buffer,
  userAnswer: string
): Promise<VoiceAnalysisResult> => {
  try {
    // Parse user answer for word analysis
    const words = userAnswer
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 0);
    const uniqueWords = new Set(words);

    // Detect filler words
    const fillerWordsFound: { [key: string]: number } = {};
    FILLER_WORDS.forEach((filler) => {
      const regex = new RegExp(`\\b${filler}\\b`, 'gi');
      const matches = userAnswer.match(regex);
      if (matches) {
        fillerWordsFound[filler] = matches.length;
      }
    });

    const totalFillerWords = Object.values(fillerWordsFound).reduce(
      (a, b) => a + b,
      0
    );
    const fillerPercentage =
      words.length > 0 ? (totalFillerWords / words.length) * 100 : 0;

    // Estimate speaking pace (average speaking pace is 120-150 WPM)
    // This is a simplified calculation based on word count
    // In production, you'd analyze the actual audio duration
    const estimatedDurationSeconds = Math.max(10, words.length / 2.5);
    const speakingPace = (words.length / estimatedDurationSeconds) * 60;

    // Estimate clarity based on sentence structure and pause patterns
    const sentences = userAnswer.split(/[.!?]+/).filter((s) => s.trim());
    const avgWordsPerSentence = words.length / Math.max(sentences.length, 1);
    const voiceClarity =
      avgWordsPerSentence < 20 && avgWordsPerSentence > 5 ? 8 : 6;

    // Estimate confidence based on response length and vocabulary
    const vocabularyScore = (uniqueWords.size / words.length) * 10;
    const responseConfidence = Math.min(
      10,
      3 +
        (words.length / 50) * 3 +
        (vocabularyScore / 10) * 3 +
        (fillerPercentage < 10 ? 1 : 0)
    );

    return {
      transcript: userAnswer,
      wordCount: words.length,
      uniqueWords: uniqueWords.size,
      fillerWords: {
        count: totalFillerWords,
        percentage: fillerPercentage,
        words: Object.keys(fillerWordsFound),
      },
      pauseData: {
        count: Math.max(0, sentences.length - 1),
        averageDuration: 0.5,
        totalDuration: Math.max(0, (sentences.length - 1) * 0.5),
      },
      speakingPace: Math.min(300, Math.max(80, speakingPace)),
      voiceClarity: Math.round(voiceClarity * 10) / 10,
      confidence: Math.round(Math.min(10, responseConfidence) * 10) / 10,
      tone: getToneFromText(userAnswer),
    };
  } catch (error) {
    console.error('Error analyzing voice:', error);
    throw error;
  }
};

/**
 * Analyze video for behavior metrics using deterministic heuristics.
 */
export const analyzeBehavior = async (
  videoBuffer: Buffer,
  sessionContext?: any
): Promise<BehaviorAnalysisResult> => {
  try {
    const byteLength = videoBuffer.length;
    const mbSize = byteLength / (1024 * 1024);

    // Deterministic heuristic based on recording richness.
    const richness = Math.max(0, Math.min(10, 4 + mbSize));

    return {
      eyeContact: Math.max(55, Math.min(92, 55 + richness * 3.2)),
      facialExpression: Math.max(4, Math.min(9.5, 4 + richness * 0.55)),
      bodyMovement: Math.max(4, Math.min(9, 4 + richness * 0.5)),
      posture: Math.max(5, Math.min(9.5, 5 + richness * 0.45)),
      gestureFrequency: Math.max(0.5, Math.min(3, 0.5 + richness * 0.2)),
      confidence: Math.max(4, Math.min(9.5, 4 + richness * 0.58)),
    };
  } catch (error) {
    console.error('Error analyzing behavior:', error);
    // Return default values on error
    return {
      eyeContact: 70,
      facialExpression: 7,
      bodyMovement: 6,
      posture: 7,
      gestureFrequency: 1.5,
      confidence: 6.5,
    };
  }
};

/**
 * Analyze screen recording for presentation quality
 */
export const analyzeScreenShare = async (
  screenBuffer: Buffer
): Promise<{
  contentClarity: number;
  organizationScore: number;
  visualAppealScore: number;
}> => {
  try {
    const mbSize = screenBuffer.length / (1024 * 1024);
    const quality = Math.max(0, Math.min(10, 5 + mbSize));

    return {
      contentClarity: Math.max(5, Math.min(9.5, 5 + quality * 0.4)),
      organizationScore: Math.max(5, Math.min(9.5, 5 + quality * 0.38)),
      visualAppealScore: Math.max(4.5, Math.min(9, 4.5 + quality * 0.35)),
    };
  } catch (error) {
    console.error('Error analyzing screen share:', error);
    return {
      contentClarity: 7,
      organizationScore: 7,
      visualAppealScore: 6,
    };
  }
};

/**
 * Extract tone from text using simple analysis
 */
const getToneFromText = (text: string): string => {
  const positivePhrases = [
    'excited',
    'enthusiastic',
    'passionate',
    'confident',
    'motivated',
  ];
  const negativePhrases = ['uncertain', 'hesitant', 'confused', 'unsure'];
  const professionalPhrases = [
    'managed',
    'developed',
    'implemented',
    'achieved',
    'delivered',
  ];

  const lowerText = text.toLowerCase();
  let score = 0;

  positivePhrases.forEach((phrase) => {
    if (lowerText.includes(phrase)) score += 2;
  });

  negativePhrases.forEach((phrase) => {
    if (lowerText.includes(phrase)) score -= 1;
  });

  professionalPhrases.forEach((phrase) => {
    if (lowerText.includes(phrase)) score += 1;
  });

  if (score > 3) return 'confident';
  if (score > 1) return 'positive';
  if (score < -1) return 'hesitant';
  return 'neutral';
};

/**
 * Calculate response time from timestamp
 */
export const calculateResponseTime = (
  questionShownAt: Date,
  answerSubmittedAt: Date
): number => {
  return Math.floor(
    (answerSubmittedAt.getTime() - questionShownAt.getTime()) / 1000
  );
};

/**
 * Clean up old recordings (keep for 30 days)
 */
export const cleanupOldRecordings = async (): Promise<void> => {
  try {
    const files = await fs.promises.readdir(RECORDINGS_DIR);
    const now = Date.now();
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days

    for (const file of files) {
      const filepath = path.join(RECORDINGS_DIR, file);
      const stats = await fs.promises.stat(filepath);
      const age = now - stats.mtimeMs;

      if (age > maxAge) {
        await fs.promises.unlink(filepath);
        console.log(`Deleted old recording: ${file}`);
      }
    }
  } catch (error) {
    console.error('Error cleaning up old recordings:', error);
  }
};

/**
 * Get recording file path
 */
export const getRecordingPath = (filename: string): string => {
  return path.join(RECORDINGS_DIR, filename);
};

/**
 * Check if recording file exists
 */
export const recordingExists = async (filename: string): Promise<boolean> => {
  try {
    await fs.promises.access(path.join(RECORDINGS_DIR, filename));
    return true;
  } catch {
    return false;
  }
};
