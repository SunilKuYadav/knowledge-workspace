/**
 * API route for AI queue status.
 *
 * GET returns the current server-side queue state:
 * - Active request (with token usage)
 * - Pending requests
 * - Recent history (with token usage)
 * - Currently loaded model
 */

import { NextResponse } from "next/server";
import { aiServerQueue } from "@/src/ai/queue";

export async function GET() {
  const snapshot = aiServerQueue.getSnapshot();
  return NextResponse.json(snapshot);
}
