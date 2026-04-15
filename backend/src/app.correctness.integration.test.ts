import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import app from './server';
import pool from './config/database';
import { generateJWT } from './services/authService';

const suffix = Date.now();

let userId = 0;
let userEmail = '';
let authToken = '';

let companyId = 0;
let codingChallengeId = 0;
let systemDesignProblemId = 0;
let roadmapId = 0;
let mockInterviewId = 0;

const asNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
};

const expectNumberLike = (value: unknown) => {
  expect(Number.isFinite(asNumber(value))).toBe(true);
};

describe('application correctness integration', () => {
  beforeAll(async () => {
    await pool.query('SELECT 1');

    userEmail = `integration-${suffix}@example.com`;

    const userResult = await pool.query(
      `INSERT INTO users (google_id, email, name, picture_url, is_admin)
       VALUES ($1, $2, $3, $4, false)
       RETURNING id, email`,
      [`google-${suffix}`, userEmail, `Integration User ${suffix}`, 'https://example.com/avatar.png']
    );

    userId = userResult.rows[0].id;
    authToken = generateJWT(userId, userEmail);

    const companyResult = await pool.query(
      `INSERT INTO companies (name, category, description, difficulty_level, rounds_count, website_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        `Test Company ${suffix}`,
        'Tech,Cloud',
        'Integration test company for API correctness checks',
        'medium',
        4,
        'https://example.com',
      ]
    );

    companyId = companyResult.rows[0].id;

    const challengeResult = await pool.query(
      `INSERT INTO coding_challenges
       (title, difficulty, category, description, problem_statement, time_limit_minutes, constraints, company_id, acceptance_rate)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        `Correctness Challenge ${suffix}`,
        'easy',
        'Arrays',
        `Find values matching integration keyword ${suffix}`,
        'Return indices that satisfy the condition',
        20,
        'O(n) time',
        companyId,
        73.5,
      ]
    );

    codingChallengeId = challengeResult.rows[0].id;

    await pool.query(
      `INSERT INTO test_cases (challenge_id, input_data, expected_output, is_sample, explanation)
       VALUES ($1, $2, $3, true, $4)`,
      [codingChallengeId, '[2,7,11,15]\n9', '[0,1]', 'Sample case validates pair lookup']
    );

    const designResult = await pool.query(
      `INSERT INTO system_design_problems
       (title, difficulty, description, requirements, constraints, estimated_time_minutes, company_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        `Correctness Design ${suffix}`,
        'medium',
        'Design a scalable event ingestion system',
        'Ingestion, deduplication, replay',
        '10k events/sec',
        45,
        companyId,
      ]
    );

    systemDesignProblemId = designResult.rows[0].id;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM mock_interviews WHERE id = $1', [mockInterviewId || -1]);
    await pool.query('DELETE FROM preparation_roadmaps WHERE id = $1', [roadmapId || -1]);
    await pool.query('DELETE FROM resumes WHERE user_id = $1', [userId || -1]);
    await pool.query('DELETE FROM achievement_badges WHERE user_id = $1', [userId || -1]);
    await pool.query('DELETE FROM test_cases WHERE challenge_id = $1', [codingChallengeId || -1]);
    await pool.query('DELETE FROM coding_challenges WHERE id = $1', [codingChallengeId || -1]);
    await pool.query('DELETE FROM system_design_problems WHERE id = $1', [systemDesignProblemId || -1]);
    await pool.query('DELETE FROM users WHERE id = $1', [userId || -1]);
    await pool.query('DELETE FROM companies WHERE id = $1', [companyId || -1]);
  });

  it('validates health and readiness payloads', async () => {
    const health = await request(app).get('/healthz');
    expect(health.status).toBe(200);
    expect(health.body).toEqual({ status: 'ok' });

    const ready = await request(app).get('/readyz');
    expect([200, 503]).toContain(ready.status);
    expect(['ready', 'not_ready']).toContain(ready.body.status);
  });

  it('validates company listing and details payload data', async () => {
    const companies = await request(app).get('/api/companies');
    expect(companies.status).toBe(200);
    expect(companies.body.status).toBe('success');
    expect(Array.isArray(companies.body.data)).toBe(true);

    const company = companies.body.data.find((item: any) => item.id === companyId);
    expect(company).toBeTruthy();
    expect(company.name).toBe(`Test Company ${suffix}`);
    expect(Array.isArray(company.focusAreas)).toBe(true);

    const details = await request(app).get(`/api/companies/${companyId}`);
    expect(details.status).toBe(200);
    expect(details.body.status).toBe('success');
    expect(details.body.data.id).toBe(companyId);
    expect(details.body.data.stats).toBeTruthy();
    expectNumberLike(details.body.data.stats.totalProblems);
    expectNumberLike(details.body.data.stats.totalSubmissions);
    expectNumberLike(details.body.data.stats.acceptanceRate);
  });

  it('validates authenticated profile payload', async () => {
    const profile = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${authToken}`);

    expect(profile.status).toBe(200);
    expect(profile.body.id).toBe(userId);
    expect(profile.body.email).toBe(userEmail);
    expect(typeof profile.body.name).toBe('string');
    expect(typeof profile.body.isAdmin).toBe('boolean');
  });

  it('validates roadmap generation, retrieval, and progress updates', async () => {
    const create = await request(app)
      .post('/api/roadmap/generate')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        companyId,
        targetRole: 'Software Engineer',
        experienceLevel: 'experienced',
        difficulty: 'medium',
      });

    expect(create.status).toBe(201);
    expect(create.body.userId).toBe(userId);
    expect(create.body.companyId).toBe(companyId);
    expect(create.body.targetRole).toBe('Software Engineer');
    expect(Array.isArray(create.body.roadmapContent)).toBe(true);
    expect(create.body.roadmapContent.length).toBeGreaterThan(0);
    roadmapId = create.body.id;

    const list = await request(app)
      .get('/api/roadmap')
      .set('Authorization', `Bearer ${authToken}`);

    expect(list.status).toBe(200);
    expect(Array.isArray(list.body)).toBe(true);
    const roadmap = list.body.find((item: any) => item.id === roadmapId);
    expect(roadmap).toBeTruthy();

    const update = await request(app)
      .patch(`/api/roadmap/${roadmapId}/progress`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ progressPercentage: 42 });

    expect(update.status).toBe(200);
    expect(update.body.success).toBe(true);

    const refreshed = await request(app)
      .get('/api/roadmap')
      .set('Authorization', `Bearer ${authToken}`);

    const refreshedRoadmap = refreshed.body.find((item: any) => item.id === roadmapId);
    expect(Math.round(asNumber(refreshedRoadmap.progressPercentage))).toBe(42);
  });

  it('validates coding challenge search and detail payload correctness', async () => {
    const search = await request(app)
      .get('/api/coding/challenges')
      .query({ difficulty: 'easy', search: `integration keyword ${suffix}` })
      .set('Authorization', `Bearer ${authToken}`);

    expect(search.status).toBe(200);
    expect(Array.isArray(search.body)).toBe(true);

    const found = search.body.find((item: any) => item.id === codingChallengeId);
    expect(found).toBeTruthy();
    expect(found.title).toBe(`Correctness Challenge ${suffix}`);
    expect(found.difficulty).toBe('easy');
    expect(found.category).toBe('Arrays');

    const detail = await request(app)
      .get(`/api/coding/challenges/${codingChallengeId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(detail.status).toBe(200);
    expect(detail.body.id).toBe(codingChallengeId);
    expect(Array.isArray(detail.body.examples)).toBe(true);
    expect(detail.body.examples.length).toBeGreaterThan(0);
    expect(typeof detail.body.examples[0].input).toBe('string');
    expect(typeof detail.body.examples[0].output).toBe('string');

    const stats = await request(app)
      .get('/api/coding/stats')
      .set('Authorization', `Bearer ${authToken}`);

    expect(stats.status).toBe(200);
    expect(stats.body).toBeTruthy();
    expectNumberLike(stats.body.total_attempted || 0);
    expectNumberLike(stats.body.total_submissions || 0);
  });

  it('validates system design listing and detail payload correctness', async () => {
    const list = await request(app)
      .get('/api/system-design/problems')
      .query({ difficulty: 'medium' })
      .set('Authorization', `Bearer ${authToken}`);

    expect(list.status).toBe(200);
    expect(Array.isArray(list.body)).toBe(true);

    const found = list.body.find((item: any) => item.id === systemDesignProblemId);
    expect(found).toBeTruthy();
    expect(found.title).toBe(`Correctness Design ${suffix}`);

    const detail = await request(app)
      .get(`/api/system-design/problems/${systemDesignProblemId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(detail.status).toBe(200);
    expect(detail.body.id).toBe(systemDesignProblemId);
    expect(detail.body.difficulty).toBe('medium');
    expect(typeof detail.body.description).toBe('string');
  });

  it('validates resume lifecycle payloads and computed score data', async () => {
    const resumePayload = {
      title: 'Senior Software Engineer',
      summary: 'Engineer with extensive backend and distributed systems experience across large-scale products.',
      experience: [
        { company: 'Example Corp', role: 'Senior Engineer', duration: '2021-2026', achievements: ['Built event pipeline'] },
      ],
      education: [{ school: 'State University', degree: 'B.Tech Computer Science' }],
      skills: ['TypeScript', 'Node.js', 'PostgreSQL', 'AWS', 'System Design', 'Docker'],
      projects: [{ name: 'Realtime Engine', description: 'Built low-latency event processor' }],
      certifications: ['AWS Solutions Architect'],
    };

    const create = await request(app)
      .post('/api/resume')
      .set('Authorization', `Bearer ${authToken}`)
      .send(resumePayload);

    expect(create.status).toBe(201);
    expect(create.body.userId).toBe(userId);
    expect(create.body.title).toBe(resumePayload.title);
    expect(Array.isArray(create.body.skills)).toBe(true);
    expect(create.body.skills).toContain('TypeScript');
    expectNumberLike(create.body.resumeScore);

    const getResume = await request(app)
      .get('/api/resume')
      .set('Authorization', `Bearer ${authToken}`);

    expect(getResume.status).toBe(200);
    expect(getResume.body.title).toBe(resumePayload.title);

    const score = await request(app)
      .get('/api/resume/score')
      .set('Authorization', `Bearer ${authToken}`);

    expect(score.status).toBe(200);
    expectNumberLike(score.body.score);
    expect(typeof score.body.suggestions).toBe('string');

    const tips = await request(app)
      .get('/api/resume/tips')
      .set('Authorization', `Bearer ${authToken}`);

    expect(tips.status).toBe(200);
    expect(Array.isArray(tips.body.tips)).toBe(true);
    expect(Array.isArray(tips.body.prioritizedActions)).toBe(true);
    expect(Array.isArray(tips.body.targetCompanies)).toBe(true);

    const remove = await request(app)
      .delete('/api/resume')
      .set('Authorization', `Bearer ${authToken}`);

    expect(remove.status).toBe(204);

    const afterDelete = await request(app)
      .get('/api/resume')
      .set('Authorization', `Bearer ${authToken}`);

    expect(afterDelete.status).toBe(404);
    expect(afterDelete.body.error).toBe('Resume not found');
  });

  it('validates mock interview scheduling, retrieval, and state transition', async () => {
    const scheduledAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const create = await request(app)
      .post('/api/mock-interview/schedule')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        companyId,
        interviewType: 'system_design',
        scheduledAt,
      });

    expect(create.status).toBe(201);
    expect(create.body.companyId).toBe(companyId);
    expect(create.body.interviewType).toBe('system_design');
    expect(create.body.status).toBe('pending');
    mockInterviewId = create.body.id;

    const list = await request(app)
      .get('/api/mock-interview')
      .set('Authorization', `Bearer ${authToken}`);

    expect(list.status).toBe(200);
    expect(Array.isArray(list.body)).toBe(true);
    expect(list.body.some((item: any) => item.id === mockInterviewId)).toBe(true);

    const detail = await request(app)
      .get(`/api/mock-interview/${mockInterviewId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(detail.status).toBe(200);
    expect(detail.body.id).toBe(mockInterviewId);
    expect(detail.body.status).toBe('pending');

    const update = await request(app)
      .patch(`/api/mock-interview/${mockInterviewId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ status: 'completed', rating: 4.5, feedback: 'Strong communication and architecture framing.' });

    expect(update.status).toBe(200);
    expect(update.body.status).toBe('completed');
    expect(asNumber(update.body.rating)).toBe(4.5);
    expect(update.body.feedback).toContain('Strong communication');
  });

  it('validates leaderboard and badges payload correctness', async () => {
    const myRank = await request(app)
      .get('/api/leaderboard/my-rank')
      .set('Authorization', `Bearer ${authToken}`);

    expect(myRank.status).toBe(200);
    expect(myRank.body.status).toBe('success');
    expect(myRank.body.data).toBeTruthy();
    expectNumberLike(myRank.body.data.rank);
    expectNumberLike(myRank.body.data.totalPoints);
    expectNumberLike(myRank.body.data.codingScore);
    expectNumberLike(myRank.body.data.systemDesignScore);
    expectNumberLike(myRank.body.data.mockInterviewCount);

    const badgeCheck = await request(app)
      .post('/api/leaderboard/check-badges')
      .set('Authorization', `Bearer ${authToken}`)
      .send({});

    expect(badgeCheck.status).toBe(200);
    expect(badgeCheck.body.status).toBe('success');
    expect(Array.isArray(badgeCheck.body.data.newBadges)).toBe(true);

    const badges = await request(app)
      .get('/api/badges/user')
      .set('Authorization', `Bearer ${authToken}`);

    expect(badges.status).toBe(200);
    expect(badges.body.status).toBe('success');
    expect(Array.isArray(badges.body.data.all)).toBe(true);
    expectNumberLike(badges.body.data.earnedCount);
    expectNumberLike(badges.body.data.totalAvailable);
  });
});
