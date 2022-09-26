/**
 * API route for generating markdown text via AI.
 *
 * POST handler accepts { prompt, context? } and streams generated
 * markdown content back to the client.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAIClient } from '@/ai';
import { buildGenerateTextPrompt } from '@/src/ai/prompts';

const DEFAULT_BASE_URL = process.env.OPENAI_BASE_URL || 'http://127.0.0.1:1234/v1';
const API_KEY = process.env.OPENAI_API_KEY || '';
const MODEL = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, context } = body as {
      prompt: string;
      context?: string;
    };

    if (!prompt) {
      return NextResponse.json(
        { error: 'Missing required field: prompt' },
        { status: 400 }
      );
    }

    const client = createAIClient({ baseUrl: DEFAULT_BASE_URL, apiKey: API_KEY, defaultModel: MODEL });

    const available = await client.isAvailable();
    if (!available) {
      return NextResponse.json(
        { error: 'AI service is currently unavailable' },
        { status: 503 }
      );
    }

    const systemPrompt = buildGenerateTextPrompt(prompt, context);

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of client.generate(systemPrompt)) {
            controller.enqueue(new TextEncoder().encode(chunk));
          }
          controller.close();
        } catch {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
