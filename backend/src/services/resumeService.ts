import pool from '../config/database';

export interface Resume {
  id: number;
  userId: number;
  title: string;
  summary: string;
  experience: any[];
  education: any[];
  skills: string[];
  projects: any[];
  certifications: any[];
  resumeScore: number;
  aiSuggestions: string;
  optimizedContent: string;
}

export const createOrUpdateResume = async (
  userId: number,
  resumeData: {
    title: string;
    summary: string;
    experience: any[];
    education: any[];
    skills: string[];
    projects: any[];
    certifications: any[];
  }
): Promise<Resume> => {
  try {
    // Check if resume exists
    const existingResult = await pool.query(
      'SELECT id FROM resumes WHERE user_id = $1',
      [userId]
    );

    // Generate AI score and suggestions
    const scores = calculateResumeScore(resumeData);
    const suggestions = generateResumeSuggestions(resumeData, scores);
    const optimized = generateOptimizedContent(resumeData);

    let result;
    if (existingResult.rows.length > 0) {
      result = await pool.query(
        `UPDATE resumes SET
          title = $1, summary = $2, experience = $3, education = $4,
          skills = $5, projects = $6, certifications = $7,
          resume_score = $8, ai_suggestions = $9, optimized_content = $10,
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $11
        RETURNING *`,
        [
          resumeData.title,
          resumeData.summary,
          JSON.stringify(resumeData.experience),
          JSON.stringify(resumeData.education),
          JSON.stringify(resumeData.skills),
          JSON.stringify(resumeData.projects),
          JSON.stringify(resumeData.certifications),
          scores.overallScore,
          suggestions,
          optimized,
          userId,
        ]
      );
    } else {
      result = await pool.query(
        `INSERT INTO resumes (
          user_id, title, summary, experience, education, skills,
          projects, certifications, resume_score, ai_suggestions, optimized_content
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          userId,
          resumeData.title,
          resumeData.summary,
          JSON.stringify(resumeData.experience),
          JSON.stringify(resumeData.education),
          JSON.stringify(resumeData.skills),
          JSON.stringify(resumeData.projects),
          JSON.stringify(resumeData.certifications),
          scores.overallScore,
          suggestions,
          optimized,
        ]
      );
    }

    return mapResumeRow(result.rows[0]);
  } catch (error) {
    console.error('Error saving resume:', error);
    throw error;
  }
};

export const getUserResume = async (userId: number): Promise<Resume | null> => {
  try {
    const result = await pool.query('SELECT * FROM resumes WHERE user_id = $1', [
      userId,
    ]);

    if (result.rows.length === 0) return null;

    return mapResumeRow(result.rows[0]);
  } catch (error) {
    console.error('Error fetching resume:', error);
    throw error;
  }
};

export const getResumeImprovementTips = async (
  userId: number
): Promise<{
  tips: string[];
  prioritizedActions: string[];
  targetCompanies: string[];
}> => {
  try {
    const resume = await getUserResume(userId);
    if (!resume) {
      throw new Error('Resume not found');
    }

    const tips = generateDetailedTips(resume);
    const prioritizedActions = generatePrioritizedActions(resume);
    const targetCompanies = recommendTargetCompanies(resume);

    return { tips, prioritizedActions, targetCompanies };
  } catch (error) {
    console.error('Error generating improvement tips:', error);
    throw error;
  }
};

const calculateResumeScore = (
  data: any
): {
  contentScore: number;
  structureScore: number;
  relevanceScore: number;
  overallScore: number;
} => {
  let contentScore = 0;
  let structureScore = 0;
  let relevanceScore = 0;

  // Content Score
  if (data.summary && data.summary.length > 50) contentScore += 2;
  if (data.experience && data.experience.length > 0) contentScore += 2;
  if (data.education && data.education.length > 0) contentScore += 2;
  if (data.skills && data.skills.length >= 5) contentScore += 2;
  if (data.projects && data.projects.length > 0) contentScore += 1;
  if (data.certifications && data.certifications.length > 0) contentScore += 1;

  // Structure Score
  if (data.title) structureScore += 1.5;
  if (data.experience?.every((e: any) => e.company && e.role && e.duration))
    structureScore += 2;
  if (data.education?.every((e: any) => e.school && e.degree))
    structureScore += 2;
  if (data.projects?.every((p: any) => p.name && p.description))
    structureScore += 2;
  if (Array.isArray(data.skills) && data.skills.every((s: any) => s.length > 0))
    structureScore += 1.5;

  // Relevance Score
  const relevantSkills = data.skills.filter((s: string) =>
    /^(python|java|javascript|react|aws|microservices|system design|sql|docker|kubernetes)/i.test(
      s
    )
  );
  if (relevantSkills.length > 0) relevanceScore += 2;

  const technicalProjectsCount = data.projects?.filter(
    (p: any) =>
      p.description &&
      /^(built|developed|created|designed|implemented)/i.test(p.description)
  ).length;
  if (technicalProjectsCount > 0) relevanceScore += 2;

  const overallScore = Math.min(10, (contentScore + structureScore + relevanceScore) / 1.2);

  return {
    contentScore: Math.round((contentScore / 10) * 10) / 10,
    structureScore: Math.round((structureScore / 9) * 10) / 10,
    relevanceScore: Math.round((relevanceScore / 4) * 10) / 10,
    overallScore: Math.round(overallScore * 10) / 10,
  };
};

const generateResumeSuggestions = (data: any, scores: any): string => {
  const suggestions: string[] = [];

  if (!data.summary || data.summary.length < 50) {
    suggestions.push('Add a compelling professional summary (50+ characters)');
  }

  if (!data.experience || data.experience.length === 0) {
    suggestions.push('Include your work experience with companies and roles');
  }

  if (!data.skills || data.skills.length < 5) {
    suggestions.push('Add at least 5-10 technical skills relevant to FAANG');
  }

  if (!data.projects || data.projects.length === 0) {
    suggestions.push('Highlight 2-3 significant projects you built');
  }

  if (scores.contentScore < 6) {
    suggestions.push('Expand content - add more details to experience and education');
  }

  if (scores.relevanceScore < 6) {
    suggestions.push('Include more FAANG-relevant technologies and skills');
  }

  return suggestions.join('; ');
};

const generateOptimizedContent = (data: any): string => {
  const actionVerbs = [
    'Architected',
    'Developed',
    'Built',
    'Designed',
    'Implemented',
    'Deployed',
    'Optimized',
    'Led',
    'Spearheaded',
    'Drove',
  ];

  let optimized = '';

  if (data.experience && data.experience.length > 0) {
    optimized +=
      data.experience
        .map(
          (exp: any) =>
            `${actionVerbs[0]} ${exp.role} at ${exp.company} (${exp.duration})`
        )
        .join('; ') + '; ';
  }

  if (data.skills && data.skills.length > 0) {
    optimized +=
      'Technical Skills: ' +
      data.skills
        .slice(0, 10)
        .join(', ')
        .toUpperCase() +
      '; ';
  }

  return optimized;
};

const generateDetailedTips = (resume: Resume): string[] => {
  const tips: string[] = [];

  if (resume.resumeScore < 7) {
    tips.push('Focus on quantifying your achievements with metrics');
    tips.push('Use strong action verbs and technical keywords');
    tips.push('Ensure consistent formatting and spacing');
  }

  if (resume.resumeScore >= 7 && resume.resumeScore < 8.5) {
    tips.push('Add more impact statements with business results');
    tips.push('Include specific technologies and tools used');
    tips.push('Consider adding more relevant certifications');
  }

  if (resume.resumeScore >= 8.5) {
    tips.push('Your resume is strong - now focus on mock interviews');
    tips.push('Practice telling stories behind your achievements');
  }

  return tips;
};

const generatePrioritizedActions = (resume: Resume): string[] => {
  return [
    '1. Tailor resume keywords for each FAANG company',
    '2. Add quantifiable metrics to achievements (10%, $X, Nx faster)',
    '3. Highlight system design and scalability accomplishments',
    '4. Include 3-5 technical projects with results',
    '5. List relevant certifications and continuous learning',
  ];
};

const recommendTargetCompanies = (resume: Resume): string[] => {
  const normalizedSkills = resume.skills.map((skill) => skill.toLowerCase());

  if (normalizedSkills.some((skill) => skill.includes('cloud') || skill.includes('aws') || skill.includes('azure'))) {
    return ['Amazon', 'Microsoft', 'Google'];
  }

  if (normalizedSkills.some((skill) => skill.includes('ios') || skill.includes('swift') || skill.includes('mobile'))) {
    return ['Apple', 'Google', 'Meta'];
  }

  if (normalizedSkills.some((skill) => skill.includes('distributed') || skill.includes('system design') || skill.includes('kubernetes'))) {
    return ['Meta', 'Google', 'Netflix'];
  }

  return ['Google', 'Amazon', 'Meta'];
};

const mapResumeRow = (row: any): Resume => ({
  id: row.id,
  userId: row.user_id,
  title: row.title,
  summary: row.summary,
  experience: JSON.parse(row.experience || '[]'),
  education: JSON.parse(row.education || '[]'),
  skills: JSON.parse(row.skills || '[]'),
  projects: JSON.parse(row.projects || '[]'),
  certifications: JSON.parse(row.certifications || '[]'),
  resumeScore: row.resume_score,
  aiSuggestions: row.ai_suggestions,
  optimizedContent: row.optimized_content,
});
