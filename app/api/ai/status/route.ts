/**
 * GET /api/ai/status
 *
 * Returns the current AI service availability status.
 * Used by the client-side AIProvider to poll connectivity.
 *
 * Requirements: 6.1, 6.4
 */

import { NextResponse } from 'next/server';
import { createAIClient } from '@/src/ai/client';

const client = createAIClient({
  baseUrl: process.env.OPENAI_BASE_URL || 'http://localhost:11434/v1',
  apiKey: process.env.OPENAI_API_KEY || '',
});

export async function GET() {
  const available = await client.isAvailable();
  return NextResponse.json({ available });
}
