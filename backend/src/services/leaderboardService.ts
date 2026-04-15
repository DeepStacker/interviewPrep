import pool from '../config/database';

export interface LeaderboardEntry {
  rank: number;
  userId: number;
  userName: string;
  userEmail: string;
  userPicture: string;
  totalPoints: number;
  codingPoints: number;
  systemDesignPoints: number;
  resumePoints: number;
  interviewPoints: number;
  badges: number;
  level: string;
}

export interface UserRanking {
  rank: number;
  totalPoints: number;
  percentile: number;
  codingScore: number;
  systemDesignScore: number;
  resumeScore: number;
  interviewScore: number;
  totalProblemsolved: number;
  totalDesignSubmissions: number;
  mockInterviewCount: number;
  badges: number;
}

const BASE_POINTS_QUERY = `
  SELECT
    u.id as user_id,
    u.name,
    u.email,
    u.picture_url,
    COALESCE(c.coding_points, 0) as coding_points,
    COALESCE(sd.system_design_points, 0) as system_design_points,
    COALESCE(r.resume_points, 0) as resume_points,
    COALESCE(mi.interview_points, 0) as interview_points,
    COALESCE(b.badge_count, 0) as badge_count,
    (
      COALESCE(c.coding_points, 0) +
      COALESCE(sd.system_design_points, 0) +
      COALESCE(r.resume_points, 0) +
      COALESCE(mi.interview_points, 0)
    ) as total_points
  FROM users u
  LEFT JOIN (
    SELECT user_id, ROUND(COALESCE(SUM(score), 0))::int as coding_points
    FROM code_submissions
    GROUP BY user_id
  ) c ON c.user_id = u.id
  LEFT JOIN (
    SELECT user_id, ROUND(COALESCE(SUM(overall_score * 10), 0))::int as system_design_points
    FROM system_design_submissions
    GROUP BY user_id
  ) sd ON sd.user_id = u.id
  LEFT JOIN (
    SELECT user_id, ROUND(COALESCE(MAX(resume_score * 10), 0))::int as resume_points
    FROM resumes
    GROUP BY user_id
  ) r ON r.user_id = u.id
  LEFT JOIN (
    SELECT interviewee_id as user_id, ROUND(COALESCE(SUM(rating * 10), 0))::int as interview_points
    FROM mock_interviews
    GROUP BY interviewee_id
  ) mi ON mi.user_id = u.id
  LEFT JOIN (
    SELECT user_id, COUNT(*)::int as badge_count
    FROM achievement_badges
    GROUP BY user_id
  ) b ON b.user_id = u.id
`;

export const leaderboardService = {
  async getGlobalLeaderboard(limit = 100, offset = 0): Promise<LeaderboardEntry[]> {
    try {
      const result = await pool.query(
        `${BASE_POINTS_QUERY}
         ORDER BY total_points DESC, u.id ASC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      return result.rows.map((row, index) => ({
        rank: offset + index + 1,
        userId: row.user_id,
        userName: row.name,
        userEmail: row.email,
        userPicture: row.picture_url,
        totalPoints: parseInt(row.total_points, 10) || 0,
        codingPoints: parseInt(row.coding_points, 10) || 0,
        systemDesignPoints: parseInt(row.system_design_points, 10) || 0,
        resumePoints: parseInt(row.resume_points, 10) || 0,
        interviewPoints: parseInt(row.interview_points, 10) || 0,
        badges: parseInt(row.badge_count, 10) || 0,
        level: this.getLevel(parseInt(row.total_points, 10) || 0),
      }));
    } catch (error) {
      console.error('Error fetching global leaderboard:', error);
      throw error;
    }
  },

  async getUserRanking(userId: number): Promise<UserRanking> {
    try {
      const userResult = await pool.query(
        `${BASE_POINTS_QUERY}
         WHERE u.id = $1`,
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const row = userResult.rows[0];
      const totalPoints = parseInt(row.total_points, 10) || 0;

      const rankResult = await pool.query(
        `SELECT COUNT(*)::int + 1 as rank
         FROM (${BASE_POINTS_QUERY}) lb
         WHERE lb.total_points > $1`,
        [totalPoints]
      );

      const totalUsersResult = await pool.query('SELECT COUNT(*)::int as total_users FROM users');
      const totalUsers = totalUsersResult.rows[0]?.total_users || 1;
      const rank = rankResult.rows[0]?.rank || 1;
      const percentile = Math.max(0, Math.round(((totalUsers - rank) / Math.max(totalUsers, 1)) * 100));

      const countsResult = await pool.query(
        `SELECT
           COUNT(DISTINCT CASE WHEN is_accepted = true THEN challenge_id END)::int as coding_count
         FROM code_submissions
         WHERE user_id = $1`,
        [userId]
      );

      const designCountResult = await pool.query(
        'SELECT COUNT(*)::int as design_count FROM system_design_submissions WHERE user_id = $1',
        [userId]
      );

      const interviewCountResult = await pool.query(
        `SELECT COUNT(*)::int as interview_count
         FROM mock_interviews
         WHERE interviewee_id = $1`,
        [userId]
      );

      return {
        rank,
        totalPoints,
        percentile,
        codingScore: parseInt(row.coding_points, 10) || 0,
        systemDesignScore: parseInt(row.system_design_points, 10) || 0,
        resumeScore: parseInt(row.resume_points, 10) || 0,
        interviewScore: parseInt(row.interview_points, 10) || 0,
        totalProblemsolved: countsResult.rows[0]?.coding_count || 0,
        totalDesignSubmissions: designCountResult.rows[0]?.design_count || 0,
        mockInterviewCount: interviewCountResult.rows[0]?.interview_count || 0,
        badges: parseInt(row.badge_count, 10) || 0,
      };
    } catch (error) {
      console.error('Error fetching user ranking:', error);
      throw error;
    }
  },

  async calculateUserPoints(userId: number): Promise<number> {
    const ranking = await this.getUserRanking(userId);
    return ranking.totalPoints;
  },

  async checkAndAwardBadges(userId: number): Promise<string[]> {
    try {
      const awardedBadges: string[] = [];

      const statsResult = await pool.query(
        `SELECT
           COUNT(DISTINCT CASE WHEN is_accepted = true THEN challenge_id END)::int as problems_solved,
           COALESCE(MAX(score), 0)::int as max_coding_score
         FROM code_submissions
         WHERE user_id = $1`,
        [userId]
      );

      const points = await this.calculateUserPoints(userId);

      const daysActiveResult = await pool.query(
        `SELECT COUNT(DISTINCT DATE(created_at))::int as days_active
         FROM (
           SELECT created_at FROM code_submissions WHERE user_id = $1
           UNION ALL
           SELECT submitted_at as created_at FROM system_design_submissions WHERE user_id = $1
           UNION ALL
           SELECT created_at FROM mock_interviews WHERE interviewee_id = $1
           UNION ALL
           SELECT updated_at as created_at FROM resumes WHERE user_id = $1
         ) activity`,
        [userId]
      );

      const problemsSolved = statsResult.rows[0]?.problems_solved || 0;
      const maxCodingScore = statsResult.rows[0]?.max_coding_score || 0;
      const daysActive = daysActiveResult.rows[0]?.days_active || 0;

      const badgesToCheck = [
        { slug: 'first_challenge', condition: problemsSolved >= 1, name: 'First Challenge' },
        { slug: 'hard_core_10', condition: problemsSolved >= 10, name: 'Hard Core' },
        { slug: 'hard_core_50', condition: problemsSolved >= 50, name: 'Legend' },
        { slug: 'system_designer', condition: maxCodingScore >= 80, name: 'System Designer' },
        { slug: 'points_100', condition: points >= 100, name: 'Rising Star' },
        { slug: 'points_500', condition: points >= 500, name: 'Elite Performer' },
        { slug: 'streak_7', condition: daysActive >= 7, name: '7-Day Streak' },
      ];

      for (const badge of badgesToCheck) {
        if (!badge.condition) {
          continue;
        }

        const existing = await pool.query(
          'SELECT id FROM achievement_badges WHERE user_id = $1 AND badge_type = $2 LIMIT 1',
          [userId, badge.slug]
        );

        if (existing.rows.length > 0) {
          continue;
        }

        await pool.query(
          `INSERT INTO achievement_badges (user_id, badge_type, badge_name, description)
           VALUES ($1, $2, $3, $4)`,
          [userId, badge.slug, badge.name, `${badge.name} unlocked by platform achievements`]
        );
        awardedBadges.push(badge.name);
      }

      return awardedBadges;
    } catch (error) {
      console.error('Error checking badges:', error);
      throw error;
    }
  },

  getLevel(points: number): string {
    if (points >= 500) return 'Elite';
    if (points >= 250) return 'Master';
    if (points >= 100) return 'Expert';
    if (points >= 50) return 'Intermediate';
    if (points >= 10) return 'Beginner';
    return 'Recruit';
  },

  async getCompanyLeaderboard(companyId: number, limit = 50): Promise<LeaderboardEntry[]> {
    try {
      const result = await pool.query(
        `SELECT
           u.id as user_id,
           u.name,
           u.email,
           u.picture_url,
           ROUND(COALESCE(SUM(cs.score), 0))::int as coding_points
         FROM users u
         JOIN code_submissions cs ON u.id = cs.user_id
         JOIN coding_challenges cc ON cc.id = cs.challenge_id
         WHERE cc.company_id = $1
         GROUP BY u.id, u.name, u.email, u.picture_url
         ORDER BY coding_points DESC, u.id ASC
         LIMIT $2`,
        [companyId, limit]
      );

      return result.rows.map((row, index) => ({
        rank: index + 1,
        userId: row.user_id,
        userName: row.name,
        userEmail: row.email,
        userPicture: row.picture_url,
        totalPoints: parseInt(row.coding_points, 10) || 0,
        codingPoints: parseInt(row.coding_points, 10) || 0,
        systemDesignPoints: 0,
        resumePoints: 0,
        interviewPoints: 0,
        badges: 0,
        level: this.getLevel(parseInt(row.coding_points, 10) || 0),
      }));
    } catch (error) {
      console.error('Error fetching company leaderboard:', error);
      throw error;
    }
  },
};
