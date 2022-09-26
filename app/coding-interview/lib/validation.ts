import type { InterviewModuleProps, InterviewSource, InterviewContext } from './types';
import { MIN_DURATION, MAX_DURATION } from './constants';

/* ─── Validation Result ──────────────────────────────────── */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/* ─── Source Validation ──────────────────────────────────── */

const VALID_SOURCES: InterviewSource[] = [
  'problem',
  'topic',
  'self-test',
  'revision',
  'practice',
  'interview',
];

function isValidSource(source: unknown): source is InterviewSource {
  return typeof source === 'string' && VALID_SOURCES.includes(source as InterviewSource);
}

/* ─── Context Validation ─────────────────────────────────── */

export function validateContext(source: InterviewSource, context?: InterviewContext): ValidationResult {
  // Context is optional — if not provided, a random problem is generated
  if (context === undefined) {
    return { valid: true };
  }

  // Context must be an object
  if (typeof context !== 'object' || context === null) {
    return { valid: false, error: 'Context must be an object' };
  }

  switch (source) {
    case 'problem': {
      const ctx = context as { source?: string; id?: unknown; title?: unknown; category?: unknown; tags?: unknown };
      if (ctx.source !== 'problem') {
        return { valid: false, error: 'Context source must match prop source "problem"' };
      }
      if (typeof ctx.id !== 'string' || ctx.id.length === 0) {
        return { valid: false, error: 'Problem context requires a non-empty "id" string' };
      }
      if (typeof ctx.title !== 'string' || ctx.title.length === 0) {
        return { valid: false, error: 'Problem context requires a non-empty "title" string' };
      }
      if (typeof ctx.category !== 'string' || ctx.category.length === 0) {
        return { valid: false, error: 'Problem context requires a non-empty "category" string' };
      }
      if (!Array.isArray(ctx.tags)) {
        return { valid: false, error: 'Problem context requires a "tags" array' };
      }
      return { valid: true };
    }

    case 'topic': {
      const ctx = context as { source?: string; id?: unknown; title?: unknown; concepts?: unknown };
      if (ctx.source !== 'topic') {
        return { valid: false, error: 'Context source must match prop source "topic"' };
      }
      if (typeof ctx.id !== 'string' || ctx.id.length === 0) {
        return { valid: false, error: 'Topic context requires a non-empty "id" string' };
      }
      if (typeof ctx.title !== 'string' || ctx.title.length === 0) {
        return { valid: false, error: 'Topic context requires a non-empty "title" string' };
      }
      if (!Array.isArray(ctx.concepts)) {
        return { valid: false, error: 'Topic context requires a "concepts" array' };
      }
      return { valid: true };
    }

    case 'revision': {
      const ctx = context as { source?: string; sessionId?: unknown; topicIds?: unknown };
      if (ctx.source !== 'revision') {
        return { valid: false, error: 'Context source must match prop source "revision"' };
      }
      if (typeof ctx.sessionId !== 'string' || ctx.sessionId.length === 0) {
        return { valid: false, error: 'Revision context requires a non-empty "sessionId" string' };
      }
      if (!Array.isArray(ctx.topicIds)) {
        return { valid: false, error: 'Revision context requires a "topicIds" array' };
      }
      return { valid: true };
    }

    case 'self-test':
    case 'practice':
    case 'interview': {
      const ctx = context as { source?: string };
      if (ctx.source !== source) {
        return { valid: false, error: `Context source must match prop source "${source}"` };
      }
      return { valid: true };
    }

    default:
      return { valid: false, error: `Unknown source type: ${source}` };
  }
}

/* ─── Duration Validation ────────────────────────────────── */

export function validateDuration(duration?: number): ValidationResult {
  if (duration === undefined) {
    return { valid: true }; // Defaults to DEFAULT_DURATION
  }

  if (typeof duration !== 'number' || !Number.isFinite(duration)) {
    return { valid: false, error: 'Duration must be a finite number' };
  }

  if (!Number.isInteger(duration)) {
    return { valid: false, error: 'Duration must be an integer' };
  }

  if (duration < MIN_DURATION || duration > MAX_DURATION) {
    return { valid: false, error: `Duration must be between ${MIN_DURATION} and ${MAX_DURATION} minutes` };
  }

  return { valid: true };
}

/* ─── Full Props Validation ──────────────────────────────── */

export function validateInterviewProps(props: InterviewModuleProps): ValidationResult {
  // Validate source
  if (!isValidSource(props.source)) {
    return { valid: false, error: `Invalid source: "${props.source}". Must be one of: ${VALID_SOURCES.join(', ')}` };
  }

  // Validate context (if provided)
  const contextResult = validateContext(props.source, props.context);
  if (!contextResult.valid) {
    return contextResult;
  }

  // Validate language (if provided)
  if (props.language !== undefined && props.language !== 'javascript' && props.language !== 'typescript') {
    return { valid: false, error: 'Language must be "javascript" or "typescript"' };
  }

  // Validate difficulty (if provided)
  if (props.difficulty !== undefined && !['easy', 'medium', 'hard'].includes(props.difficulty)) {
    return { valid: false, error: 'Difficulty must be "easy", "medium", or "hard"' };
  }

  // Validate duration (if provided)
  const durationResult = validateDuration(props.duration);
  if (!durationResult.valid) {
    return durationResult;
  }

  return { valid: true };
}
