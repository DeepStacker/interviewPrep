import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export default pool;

export const initializeDatabase = async () => {
  try {
    const client = await pool.connect();
    console.log('Connected to PostgreSQL');

    // Create tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        google_id VARCHAR(255) UNIQUE,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255),
        picture_url TEXT,
        is_admin BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        job_role VARCHAR(100) NOT NULL,
        company_type VARCHAR(50),
        difficulty VARCHAR(20),
        total_score DECIMAL(5,2),
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        status VARCHAR(20) DEFAULT 'in_progress'
      );

      CREATE TABLE IF NOT EXISTS questions (
        id SERIAL PRIMARY KEY,
        session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        question_text TEXT NOT NULL,
        question_number INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS answers (
        id SERIAL PRIMARY KEY,
        question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
        user_answer TEXT NOT NULL,
        score INTEGER,
        strengths TEXT,
        missing_points TEXT,
        ideal_answer TEXT,
        evaluation_time TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS behavior_metrics (
        id SERIAL PRIMARY KEY,
        answer_id INTEGER NOT NULL REFERENCES answers(id) ON DELETE CASCADE,
        confidence DECIMAL(5,2),
        speaking_pace DECIMAL(5,2),
        pause_frequency INTEGER,
        eye_contact_percentage DECIMAL(5,2),
        facial_expression_score DECIMAL(5,2),
        body_movement_score DECIMAL(5,2),
        voice_clarity DECIMAL(5,2),
        voice_tone_confidence DECIMAL(5,2),
        speaking_duration_seconds INTEGER,
        silence_duration_seconds INTEGER,
        word_count INTEGER,
        unique_words INTEGER,
        filler_words_count INTEGER,
        filler_word_percentage DECIMAL(5,2),
        response_time_seconds INTEGER,
        video_recording_url TEXT,
        screen_recording_url TEXT,
        audio_transcript TEXT,
        overall_behavior_score DECIMAL(5,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS session_behavior_summary (
        id SERIAL PRIMARY KEY,
        session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        avg_confidence DECIMAL(5,2),
        avg_eye_contact DECIMAL(5,2),
        avg_speaking_pace DECIMAL(5,2),
        avg_voice_clarity DECIMAL(5,2),
        avg_facial_expression DECIMAL(5,2),
        avg_body_movement DECIMAL(5,2),
        total_filler_words INTEGER,
        avg_filler_word_percentage DECIMAL(5,2),
        total_speaking_duration_seconds INTEGER,
        consistency_score DECIMAL(5,2),
        improvement_trend DECIMAL(5,2),
        generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS behavioral_insights (
        id SERIAL PRIMARY KEY,
        session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        strengths_identified TEXT,
        areas_for_improvement TEXT,
        confidence_level TEXT,
        communication_style TEXT,
        body_language_feedback TEXT,
        eye_contact_feedback TEXT,
        pacing_feedback TEXT,
        articulation_feedback TEXT,
        overall_presentation_score DECIMAL(5,2),
        recommendations TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS companies (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        category VARCHAR(50),
        description TEXT,
        difficulty_level VARCHAR(20),
        logo_url TEXT,
        website_url TEXT,
        rounds_count INTEGER DEFAULT 4,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS interview_rounds (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        round_type VARCHAR(50) NOT NULL,
        round_number INTEGER,
        round_name VARCHAR(100),
        description TEXT,
        status VARCHAR(20) DEFAULT 'not_started',
        score DECIMAL(5,2),
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS coding_challenges (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        difficulty VARCHAR(20),
        category VARCHAR(100),
        description TEXT,
        problem_statement TEXT,
        time_limit_minutes INTEGER DEFAULT 60,
        examples JSONB,
        constraints TEXT,
        company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
        acceptance_rate DECIMAL(5,2),
        similar_companies TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS code_submissions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        challenge_id INTEGER NOT NULL REFERENCES coding_challenges(id) ON DELETE CASCADE,
        code_content TEXT NOT NULL,
        programming_language VARCHAR(50),
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        execution_status VARCHAR(20),
        passed_test_cases INTEGER DEFAULT 0,
        total_test_cases INTEGER DEFAULT 0,
        time_taken_ms INTEGER,
        memory_used_mb DECIMAL(10,2),
        score DECIMAL(5,2),
        feedback TEXT,
        is_accepted BOOLEAN DEFAULT false
      );

      CREATE TABLE IF NOT EXISTS test_cases (
        id SERIAL PRIMARY KEY,
        challenge_id INTEGER NOT NULL REFERENCES coding_challenges(id) ON DELETE CASCADE,
        input_data TEXT NOT NULL,
        expected_output TEXT NOT NULL,
        is_sample BOOLEAN DEFAULT false,
        explanation TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS system_design_problems (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        difficulty VARCHAR(20),
        description TEXT,
        requirements TEXT,
        constraints TEXT,
        estimated_time_minutes INTEGER DEFAULT 45,
        company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS system_design_submissions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        problem_id INTEGER NOT NULL REFERENCES system_design_problems(id) ON DELETE CASCADE,
        design_document TEXT,
        whiteboard_image_url TEXT,
        architecture_score DECIMAL(5,2),
        scalability_score DECIMAL(5,2),
        reliability_score DECIMAL(5,2),
        trade_off_analysis_score DECIMAL(5,2),
        overall_score DECIMAL(5,2),
        expert_feedback TEXT,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS resumes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255),
        summary TEXT,
        experience JSONB,
        education JSONB,
        skills JSONB,
        projects JSONB,
        certifications JSONB,
        resume_score DECIMAL(5,2),
        ai_suggestions TEXT,
        optimized_content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS preparation_roadmaps (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        target_role VARCHAR(100),
        difficulty_level VARCHAR(20),
        roadmap_content JSONB,
        progress_percentage DECIMAL(5,2) DEFAULT 0,
        estimated_days_to_complete INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS mock_interviews (
        id SERIAL PRIMARY KEY,
        interviewer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        interviewee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        interview_type VARCHAR(50),
        scheduled_at TIMESTAMP NOT NULL,
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        duration_minutes INTEGER,
        recording_url TEXT,
        rating DECIMAL(5,2),
        feedback TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS technical_assessments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        assessment_type VARCHAR(50),
        topics_covered TEXT,
        score DECIMAL(5,2),
        total_questions INTEGER,
        correct_answers INTEGER,
        average_time_per_question INTEGER,
        strengths TEXT,
        weaknesses TEXT,
        recommendations TEXT,
        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS achievement_badges (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        badge_type VARCHAR(100),
        badge_name VARCHAR(255),
        description TEXT,
        icon_url TEXT,
        earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS leaderboards (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        total_points INTEGER DEFAULT 0,
        coding_score DECIMAL(5,2) DEFAULT 0,
        system_design_score DECIMAL(5,2) DEFAULT 0,
        technical_score DECIMAL(5,2) DEFAULT 0,
        interview_score DECIMAL(5,2) DEFAULT 0,
        rank INTEGER,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_coding_challenges_title_unique ON coding_challenges(title);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_system_design_problems_title_unique ON system_design_problems(title);
      CREATE INDEX IF NOT EXISTS idx_questions_session_id ON questions(session_id);
      CREATE INDEX IF NOT EXISTS idx_answers_question_id ON answers(question_id);
      CREATE INDEX IF NOT EXISTS idx_behavior_metrics_answer_id ON behavior_metrics(answer_id);
      CREATE INDEX IF NOT EXISTS idx_session_behavior_session_id ON session_behavior_summary(session_id);
      CREATE INDEX IF NOT EXISTS idx_behavioral_insights_session_id ON behavioral_insights(session_id);
      CREATE INDEX IF NOT EXISTS idx_coding_challenges_difficulty ON coding_challenges(difficulty);
      CREATE INDEX IF NOT EXISTS idx_coding_challenges_category ON coding_challenges(category);
      CREATE INDEX IF NOT EXISTS idx_code_submissions_user_id ON code_submissions(user_id);
      CREATE INDEX IF NOT EXISTS idx_code_submissions_challenge_id ON code_submissions(challenge_id);
      CREATE INDEX IF NOT EXISTS idx_interview_rounds_user_id ON interview_rounds(user_id);
      CREATE INDEX IF NOT EXISTS idx_interview_rounds_company_id ON interview_rounds(company_id);
      CREATE INDEX IF NOT EXISTS idx_mock_interviews_interviewee_id ON mock_interviews(interviewee_id);
      CREATE INDEX IF NOT EXISTS idx_technical_assessments_user_id ON technical_assessments(user_id);
      CREATE INDEX IF NOT EXISTS idx_leaderboards_user_id ON leaderboards(user_id);
    `);

    console.log('Tables created successfully');
    client.release();
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};
