import type { ActionConfig, PromptHelper } from './types';

export const TOPIC_ACTIONS: ActionConfig[] = [
  { id: 'summary', label: 'Generate Summary', action: 'summary', streaming: true, filename: 'ai-summary.md' },
  { id: 'quiz', label: 'Generate Quiz', action: 'quiz', streaming: false, filename: 'ai-quiz.json' },
  { id: 'flashcards', label: 'Generate Flashcards', action: 'flashcards', streaming: false, filename: 'ai-flashcards.json' },
];

export const PROBLEM_ACTIONS: ActionConfig[] = [
  { id: 'interview', label: 'Interview Prep', action: 'interview', streaming: true, filename: 'ai-interview-prep.md' },
  { id: 'similar', label: 'Find Similar', action: 'similar', streaming: false, filename: 'ai-similar.json' },
  { id: 'explain', label: 'Explain Solution', action: 'explain', streaming: true, filename: 'ai-explanation.md' },
];

export const TOPIC_PROMPT_HELPERS: PromptHelper[] = [
  { label: 'Explain concept', prompt: 'Explain this concept in simple terms with examples' },
  { label: 'Key points', prompt: 'List the key points and takeaways for this topic' },
  { label: 'Common mistakes', prompt: 'What are common mistakes or misconceptions for this topic?' },
  { label: 'Interview questions', prompt: 'Generate interview questions related to this topic' },
];

export const PROBLEM_PROMPT_HELPERS: PromptHelper[] = [
  { label: 'Explain approach', prompt: 'Explain the approach to solve this problem step by step' },
  { label: 'Time complexity', prompt: 'Analyze the time and space complexity of the solution' },
  { label: 'Edge cases', prompt: 'What are the edge cases to consider for this problem?' },
  { label: 'Alternative solutions', prompt: 'What are alternative approaches to solve this problem?' },
];
