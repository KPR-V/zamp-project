import { NextRequest } from 'next/server';
import { redis } from '@/lib/redis';
import type { RunState } from '@/lib/pipeline/types';

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const run_id = request.nextUrl.searchParams.get('run_id');

  if (!run_id) {
    return new Response(
      JSON.stringify({ error: 'Missing run_id query parameter' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let lastUpdatedAt = '';
      let isClosed = false;

      const pushState = (data: RunState) => {
        if (isClosed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch (err) {
          console.warn('[SSE] Error enqueueing data to stream:', err);
        }
      };

      // Poll Redis state periodically and stream diffs
      const intervalId = setInterval(async () => {
        if (isClosed) {
          clearInterval(intervalId);
          return;
        }

        try {
          const raw = await redis.get<string | RunState>(`run:${run_id}`);
          if (!raw) return;

          const state: RunState = typeof raw === 'string' ? JSON.parse(raw) : raw;

          if (state.updated_at !== lastUpdatedAt) {
            lastUpdatedAt = state.updated_at;
            pushState(state);

            // Once pipeline finishes (Approved, Pending, or Rejected), conclude the SSE stream
            if (state.status !== 'Processing') {
              clearInterval(intervalId);
              isClosed = true;
              try {
                controller.close();
              } catch {
                // controller might already be closed
              }
            }
          }
        } catch (err) {
          console.error('[SSE] Polling error in stream route:', err);
          clearInterval(intervalId);
          isClosed = true;
          try {
            controller.close();
          } catch {
            // ignore
          }
        }
      }, 600);

      // Handle client-side disconnection or abort
      request.signal.addEventListener('abort', () => {
        clearInterval(intervalId);
        isClosed = true;
        try {
          controller.close();
        } catch {
          // ignore
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
