import pool from '../config/database';

// FAANG companies
const COMPANIES = [
  { name: 'Google', category: 'FAANG', description: 'Search, Cloud, AI/ML', difficulty_level: 'hard', rounds_count: 4 },
  { name: 'Amazon', category: 'FAANG', description: 'E-commerce, AWS, leadership', difficulty_level: 'hard', rounds_count: 5 },
  { name: 'Meta', category: 'FAANG', description: 'Social media, blockchain, VR', difficulty_level: 'hard', rounds_count: 4 },
  { name: 'Apple', category: 'FAANG', description: 'Hardware, iOS, privacy', difficulty_level: 'hard', rounds_count: 4 },
  { name: 'Microsoft', category: 'FAANG', description: 'Cloud, AI, enterprise', difficulty_level: 'medium', rounds_count: 4 },
  { name: 'Tesla', category: 'Tech', description: 'Automotive, AI, solar', difficulty_level: 'hard', rounds_count: 3 },
  { name: 'Netflix', category: 'Tech', description: 'Streaming, recommendations', difficulty_level: 'hard', rounds_count: 4 },
];

// 100+ Expanded coding challenges
const CODING_CHALLENGES = [
  // Easy - Arrays (10)
  { title: 'Two Sum', difficulty: 'easy', category: 'Arrays', problem_statement: 'Find two numbers that add up to a target.', constraints: 'O(n) time, O(n) space', company_name: 'Google', acceptance_rate: 47.5 },
  { title: 'Valid Parentheses', difficulty: 'easy', category: 'Stack', problem_statement: 'Check if parentheses are balanced.', constraints: 'O(n) time, O(n) space', company_name: 'Amazon', acceptance_rate: 40.2 },
  { title: 'Merge Sorted Array', difficulty: 'easy', category: 'Arrays', problem_statement: 'Merge two sorted arrays.', constraints: 'O(n+m) time', company_name: 'Apple', acceptance_rate: 51.3 },
  { title: 'Best Time to Buy/Sell Stock', difficulty: 'easy', category: 'Arrays', problem_statement: 'Find max profit from buying and selling stock.', constraints: 'O(n) time', company_name: 'Meta', acceptance_rate: 52.1 },
  { title: 'Maximum Subarray', difficulty: 'easy', category: 'DP', problem_statement: 'Find subarray with largest sum.', constraints: 'O(n) time', company_name: 'Amazon', acceptance_rate: 45.3 },
  { title: 'Reverse String', difficulty: 'easy', category: 'Strings', problem_statement: 'Reverse a string in-place.', constraints: 'O(n) time, O(1) space', company_name: 'Google', acceptance_rate: 78.9 },
  { title: 'Palindrome Number', difficulty: 'easy', category: 'Math', problem_statement: 'Check if integer is palindrome.', constraints: 'O(log n) time', company_name: 'Microsoft', acceptance_rate: 52.4 },
  { title: 'Plus One', difficulty: 'easy', category: 'Arrays', problem_statement: 'Add one to array representing number.', constraints: 'O(n) time', company_name: 'Apple', acceptance_rate: 55.8 },
  { title: 'Missing Number', difficulty: 'easy', category: 'Arrays', problem_statement: 'Find missing number in array 0 to n.', constraints: 'O(n) time, O(1) space', company_name: 'Netflix', acceptance_rate: 60.1 },
  { title: 'Majority Element', difficulty: 'easy', category: 'Arrays', problem_statement: 'Find element appearing more than n/2 times.', constraints: 'O(n) time', company_name: 'Google', acceptance_rate: 58.5 },

  // Medium - Arrays & Strings (15)
  { title: 'Longest Substring Without Repeating', difficulty: 'medium', category: 'Strings', problem_statement: 'Find longest substring without repeating chars.', constraints: 'O(n) time', company_name: 'Amazon', acceptance_rate: 33.2 },
  { title: 'Longest Palindromic Substring', difficulty: 'medium', category: 'Strings', problem_statement: 'Find longest palindromic substring.', constraints: 'O(n²) time', company_name: 'Meta', acceptance_rate: 32.4 },
  { title: 'Container With Most Water', difficulty: 'medium', category: 'Arrays', problem_statement: 'Find two lines that form container with most water.', constraints: 'O(n) time, O(1) space', company_name: 'Google', acceptance_rate: 51.7 },
  { title: 'LRU Cache', difficulty: 'medium', category: 'Design', problem_statement: 'Design LRU cache with O(1) operations.', constraints: 'O(1) get/put', company_name: 'Meta', acceptance_rate: 35.7 },
  { title: '3Sum', difficulty: 'medium', category: 'Arrays', problem_statement: 'Find all unique triplets that sum to 0.', constraints: 'O(n²) time', company_name: 'Amazon', acceptance_rate: 28.9 },
  { title: 'Letter Combinations of Phone Number', difficulty: 'medium', category: 'Backtracking', problem_statement: 'Generate all letter combinations for phone digits.', constraints: 'O(4^n) time', company_name: 'Google', acceptance_rate: 52.3 },
  { title: 'Coin Change', difficulty: 'medium', category: 'DP', problem_statement: 'Find minimum coins for target amount.', constraints: 'O(n*m) time', company_name: 'Amazon', acceptance_rate: 39.6 },
  { title: 'Word Break', difficulty: 'medium', category: 'DP', problem_statement: 'Check if string can be segmented by dict.', constraints: 'O(n²) time', company_name: 'Microsoft', acceptance_rate: 41.2 },
  { title: 'Set Matrix Zeroes', difficulty: 'medium', category: 'Arrays', problem_statement: 'Set rows/cols to 0 if cell is 0.', constraints: 'O(1) space', company_name: 'Meta', acceptance_rate: 46.7 },
  { title: 'Group Anagrams', difficulty: 'medium', category: 'Hash', problem_statement: 'Group strings that are anagrams.', constraints: 'O(n*k log k) time', company_name: 'Google', acceptance_rate: 61.5 },
  { title: 'Top K Frequent Elements', difficulty: 'medium', category: 'Heap', problem_statement: 'Find k most frequent elements.', constraints: 'O(n log k) time', company_name: 'Apple', acceptance_rate: 65.3 },
  { title: 'Kth Largest Element', difficulty: 'medium', category: 'Heap', problem_statement: 'Find kth largest element.', constraints: 'O(n log k) time', company_name: 'Amazon', acceptance_rate: 63.8 },
  { title: 'Rotate Array', difficulty: 'medium', category: 'Arrays', problem_statement: 'Rotate array by k positions.', constraints: 'O(n) time, O(1) space', company_name: 'Netflix', acceptance_rate: 48.2 },
  { title: 'Search in Rotated Array', difficulty: 'medium', category: 'Binary Search', problem_statement: 'Search in rotated sorted array.', constraints: 'O(log n) time', company_name: 'Google', acceptance_rate: 33.5 },
  { title: 'Find First and Last Position', difficulty: 'medium', category: 'Binary Search', problem_statement: 'Find first and last position of target.', constraints: 'O(log n) time', company_name: 'Meta', acceptance_rate: 37.2 },

  // Medium - Trees (10)
  { title: 'Binary Tree Level Order Traversal', difficulty: 'medium', category: 'Trees', problem_statement: 'Level-order traversal of binary tree.', constraints: 'O(n) time', company_name: 'Amazon', acceptance_rate: 59.3 },
  { title: 'Binary Tree Zigzag Traversal', difficulty: 'medium', category: 'Trees', problem_statement: 'Zigzag level-order traversal.', constraints: 'O(n) time', company_name: 'Google', acceptance_rate: 51.2 },
  { title: 'Lowest Common Ancestor', difficulty: 'medium', category: 'Trees', problem_statement: 'Find LCA of two nodes in BST.', constraints: 'O(h) time', company_name: 'Meta', acceptance_rate: 54.8 },
  { title: 'Path Sum', difficulty: 'medium', category: 'Trees', problem_statement: 'Check if tree has root-leaf path sum.', constraints: 'O(n) time', company_name: 'Apple', acceptance_rate: 46.3 },
  { title: 'Binary Tree Right Side View', difficulty: 'medium', category: 'Trees', problem_statement: 'Get right side view of binary tree.', constraints: 'O(n) time', company_name: 'Google', acceptance_rate: 61.1 },
  { title: 'Validate Binary Search Tree', difficulty: 'medium', category: 'Trees', problem_statement: 'Validate if tree is valid BST.', constraints: 'O(n) time', company_name: 'Amazon', acceptance_rate: 27.4 },
  { title: 'Binary Tree Maximum Path Sum', difficulty: 'medium', category: 'Trees', problem_statement: 'Find maximum path sum in tree.', constraints: 'O(n) time', company_name: 'Microsoft', acceptance_rate: 38.5 },
  { title: 'Serialize and Deserialize BST', difficulty: 'medium', category: 'Trees', problem_statement: 'Serialize BST to string and deserialize.', constraints: 'O(n) time', company_name: 'Meta', acceptance_rate: 52.7 },
  { title: 'Invert Binary Tree', difficulty: 'medium', category: 'Trees', problem_statement: 'Mirror/invert a binary tree.', constraints: 'O(n) time', company_name: 'Apple', acceptance_rate: 75.2 },
  { title: 'Same Tree', difficulty: 'medium', category: 'Trees', problem_statement: 'Check if two trees are identical.', constraints: 'O(min(m,n)) time', company_name: 'Google', acceptance_rate: 59.8 },

  // Hard (20)
  { title: 'Median of Two Sorted Arrays', difficulty: 'hard', category: 'Binary Search', problem_statement: 'Find median of two sorted arrays.', constraints: 'O(log(min(m,n))) time', company_name: 'Google', acceptance_rate: 28.9 },
  { title: 'Wildcard Matching', difficulty: 'hard', category: 'DP', problem_statement: 'Match string with wildcards * and ?.', constraints: 'O(m*n) time', company_name: 'Amazon', acceptance_rate: 29.3 },
  { title: 'Regular Expression Matching', difficulty: 'hard', category: 'DP', problem_statement: 'Match string with regex . and *.', constraints: 'O(m*n) time', company_name: 'Meta', acceptance_rate: 26.8 },
  { title: 'N-Queens', difficulty: 'hard', category: 'Backtracking', problem_statement: 'Place n queens on nxn chessboard.', constraints: 'O(n!) time', company_name: 'Google', acceptance_rate: 60.3 },
  { title: 'Word Ladder', difficulty: 'hard', category: 'BFS', problem_statement: 'Find shortest path between words.', constraints: 'O(n²*l) time', company_name: 'Amazon', acceptance_rate: 34.5 },
  { title: 'Word Ladder II', difficulty: 'hard', category: 'BFS', problem_statement: 'Find all shortest paths between words.', constraints: 'O(n²*l) time', company_name: 'Microsoft', acceptance_rate: 28.7 },
  { title: 'Skyline Problem', difficulty: 'hard', category: 'Heap', problem_statement: 'Compute skyline from buildings.', constraints: 'O(n log n) time', company_name: 'Meta', acceptance_rate: 38.9 },
  { title: 'Trapping Rain Water', difficulty: 'hard', category: 'Arrays', problem_statement: 'Calculate trapped rainwater.', constraints: 'O(n) time, O(1) space', company_name: 'Amazon', acceptance_rate: 51.8 },
  { title: 'Largest Rectangle in Histogram', difficulty: 'hard', category: 'Stack', problem_statement: 'Find largest rectangle in histogram.', constraints: 'O(n) time', company_name: 'Apple', acceptance_rate: 39.3 },
  { title: 'Merge K Sorted Lists', difficulty: 'hard', category: 'Heap', problem_statement: 'Merge k sorted linked lists.', constraints: 'O(n log k) time', company_name: 'Google', acceptance_rate: 46.7 },
  { title: 'Minimum Window Substring', difficulty: 'hard', category: 'Sliding Window', problem_statement: 'Find minimum window substring.', constraints: 'O(n) time', company_name: 'Meta', acceptance_rate: 33.7 },
  { title: 'Shortest Path in Grid', difficulty: 'hard', category: 'BFS', problem_statement: 'Find shortest path avoiding obstacles.', constraints: 'O(m*n) time', company_name: 'Amazon', acceptance_rate: 45.2 },
  { title: 'All Paths From Root to Leaves', difficulty: 'hard', category: 'Trees', problem_statement: 'Get all root-to-leaf paths.', constraints: 'O(n) time', company_name: 'Microsoft', acceptance_rate: 52.4 },
  { title: 'Maximum Product Subarray', difficulty: 'hard', category: 'DP', problem_statement: 'Find subarray with max product.', constraints: 'O(n) time', company_name: 'Netflix', acceptance_rate: 31.5 },
  { title: 'Russian Doll Envelopes', difficulty: 'hard', category: 'DP', problem_statement: 'Max number of nested envelopes.', constraints: 'O(n log n) time', company_name: 'Google', acceptance_rate: 33.2 },
  { title: 'Burst Balloons', difficulty: 'hard', category: 'DP', problem_statement: 'Burst balloons to maximize coins.', constraints: 'O(n³) time', company_name: 'Meta', acceptance_rate: 47.3 },
  { title: 'Edit Distance', difficulty: 'hard', category: 'DP', problem_statement: 'Min edits to transform string.', constraints: 'O(m*n) time', company_name: 'Amazon', acceptance_rate: 48.1 },
  { title: 'Distinct Subsequences', difficulty: 'hard', category: 'DP', problem_statement: 'Count distinct subsequences.', constraints: 'O(m*n) time', company_name: 'Microsoft', acceptance_rate: 40.7 },
  { title: 'Interleaving String', difficulty: 'hard', category: 'DP', problem_statement: 'Check if s3 is interleaving of s1 and s2.', constraints: 'O(m*n) time', company_name: 'Apple', acceptance_rate: 34.8 },
  { title: 'Binary Tree Maximum Path Sum Hard', difficulty: 'hard', category: 'Trees', problem_statement: 'Max path sum in binary tree.', constraints: 'O(n) time', company_name: 'Google', acceptance_rate: 37.3 },
];

const TEST_CASE_BANK: Record<
  string,
  Array<{ input: string; output: string; isSample: boolean; explanation: string }>
> = {
  'Two Sum': [
    { input: '4\n2 7 11 15\n9\n', output: '0 1\n', isSample: true, explanation: '2 + 7 = 9' },
    { input: '3\n3 2 4\n6\n', output: '1 2\n', isSample: true, explanation: '2 + 4 = 6' },
    { input: '2\n3 3\n6\n', output: '0 1\n', isSample: false, explanation: 'Duplicate values are valid' },
  ],
  'Valid Parentheses': [
    { input: '()[]{}\n', output: 'true\n', isSample: true, explanation: 'All pairs close in order' },
    { input: '(]\n', output: 'false\n', isSample: true, explanation: 'Mismatched bracket types' },
    { input: '([{}])\n', output: 'true\n', isSample: false, explanation: 'Nested valid sequence' },
  ],
  'Merge Sorted Array': [
    { input: '3\n1 2 3\n3\n2 5 6\n', output: '1 2 2 3 5 6\n', isSample: true, explanation: 'Classic merge operation' },
    { input: '1\n1\n0\n\n', output: '1\n', isSample: true, explanation: 'Second array is empty' },
    { input: '0\n\n2\n4 5\n', output: '4 5\n', isSample: false, explanation: 'First array is empty' },
  ],
  'Best Time to Buy/Sell Stock': [
    { input: '6\n7 1 5 3 6 4\n', output: '5\n', isSample: true, explanation: 'Buy at 1, sell at 6' },
    { input: '5\n7 6 4 3 1\n', output: '0\n', isSample: true, explanation: 'No profitable transaction' },
    { input: '7\n2 4 1 7 5 3 6\n', output: '6\n', isSample: false, explanation: 'Best spread is 1 to 7' },
  ],
  'Maximum Subarray': [
    { input: '9\n-2 1 -3 4 -1 2 1 -5 4\n', output: '6\n', isSample: true, explanation: 'Subarray [4,-1,2,1]' },
    { input: '1\n1\n', output: '1\n', isSample: true, explanation: 'Single value input' },
    { input: '3\n-3 -2 -1\n', output: '-1\n', isSample: false, explanation: 'All negative values' },
  ],
  'Reverse String': [
    { input: 'hello\n', output: 'olleh\n', isSample: true, explanation: 'Reverse all characters' },
    { input: 'InterviewPrep\n', output: 'perPweivretnI\n', isSample: true, explanation: 'Mixed case characters' },
    { input: 'a\n', output: 'a\n', isSample: false, explanation: 'Single character remains same' },
  ],
  'Palindrome Number': [
    { input: '121\n', output: 'true\n', isSample: true, explanation: 'Reads same both directions' },
    { input: '-121\n', output: 'false\n', isSample: true, explanation: 'Negative number is not palindrome' },
    { input: '10\n', output: 'false\n', isSample: false, explanation: 'Leading zero mismatch after reverse' },
  ],
  'Missing Number': [
    { input: '3\n3 0 1\n', output: '2\n', isSample: true, explanation: 'Range is 0..3' },
    { input: '2\n0 1\n', output: '2\n', isSample: true, explanation: 'Missing upper bound value' },
    { input: '9\n9 6 4 2 3 5 7 0 1\n', output: '8\n', isSample: false, explanation: 'Unordered sequence with one gap' },
  ],
  'Longest Substring Without Repeating': [
    { input: 'abcabcbb\n', output: '3\n', isSample: true, explanation: 'Longest is abc' },
    { input: 'bbbbb\n', output: '1\n', isSample: true, explanation: 'Single repeated character' },
    { input: 'pwwkew\n', output: '3\n', isSample: false, explanation: 'Longest is wke' },
  ],
  'Container With Most Water': [
    { input: '9\n1 8 6 2 5 4 8 3 7\n', output: '49\n', isSample: true, explanation: 'Indices 1 and 8 produce max area' },
    { input: '2\n1 1\n', output: '1\n', isSample: true, explanation: 'Only one possible container' },
    { input: '6\n4 3 2 1 4 5\n', output: '20\n', isSample: false, explanation: 'Best container spans edges with taller right wall' },
  ],
};

const buildCodingDescription = (title: string, problemStatement: string): string =>
  `${problemStatement}\n\nExecution contract:\n1) Read all required values from standard input (stdin).\n2) Print only the final answer to standard output (stdout).\n3) Follow the sample input/output format shown in test cases for this challenge.\n\nProblem: ${title}`;

// 15+ System Design problems
const SYSTEM_DESIGN_PROBLEMS = [
  { title: 'Design Twitter', difficulty: 'hard', description: 'Design Twitter with tweets, followers, feed.', requirements: 'Post, follow, feed, search', constraints: 'Millions of users', estimated_time_minutes: 60, company_name: 'Meta' },
  { title: 'Design Uber', difficulty: 'hard', description: 'Design ride-sharing system.', requirements: 'Matching, GPS, payments', constraints: 'Real-time, global', estimated_time_minutes: 60, company_name: 'Uber' },
  { title: 'Design Netflix', difficulty: 'hard', description: 'Design video streaming platform.', requirements: 'Stream, recommend, search', constraints: '200M+ users', estimated_time_minutes: 60, company_name: 'Netflix' },
  { title: 'Design YouTube', difficulty: 'hard', description: 'Design video platform.', requirements: 'Upload, stream, recommend', constraints: 'Billions of videos', estimated_time_minutes: 60, company_name: 'Google' },
  { title: 'Design Dropbox', difficulty: 'hard', description: 'Design file sync system.', requirements: 'Upload, sync, share', constraints: 'Consistency, bandwidth', estimated_time_minutes: 60, company_name: 'Meta' },
  { title: 'Design WhatsApp', difficulty: 'hard', description: 'Design messaging platform.', requirements: 'Messages, groups, calls', constraints: 'Real-time, encrypted', estimated_time_minutes: 60, company_name: 'Meta' },
  { title: 'Design Instagram', difficulty: 'hard', description: 'Design photo sharing platform.', requirements: 'Photos, feed, search', constraints: 'Millions of uploads/day', estimated_time_minutes: 60, company_name: 'Meta' },
  { title: 'Design Google Maps', difficulty: 'hard', description: 'Design maps/navigation system.', requirements: 'Maps, routing, traffic', constraints: 'Global coverage, real-time', estimated_time_minutes: 60, company_name: 'Google' },
  { title: 'Design Hotel Booking System', difficulty: 'hard', description: 'Design booking platform.', requirements: 'Search, book, reserve', constraints: 'Millions of rooms', estimated_time_minutes: 60, company_name: 'Amazon' },
  { title: 'Design TikTok', difficulty: 'hard', description: 'Design short video platform.', requirements: 'Upload, feed, recommend', constraints: 'Billions of videos', estimated_time_minutes: 60, company_name: 'ByteDance' },
  { title: 'Design LinkedIn', difficulty: 'hard', description: 'Design professional network.', requirements: 'Profiles, connections, feed', constraints: 'Millions of users', estimated_time_minutes: 60, company_name: 'LinkedIn' },
  { title: 'Design Slack', difficulty: 'hard', description: 'Design team communication platform.', requirements: 'Messages, channels, search', constraints: 'Real-time, searchable', estimated_time_minutes: 60, company_name: 'Slack' },
  { title: 'Design Parking Lot', difficulty: 'medium', description: 'Design parking lot system.', requirements: 'Reserve, pay, track', constraints: 'Efficiency, fairness', estimated_time_minutes: 45, company_name: 'Amazon' },
  { title: 'Design Stock Exchange System', difficulty: 'hard', description: 'Design stock trading platform.', requirements: 'Trade, quote, match', constraints: 'Low latency, high throughput', estimated_time_minutes: 60, company_name: 'Goldman Sachs' },
  { title: 'Design Recommendation System', difficulty: 'hard', description: 'Design recommendation engine.', requirements: 'Personalize, rank, serve', constraints: 'ML, real-time', estimated_time_minutes: 60, company_name: 'Google' },
];

export const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');

    // Seed companies
    for (const company of COMPANIES) {
      await pool.query(
        'INSERT INTO companies (name, category, description, difficulty_level, rounds_count) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (name) DO NOTHING',
        [company.name, company.category, company.description, company.difficulty_level, company.rounds_count]
      );
    }
    console.log(`✅ Seeded ${COMPANIES.length} companies`);

    // Get company IDs
    const companiesResult = await pool.query('SELECT id, name FROM companies');
    const companyMap = new Map(companiesResult.rows.map((r) => [r.name, r.id]));

    // Seed coding challenges
    let challengeCount = 0;
    for (const challenge of CODING_CHALLENGES) {
      const company_id = companyMap.get(challenge.company_name);
      if (company_id) {
        await pool.query(
          `INSERT INTO coding_challenges
            (title, difficulty, category, description, problem_statement, constraints, company_id, acceptance_rate)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (title) DO UPDATE
           SET
             difficulty = EXCLUDED.difficulty,
             category = EXCLUDED.category,
             description = EXCLUDED.description,
             problem_statement = EXCLUDED.problem_statement,
             constraints = EXCLUDED.constraints,
             company_id = EXCLUDED.company_id,
             acceptance_rate = EXCLUDED.acceptance_rate`,
          [
            challenge.title,
            challenge.difficulty,
            challenge.category,
            buildCodingDescription(challenge.title, challenge.problem_statement),
            challenge.problem_statement,
            challenge.constraints,
            company_id,
            challenge.acceptance_rate,
          ]
        );
        challengeCount++;
      }
    }
    console.log(`✅ Seeded ${challengeCount} coding challenges`);

    const challengesResult = await pool.query('SELECT id, title FROM coding_challenges');
    const challengeIdByTitle = new Map(challengesResult.rows.map((r) => [r.title, r.id]));

    let testCaseCount = 0;
    for (const [title, testCases] of Object.entries(TEST_CASE_BANK)) {
      const challengeId = challengeIdByTitle.get(title);
      if (!challengeId) {
        continue;
      }

      await pool.query('DELETE FROM test_cases WHERE challenge_id = $1', [challengeId]);

      for (const testCase of testCases) {
        await pool.query(
          `INSERT INTO test_cases (challenge_id, input_data, expected_output, is_sample, explanation)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            challengeId,
            testCase.input,
            testCase.output,
            testCase.isSample,
            testCase.explanation,
          ]
        );
        testCaseCount++;
      }
    }
    console.log(`✅ Seeded ${testCaseCount} coding test cases`);

    // Seed system design problems
    for (const problem of SYSTEM_DESIGN_PROBLEMS) {
      const company_id = companyMap.get(problem.company_name);
      if (company_id) {
        await pool.query(
          'INSERT INTO system_design_problems (title, difficulty, description, requirements, constraints, estimated_time_minutes, company_id) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (title) DO NOTHING',
          [problem.title, problem.difficulty, problem.description, problem.requirements, problem.constraints, problem.estimated_time_minutes, company_id]
        );
      }
    }
    console.log(`✅ Seeded ${SYSTEM_DESIGN_PROBLEMS.length} system design problems`);

    console.log('🎉 Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
