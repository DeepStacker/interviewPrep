import pool from '../config/database';

export interface PreparationRoadmap {
  id: number;
  userId: number;
  companyId: number;
  targetRole: string;
  difficulty: string;
  roadmapContent: any;
  progressPercentage: number;
  estimatedDaysToComplete: number;
}

export interface RoadmapWeek {
  week: number;
  focus: string;
  topics: string[];
  tasks: Task[];
  estimatedHours: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  type: 'coding' | 'system-design' | 'interview' | 'learning';
  difficulty: string;
  completed: boolean;
  resources?: string[];
}

const ROADMAP_TEMPLATES = {
  faang_new_grad: {
    weeks: 12,
    structure: [
      {
        week: 1,
        focus: 'Fundamentals & Resume',
        topics: ['Data Structures', 'Algorithms Basics', 'Resume Review'],
        hours: 15,
      },
      {
        week: 2,
        focus: 'Arrays & Strings',
        topics: ['Array Problems', 'String Manipulation', 'LeetCode Easy'],
        hours: 12,
      },
      {
        week: 3,
        focus: 'Linked Lists & Trees',
        topics: ['Linked List Operations', 'Tree Traversal', 'Binary Trees'],
        hours: 12,
      },
      {
        week: 4,
        focus: 'Graphs & BFS/DFS',
        topics: ['Graph Algorithms', 'BFS/DFS', 'Connected Components'],
        hours: 12,
      },
      {
        week: 5,
        focus: 'Dynamic Programming',
        topics: ['DP Patterns', 'Memoization', 'Bottom-up DP'],
        hours: 15,
      },
      {
        week: 6,
        focus: 'System Design Basics',
        topics: ['Scalability', 'Load Balancing', 'Database Design'],
        hours: 14,
      },
      {
        week: 7,
        focus: 'Coding Round Sprint',
        topics: ['LeetCode Medium', 'Problem Solving', 'Code Optimization'],
        hours: 20,
      },
      {
        week: 8,
        focus: 'System Design Deep Dive',
        topics: ['Distributed Systems', 'Microservices', 'Design Patterns'],
        hours: 18,
      },
      {
        week: 9,
        focus: 'Advanced Topics',
        topics: ['Caching', 'Message Queues', 'Search Engines'],
        hours: 16,
      },
      {
        week: 10,
        focus: 'Mock Interviews',
        topics: ['Practice Interviews', 'Communication', 'Problem Discussion'],
        hours: 16,
      },
      {
        week: 11,
        focus: 'Behavioral & Final Prep',
        topics: ['Behavioral Questions', 'Company Research', 'Mock Final'],
        hours: 12,
      },
      {
        week: 12,
        focus: 'Interview Week',
        topics: ['Last Minute Review', 'Final Mock', 'Rest & Recovery'],
        hours: 8,
      },
    ],
  },
  faang_experienced: {
    weeks: 8,
    structure: [
      {
        week: 1,
        focus: 'Quick Review & Resume',
        topics: ['Advanced DS/A', 'Resume Optimization', 'System Design Intro'],
        hours: 10,
      },
      {
        week: 2,
        focus: 'Medium to Hard Coding',
        topics: ['LeetCode Hard', 'Edge Cases', 'Optimization'],
        hours: 14,
      },
      {
        week: 3,
        focus: 'System Design Part 1',
        topics: ['Design Patterns', 'Scalability', 'Database Design'],
        hours: 16,
      },
      {
        week: 4,
        focus: 'System Design Part 2',
        topics: ['Cache Design', 'Message Queues', 'Real World Examples'],
        hours: 16,
      },
      {
        week: 5,
        focus: 'Advanced System Design',
        topics: ['Distributed Consensus', 'Failover Strategies'],
        hours: 14,
      },
      {
        week: 6,
        focus: 'Mock Interviews',
        topics: ['Full Round Mocks', 'Communication', 'Feedback'],
        hours: 15,
      },
      {
        week: 7,
        focus: 'Final Sprint',
        topics: ['Weak Areas Focus', 'Company Specific', 'Mock Final'],
        hours: 12,
      },
      {
        week: 8,
        focus: 'Interview Prep',
        topics: ['Last Minute Tips', 'Behavioral Prep', 'Rest'],
        hours: 6,
      },
    ],
  },
};

export const generatePersonalizedRoadmap = async (
  userId: number,
  companyId: number,
  targetRole: string,
  experienceLevel: 'new_grad' | 'experienced',
  difficulty: 'easy' | 'medium' | 'hard' = 'medium'
): Promise<PreparationRoadmap> => {
  try {
    const template =
      experienceLevel === 'new_grad'
        ? ROADMAP_TEMPLATES.faang_new_grad
        : ROADMAP_TEMPLATES.faang_experienced;

    const roadmapContent = buildRoadmapContent(
      template,
      targetRole,
      difficulty
    );

    // Check if roadmap exists
    const existingResult = await pool.query(
      'SELECT id FROM preparation_roadmaps WHERE user_id = $1 AND company_id = $2',
      [userId, companyId]
    );

    let result;
    if (existingResult.rows.length > 0) {
      result = await pool.query(
        `UPDATE preparation_roadmaps SET
          roadmap_content = $1, difficulty_level = $2, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $3 AND company_id = $4
        RETURNING *`,
        [JSON.stringify(roadmapContent), difficulty, userId, companyId]
      );
    } else {
      result = await pool.query(
        `INSERT INTO preparation_roadmaps (
          user_id, company_id, target_role, difficulty_level, roadmap_content,
          estimated_days_to_complete
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *`,
        [
          userId,
          companyId,
          targetRole,
          difficulty,
          JSON.stringify(roadmapContent),
          template.weeks * 7,
        ]
      );
    }

    return mapRoadmapRow(result.rows[0]);
  } catch (error) {
    console.error('Error generating roadmap:', error);
    throw error;
  }
};

export const getUserRoadmaps = async (
  userId: number
): Promise<PreparationRoadmap[]> => {
  try {
    const result = await pool.query(
      `SELECT pr.*, c.name as company_name FROM preparation_roadmaps pr
       LEFT JOIN companies c ON pr.company_id = c.id
       WHERE pr.user_id = $1
       ORDER BY pr.created_at DESC`,
      [userId]
    );

    return result.rows.map(mapRoadmapRow);
  } catch (error) {
    console.error('Error fetching roadmaps:', error);
    throw error;
  }
};

export const updateRoadmapProgress = async (
  roadmapId: number,
  progressPercentage: number
): Promise<void> => {
  try {
    await pool.query(
      'UPDATE preparation_roadmaps SET progress_percentage = $1 WHERE id = $2',
      [progressPercentage, roadmapId]
    );
  } catch (error) {
    console.error('Error updating roadmap progress:', error);
    throw error;
  }
};

export const getRoadmapResources = (
  topic: string
): { title: string; link: string; type: string }[] => {
  const resourceMap: {
    [key: string]: { title: string; link: string; type: string }[];
  } = {
    'Data Structures': [
      {
        title: 'LeetCode DSA',
        link: 'https://leetcode.com/explore/learn/',
        type: 'practice',
      },
      {
        title: 'GeeksforGeeks',
        link: 'https://www.geeksforgeeks.org/',
        type: 'learning',
      },
    ],
    'System Design': [
      {
        title: 'Design Guru',
        link: 'https://www.designgurus.io/',
        type: 'course',
      },
      {
        title: 'System Design Interview',
        link: 'https://github.com/donnemartin/system-design-primer',
        type: 'guide',
      },
    ],
    Algorithms: [
      {
        title: 'Algorithms Illuminated',
        link: 'https://www.algorithmsilluminated.org/',
        type: 'book',
      },
      {
        title: 'LeetCode',
        link: 'https://leetcode.com/',
        type: 'practice',
      },
    ],
  };

  return resourceMap[topic] || [];
};

const buildRoadmapContent = (
  template: any,
  targetRole: string,
  difficulty: string
): RoadmapWeek[] => {
  return template.structure.map((week: any) => ({
    week: week.week,
    focus: week.focus,
    topics: week.topics,
    tasks: generateWeeklyTasks(week, targetRole, difficulty),
    estimatedHours: week.hours,
  }));
};

const generateWeeklyTasks = (
  week: any,
  targetRole: string,
  difficulty: string
): Task[] => {
  const tasks: Task[] = [];
  const taskTypes = {
    'Data Structures': 'coding',
    'System Design': 'system-design',
    Algorithms: 'coding',
    'Mock Interviews': 'interview',
  } as any;

  week.topics.forEach((topic: string) => {
    const taskType = taskTypes[topic] || 'learning';
    tasks.push({
      id: `${week.week}-${topic.replace(/\s+/g, '-').toLowerCase()}`,
      title: `Master ${topic}`,
      description: `Learn and practice ${topic} for ${targetRole} interviews`,
      type: taskType as any,
      difficulty,
      completed: false,
      resources: getRoadmapResources(topic).map((r) => r.link),
    });
  });

  return tasks;
};

const parseJsonValue = <T>(value: unknown, fallback: T): T => {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }

  if (typeof value === 'object') {
    return value as T;
  }

  return fallback;
};

const mapRoadmapRow = (row: any): PreparationRoadmap => ({
  id: row.id,
  userId: row.user_id,
  companyId: row.company_id,
  targetRole: row.target_role,
  difficulty: row.difficulty_level,
  roadmapContent: parseJsonValue(row.roadmap_content, {}),
  progressPercentage: row.progress_percentage || 0,
  estimatedDaysToComplete: row.estimated_days_to_complete,
});
