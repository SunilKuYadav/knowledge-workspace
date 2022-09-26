/**
 * API route for AI interaction logs.
 *
 * GET /api/ai/logs         — SSE stream of real-time logs (prompt, response, stream chunks)
 * GET /api/ai/logs?poll=1&afterId=0 — Poll for completed entries since afterId
 *
 * Only active when AI_LOG_ENABLED is not "false".
 */

import { NextRequest } from 'next/server';
import { getLogEntries, addListener, removeListener, type AILogEntry } from '@/src/ai/log-store';

export async function GET(request: NextRequest) {
  if (process.env.AI_LOG_ENABLED === 'false') {
    return new Response(JSON.stringify({ entries: [] }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const isPoll = request.nextUrl.searchParams.get('poll');

  // Simple poll mode
  if (isPoll) {
    const afterId = parseInt(request.nextUrl.searchParams.get('afterId') || '0', 10);
    const entries = getLogEntries(afterId);
    return new Response(JSON.stringify({ entries }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // SSE stream mode — real-time log streaming
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`));

      const listener = (entry: AILogEntry) => {
        try {
          const event = entry.streaming
            ? { type: 'chunk', model: entry.model, prompt: entry.prompt, chunk: entry.response }
            : { type: 'complete', id: entry.id, model: entry.model, prompt: entry.prompt, response: entry.response, timestamp: entry.timestamp };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          // Client disconnected
        }
      };

      addListener(listener);

      // Cleanup when client disconnects
      request.signal.addEventListener('abort', () => {
        removeListener(listener);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
