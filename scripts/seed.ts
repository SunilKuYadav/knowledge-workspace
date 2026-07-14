/**
 * Seed script — creates sample workspace data for development and demo purposes.
 *
 * Usage:
 *   npx tsx scripts/seed.ts
 *
 * Set WORKSPACE_PATH env var to control where data is created.
 * Defaults to ~/knowledge-workspace.
 */

import path from 'path';
import { mkdir, writeFile } from 'fs/promises';

const WORKSPACE_PATH =
  process.env.WORKSPACE_PATH ||
  path.resolve(__dirname, '..', 'knowledge-workspace');

async function ensureDir(dir: string) {
  await mkdir(dir, { recursive: true });
}

async function writeJson(filePath: string, data: unknown) {
  await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

async function writeMd(filePath: string, content: string) {
  await writeFile(filePath, content, 'utf-8');
}

async function seedTopics() {
  // --- Binary Trees (DSA) ---
  const btDir = path.join(WORKSPACE_PATH, 'notes', 'dsa', 'binary-trees');
  await ensureDir(btDir);
  await writeJson(path.join(btDir, 'topic.json'), {
    id: 'binary-trees',
    title: 'Binary Trees',
    category: 'dsa',
    difficulty: 'medium',
    status: 'in-progress',
    confidence: 3,
    tags: ['trees', 'recursion', 'dfs', 'bfs'],
    createdAt: '2024-06-10T09:00:00Z',
    updatedAt: '2024-06-18T14:30:00Z',
  });
  await writeMd(path.join(btDir, 'overview.md'), `# Binary Trees

## Overview

A binary tree is a hierarchical data structure where each node has at most two children (left and right). They form the basis for BSTs, heaps, and many graph algorithms.

## Key Properties

- **Height**: longest path from root to leaf
- **Balanced**: height difference between subtrees ≤ 1
- **Complete**: all levels filled except possibly the last
- **Full**: every node has 0 or 2 children
`);
  await writeMd(path.join(btDir, 'notes.md'), `# Binary Trees - Notes

## Traversal Methods

1. **Inorder** (Left, Root, Right) — gives sorted order in BST
2. **Preorder** (Root, Left, Right) — useful for serialization
3. **Postorder** (Left, Right, Root) — useful for deletion
4. **Level-order** (BFS) — uses a queue

## Common Patterns

- Recursive DFS for most tree problems
- Use a stack for iterative DFS
- Use a queue for BFS / level-order
- Two-pointer technique with parent pointers
`);
  await writeMd(path.join(btDir, 'patterns.md'), `# Binary Trees - Patterns

## Pattern 1: Recursive DFS

\`\`\`python
def dfs(node):
    if not node:
        return
    # process node
    dfs(node.left)
    dfs(node.right)
\`\`\`

## Pattern 2: Level-Order BFS

\`\`\`python
from collections import deque

def bfs(root):
    queue = deque([root])
    while queue:
        node = queue.popleft()
        # process node
        if node.left: queue.append(node.left)
        if node.right: queue.append(node.right)
\`\`\`
`);
  await writeMd(path.join(btDir, 'mistakes.md'), `# Binary Trees - Common Mistakes

- Forgetting the base case (null node) in recursion
- Confusing inorder vs preorder traversal output
- Not handling single-child nodes correctly in deletion
- Off-by-one errors when calculating height (leaf = 0 or 1?)
`);
  await writeJson(path.join(btDir, 'flashcards.json'), {
    topicId: 'binary-trees',
    cards: [
      {
        id: 'fc-bt-001',
        front: 'What is the time complexity of searching in a balanced BST?',
        back: 'O(log n) — each comparison eliminates half the remaining nodes.',
        tags: ['bst', 'complexity'],
        topicId: 'binary-trees',
        createdAt: '2024-06-10T09:00:00Z',
      },
      {
        id: 'fc-bt-002',
        front: 'What traversal gives sorted output from a BST?',
        back: 'Inorder traversal (Left, Root, Right)',
        tags: ['traversal', 'bst'],
        topicId: 'binary-trees',
        createdAt: '2024-06-10T09:00:00Z',
      },
      {
        id: 'fc-bt-003',
        front: 'How do you find the height of a binary tree?',
        back: 'Recursively: height(node) = 1 + max(height(left), height(right)). Base case: null → -1 (or 0 depending on definition).',
        tags: ['recursion', 'height'],
        topicId: 'binary-trees',
        createdAt: '2024-06-11T10:00:00Z',
      },
    ],
  });
  await writeJson(path.join(btDir, 'revision.json'), {
    itemId: 'binary-trees',
    itemType: 'topic',
    lastReviewed: '2024-06-18T14:30:00Z',
    nextReview: '2024-06-22T00:00:00Z',
    confidence: 3,
    history: [
      { id: 'rev-bt-001', date: '2024-06-12T10:00:00Z', confidence: 2, notes: 'Struggled with iterative inorder' },
      { id: 'rev-bt-002', date: '2024-06-18T14:30:00Z', confidence: 3, notes: 'Better with BFS patterns' },
    ],
  });

  // --- System Design: Load Balancing ---
  const lbDir = path.join(WORKSPACE_PATH, 'notes', 'system-design', 'load-balancing');
  await ensureDir(lbDir);
  await writeJson(path.join(lbDir, 'topic.json'), {
    id: 'load-balancing',
    title: 'Load Balancing',
    category: 'system-design',
    difficulty: 'hard',
    status: 'not-started',
    confidence: 1,
    tags: ['distributed-systems', 'scalability', 'nginx', 'round-robin'],
    createdAt: '2024-06-15T08:00:00Z',
    updatedAt: '2024-06-15T08:00:00Z',
  });
  await writeMd(path.join(lbDir, 'overview.md'), `# Load Balancing

## Overview

Load balancing distributes incoming network traffic across multiple servers to ensure no single server is overwhelmed. It improves availability, reliability, and performance.

## Algorithms

- **Round Robin** — requests distributed sequentially
- **Least Connections** — route to server with fewest active connections
- **Weighted Round Robin** — servers get traffic proportional to weight
- **IP Hash** — route based on client IP (sticky sessions)
- **Consistent Hashing** — minimizes redistribution when servers change
`);
  await writeMd(path.join(lbDir, 'notes.md'), `# Load Balancing - Notes

## Types

1. **Layer 4 (Transport)** — routes based on IP + port, fast but no content inspection
2. **Layer 7 (Application)** — routes based on HTTP headers, URL, cookies — more flexible

## Tools

- Nginx, HAProxy, AWS ALB/NLB, Cloudflare
`);
  await writeMd(path.join(lbDir, 'patterns.md'), '# Load Balancing - Patterns\n\n');
  await writeMd(path.join(lbDir, 'mistakes.md'), '# Load Balancing - Common Mistakes\n\n');

  // --- Database: Indexing ---
  const idxDir = path.join(WORKSPACE_PATH, 'notes', 'database', 'indexing');
  await ensureDir(idxDir);
  await writeJson(path.join(idxDir, 'topic.json'), {
    id: 'indexing',
    title: 'Database Indexing',
    category: 'database',
    difficulty: 'medium',
    status: 'completed',
    confidence: 4,
    tags: ['b-tree', 'hash-index', 'postgres', 'query-optimization'],
    createdAt: '2024-05-20T10:00:00Z',
    updatedAt: '2024-06-05T16:00:00Z',
  });
  await writeMd(path.join(idxDir, 'overview.md'), `# Database Indexing

## Overview

An index is a data structure that improves the speed of data retrieval at the cost of additional storage and write overhead.

## Types

- **B-Tree Index** — default in most RDBMS, good for range queries
- **Hash Index** — O(1) equality lookups, no range support
- **GIN/GiST** — for full-text search, arrays, JSON in Postgres
- **Covering Index** — includes all columns needed by query
`);
  await writeMd(path.join(idxDir, 'notes.md'), `# Database Indexing - Notes

## When to Index

- Columns in WHERE clauses
- JOIN columns
- ORDER BY / GROUP BY columns
- High-cardinality columns

## When NOT to Index

- Small tables (sequential scan is faster)
- Columns with low cardinality (e.g., boolean)
- Tables with heavy write workloads
`);
  await writeMd(path.join(idxDir, 'patterns.md'), '# Database Indexing - Patterns\n\n');
  await writeMd(path.join(idxDir, 'mistakes.md'), '# Database Indexing - Common Mistakes\n\n- Adding too many indexes slows writes\n- Forgetting composite index column order matters\n');
}

async function seedProblems() {
  // --- Two Sum (LeetCode) ---
  const tsDir = path.join(WORKSPACE_PATH, 'problems', 'two-sum');
  await ensureDir(tsDir);
  await writeJson(path.join(tsDir, 'problem.json'), {
    id: 'two-sum',
    title: 'Two Sum',
    difficulty: 'easy',
    companies: ['Google', 'Amazon', 'Meta', 'Apple'],
    patterns: ['hash-map', 'two-pointers'],
    status: 'solved',
    favorite: true,
    url: 'https://leetcode.com/problems/two-sum/',
    createdAt: '2024-05-10T08:00:00Z',
    updatedAt: '2024-06-01T12:00:00Z',
  });
  await writeMd(path.join(tsDir, 'notes.md'), `# Two Sum - Notes

## Approach

Use a hash map to store complement values. For each number, check if its complement (target - num) exists in the map.

## Complexity

- Time: O(n) — single pass
- Space: O(n) — hash map storage

## Edge Cases

- Duplicate values in array
- Negative numbers
- Single valid pair guaranteed (per problem constraints)
`);
  await writeMd(path.join(tsDir, 'solution.md'), `# Two Sum - Solution

\`\`\`python
def two_sum(nums: list[int], target: int) -> list[int]:
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []
\`\`\`

\`\`\`typescript
function twoSum(nums: number[], target: number): number[] {
  const map = new Map<number, number>();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement)!, i];
    }
    map.set(nums[i], i);
  }
  return [];
}
\`\`\`
`);
  await writeJson(path.join(tsDir, 'revision.json'), {
    itemId: 'two-sum',
    itemType: 'problem',
    lastReviewed: '2024-06-01T12:00:00Z',
    nextReview: '2024-06-10T00:00:00Z',
    confidence: 5,
    history: [
      { id: 'rev-ts-001', date: '2024-05-15T09:00:00Z', confidence: 3 },
      { id: 'rev-ts-002', date: '2024-05-25T10:00:00Z', confidence: 4 },
      { id: 'rev-ts-003', date: '2024-06-01T12:00:00Z', confidence: 5, notes: 'Solved instantly' },
    ],
  });

  // --- LRU Cache (LeetCode) ---
  const lruDir = path.join(WORKSPACE_PATH, 'problems', 'lru-cache');
  await ensureDir(lruDir);
  await writeJson(path.join(lruDir, 'problem.json'), {
    id: 'lru-cache',
    title: 'LRU Cache',
    difficulty: 'medium',
    companies: ['Amazon', 'Microsoft', 'Bloomberg'],
    patterns: ['hash-map', 'linked-list', 'design'],
    status: 'attempted',
    favorite: true,
    url: 'https://leetcode.com/problems/lru-cache/',
    createdAt: '2024-06-05T10:00:00Z',
    updatedAt: '2024-06-14T15:00:00Z',
  });
  await writeMd(path.join(lruDir, 'notes.md'), `# LRU Cache - Notes

## Approach

Combine a hash map (for O(1) key lookup) with a doubly-linked list (for O(1) removal and insertion at ends).

## Key Operations

- **get(key)**: if exists, move to front, return value
- **put(key, value)**: if exists, update and move to front. If new and at capacity, evict tail.
`);
  await writeMd(path.join(lruDir, 'solution.md'), `# LRU Cache - Solution

\`\`\`python
from collections import OrderedDict

class LRUCache:
    def __init__(self, capacity: int):
        self.cache = OrderedDict()
        self.capacity = capacity

    def get(self, key: int) -> int:
        if key not in self.cache:
            return -1
        self.cache.move_to_end(key)
        return self.cache[key]

    def put(self, key: int, value: int) -> None:
        if key in self.cache:
            self.cache.move_to_end(key)
        self.cache[key] = value
        if len(self.cache) > self.capacity:
            self.cache.popitem(last=False)
\`\`\`
`);
  await writeJson(path.join(lruDir, 'revision.json'), {
    itemId: 'lru-cache',
    itemType: 'problem',
    lastReviewed: '2024-06-14T15:00:00Z',
    nextReview: '2024-06-20T00:00:00Z',
    confidence: 3,
    history: [
      { id: 'rev-lru-001', date: '2024-06-10T11:00:00Z', confidence: 2, notes: 'Forgot doubly-linked list details' },
      { id: 'rev-lru-002', date: '2024-06-14T15:00:00Z', confidence: 3 },
    ],
  });

  // --- Maximum Subarray (LeetCode) ---
  const msDir = path.join(WORKSPACE_PATH, 'problems', 'maximum-subarray');
  await ensureDir(msDir);
  await writeJson(path.join(msDir, 'problem.json'), {
    id: 'maximum-subarray',
    title: 'Maximum Subarray',
    difficulty: 'medium',
    companies: ['Amazon', 'LinkedIn', 'Apple'],
    patterns: ['dynamic-programming', 'kadane'],
    status: 'solved',
    favorite: false,
    url: 'https://leetcode.com/problems/maximum-subarray/',
    createdAt: '2024-05-20T09:00:00Z',
    updatedAt: '2024-06-02T11:00:00Z',
  });
  await writeMd(path.join(msDir, 'notes.md'), `# Maximum Subarray - Notes

## Kadane's Algorithm

Maintain a running sum. If it drops below 0, reset. Track the maximum seen.

## Complexity

- Time: O(n)
- Space: O(1)
`);
  await writeMd(path.join(msDir, 'solution.md'), `# Maximum Subarray - Solution

\`\`\`python
def max_subarray(nums: list[int]) -> int:
    max_sum = nums[0]
    current = nums[0]
    for num in nums[1:]:
        current = max(num, current + num)
        max_sum = max(max_sum, current)
    return max_sum
\`\`\`
`);
}

async function seedDirectories() {
  // Create all workspace directories
  const dirs = [
    'notes/dsa', 'notes/system-design', 'notes/database',
    'notes/networking', 'notes/os', 'notes/oop',
    'problems',
    'templates', 'revision', 'flashcards', 'assets',
  ];

  for (const dir of dirs) {
    await ensureDir(path.join(WORKSPACE_PATH, dir));
  }
}

async function main() {
  console.log(`Seeding workspace at: ${WORKSPACE_PATH}\n`);

  await seedDirectories();
  console.log('✓ Created directory structure');

  await seedTopics();
  console.log('✓ Created sample topics (Binary Trees, Load Balancing, Database Indexing)');

  await seedProblems();
  console.log('✓ Created sample problems (Two Sum, LRU Cache, Maximum Subarray)');

  console.log('\nDone! Start the app with: npm run dev');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
