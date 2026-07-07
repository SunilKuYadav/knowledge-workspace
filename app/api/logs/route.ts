import { loggerBus } from "@/src/lib/logger";

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const unsubscribe = loggerBus.subscribe((log) => {
        controller.enqueue(
          encoder.encode(
            `data:${JSON.stringify(log)}\n\n`
          )
        );
      });

      return () => unsubscribe();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}