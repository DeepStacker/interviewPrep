/**
 * Points Calculator Utility
 * Converts submission scores to platform points for leaderboard
 */

export interface PointsBreakdown {
  basePoints: number;
  bonusMultiplier: number;
  totalPoints: number;
  reason: string;
}

export const pointsCalculator = {
  // Calculate points from coding challenge submission
  calculateCodingPoints(
    accepted: boolean,
    difficulty: 'easy' | 'medium' | 'hard',
    timeMinutes: number,
    efficiency: number // 0-1 (memory/time optimization)
  ): PointsBreakdown {
    if (!accepted) {
      return {
        basePoints: 0,
        bonusMultiplier: 1,
        totalPoints: 0,
        reason: 'Problem not accepted',
      };
    }

    let basePoints = 0;
    let bonusMultiplier = 1;

    // Base points by difficulty
    switch (difficulty) {
      case 'easy':
        basePoints = 10;
        break;
      case 'medium':
        basePoints = 25;
        break;
      case 'hard':
        basePoints = 50;
        break;
    }

    // Time bonus: Faster solutions get more points
    if (timeMinutes < 15) bonusMultiplier += 0.2; // 20% bonus for speed
    if (timeMinutes < 30) bonusMultiplier += 0.1; // Extra 10% if under 30 min

    // Efficiency bonus: Optimal solutions get more points
    if (efficiency >= 0.9) bonusMultiplier += 0.25; // 25% bonus for optimal
    else if (efficiency >= 0.75) bonusMultiplier += 0.15; // 15% for good
    else if (efficiency >= 0.5) bonusMultiplier += 0.05; // 5% for okay

    const totalPoints = Math.round(basePoints * bonusMultiplier);

    return {
      basePoints,
      bonusMultiplier,
      totalPoints,
      reason: `${difficulty} problem${timeMinutes < 15 ? ' (speed bonus)' : ''}${
        efficiency >= 0.75 ? ' (efficiency bonus)' : ''
      }`,
    };
  },

  // Calculate points from system design submission
  calculateSystemDesignPoints(score: number): PointsBreakdown {
    // Score is 0-10
    // Below 5 = no points
    // 5-6 = 15 points
    // 6.5-7.5 = 30 points
    // 7.5-8.5 = 50 points
    // 8.5+ = 75 points

    let basePoints = 0;
    let bonusMultiplier = 1;

    if (score < 5) {
      basePoints = 0;
    } else if (score < 6.5) {
      basePoints = 15;
      bonusMultiplier = score / 6;
    } else if (score < 7.5) {
      basePoints = 30;
      bonusMultiplier = score / 7;
    } else if (score < 8.5) {
      basePoints = 50;
      bonusMultiplier = score / 8;
    } else {
      basePoints = 75;
      bonusMultiplier = Math.min(score / 8.5, 1.2); // Max 20% bonus
    }

    const totalPoints = Math.round(basePoints * bonusMultiplier);

    return {
      basePoints,
      bonusMultiplier,
      totalPoints,
      reason: `System design score: ${score}/10`,
    };
  },

  // Calculate points from resume
  calculateResumePoints(score: number): PointsBreakdown {
    // Score is 0-10
    // < 5 = 0 points
    // 5-6 = 10 points
    // 6-7 = 20 points
    // 7-8 = 30 points
    // 8-9 = 40 points
    // 9+ = 50 points

    let basePoints = 0;

    if (score >= 9) basePoints = 50;
    else if (score >= 8) basePoints = 40;
    else if (score >= 7) basePoints = 30;
    else if (score >= 6) basePoints = 20;
    else if (score >= 5) basePoints = 10;
    else basePoints = 0;

    const bonusMultiplier = score >= 8.5 ? 1.15 : 1; // 15% bonus for excellent

    const totalPoints = Math.round(basePoints * bonusMultiplier);

    return {
      basePoints,
      bonusMultiplier,
      totalPoints,
      reason: `Resume score: ${score}/10`,
    };
  },

  // Calculate points from mock interview
  calculateInterviewPoints(rating: number, score: number): PointsBreakdown {
    // Rating: 1-5 stars
    // Score: 0-100 (behavioral + technical average)

    let basePoints = 0;
    let bonusMultiplier = 1;

    if (rating < 2) {
      basePoints = 5;
    } else if (rating < 3) {
      basePoints = 15;
    } else if (rating < 4) {
      basePoints = 25;
    } else if (rating < 5) {
      basePoints = 40;
    } else {
      basePoints = 60;
    }

    // Score multiplier
    if (score >= 80) bonusMultiplier = 1.25;
    else if (score >= 60) bonusMultiplier = 1.1;
    else if (score >= 40) bonusMultiplier = 1.0;
    else bonusMultiplier = 0.8;

    const totalPoints = Math.round(basePoints * bonusMultiplier);

    return {
      basePoints,
      bonusMultiplier,
      totalPoints,
      reason: `${rating.toFixed(1)} star interview${score >= 80 ? ' (excellent performance)' : ''}`,
    };
  },

  // Calculate points from behavioral assessment
  calculateBehavioralPoints(metrics: {
    eyeContact: number;
    speakingPace: number;
    vocabQuality: number;
    confidenceScore: number;
    fillerWordsRate: number;
  }): PointsBreakdown {
    const avgScore = (
      (metrics.eyeContact || 0) +
      (metrics.speakingPace || 0) +
      (metrics.vocabQuality || 0) +
      (metrics.confidenceScore || 0)
    ) / 4 * 0.01 * 100; // Convert to 0-100

    const fillerWordPenalty = Math.max(0, (metrics.fillerWordsRate || 0) * 0.5); // Up to 50% penalty

    let basePoints = 0;
    if (avgScore >= 80) basePoints = 25;
    else if (avgScore >= 60) basePoints = 15;
    else if (avgScore >= 40) basePoints = 5;
    else basePoints = 0;

    const bonusMultiplier = 1 - fillerWordPenalty;

    const totalPoints = Math.max(0, Math.round(basePoints * bonusMultiplier));

    return {
      basePoints,
      bonusMultiplier,
      totalPoints,
      reason: `Behavioral assessment: ${avgScore.toFixed(0)}/100${
        fillerWordPenalty > 0 ? ` (-${(fillerWordPenalty * 100).toFixed(0)}%)` : ''
      }`,
    };
  },

  // Aggregate total points from all sources
  aggregatePoints(submissions: Array<{
    type: 'coding' | 'system_design' | 'resume' | 'interview' | 'behavioral';
    points: number;
  }>): {
    totalPoints: number;
    breakdown: Record<string, number>;
  } {
    const breakdown: Record<string, number> = {
      coding: 0,
      system_design: 0,
      resume: 0,
      interview: 0,
      behavioral: 0,
    };

    let totalPoints = 0;

    for (const submission of submissions) {
      breakdown[submission.type] = (breakdown[submission.type] || 0) + submission.points;
      totalPoints += submission.points;
    }

    return {
      totalPoints,
      breakdown,
    };
  },

  // Get points for a specific achievement
  getAchievementPoints(achievement: string): number {
    const achievements: Record<string, number> = {
      first_challenge: 10,
      hard_core_10: 50, // First 10 problems
      hard_core_50: 200, // 50 problems milestone
      system_designer: 100, // First perfect design
      points_100: 100, // Reach 100 points
      points_500: 250, // Reach 500 points
      streak_7: 75, // 7-day streak
      interview_ace: 150, // 5-star rating
      resume_perfect: 100, // 10/10 resume
    };

    return achievements[achievement] || 0;
  },
};
