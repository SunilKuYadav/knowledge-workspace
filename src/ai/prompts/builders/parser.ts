/**
 * Form parsing prompt builders (topic & problem).
 */
import { composePrompt } from '../utils/compose';
import { IDENTITY_CONTEXT } from '../system/identity';
import { JSON_CONTEXT } from '../system/json';
import { TOPIC_PARSE_SCHEMA } from '../schemas/topic';
import { PROBLEM_PARSE_SCHEMA } from '../schemas/problem';

export function buildTopicParsePrompt(text: string): string {
  return composePrompt({
    modules: [IDENTITY_CONTEXT, JSON_CONTEXT],
    task: `You are a helpful assistant that extracts structured data from text descriptions.
Given the following text, extract topic information.

${TOPIC_PARSE_SCHEMA}

Text: ${text}`,
  });
}

export function buildProblemParsePrompt(text: string): string {
  return composePrompt({
    modules: [IDENTITY_CONTEXT, JSON_CONTEXT],
    task: `You are a helpful assistant that extracts structured data from text descriptions.
Given the following text, extract coding problem information.

${PROBLEM_PARSE_SCHEMA}

Text: ${text}`,
  });
}
