import { NextRequest } from 'next/server';
import { vendorEvents, type VendorEventPayload } from '@/lib/pipeline/events';
import { redis } from '@/lib/redis';
import type { RunState } from '@/lib/pipeline/types';

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let isClosed = false;
      let lastPolledRunId: string | null = null;
      let lastPolledUpdatedAt: string | null = null;

      // Seed the initial latest run ID from Redis so we don't treat existing past runs as new
      try {
        const top = await redis.lrange<string>('recent_runs', 0, 0);
        if (top && top.length > 0) {
          lastPolledRunId = top[0];
          const raw = await redis.get<string | RunState>(`run:${lastPolledRunId}`);
          if (raw) {
            const parsed: RunState = typeof raw === 'string' ? JSON.parse(raw) : raw;
            lastPolledUpdatedAt = parsed.updated_at || null;
          }
        }
      } catch (err) {
        console.warn('[Feed SSE] Could not initialize recent runs from Redis:', err);
      }

      const sendPayload = (payload: VendorEventPayload) => {
        if (isClosed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch {
          isClosed = true;
        }
      };

      // 1. In-Memory Direct Event Listener (Instant sub-10ms delivery)
      const onVendorEvent = (payload: VendorEventPayload) => {
        if (isClosed) return;
        lastPolledRunId = payload.state.run_id;
        lastPolledUpdatedAt = payload.state.updated_at;
        sendPayload(payload);
      };

      vendorEvents.on('all', onVendorEvent);

      // 2. Server-side Redis Poller fallback (Every 1000ms)
      // Ensures serverless multi-instance parity across Vercel lambdas
      const redisInterval = setInterval(async () => {
        if (isClosed) {
          clearInterval(redisInterval);
          return;
        }

        try {
          const recent = await redis.lrange<string>('recent_runs', 0, 0);
          if (!recent || recent.length === 0) return;
          const currentLatestId = recent[0];

          if (currentLatestId !== lastPolledRunId) {
            // New run detected externally in Redis
            const raw = await redis.get<string | RunState>(`run:${currentLatestId}`);
            if (!raw) return;
            const state: RunState = typeof raw === 'string' ? JSON.parse(raw) : raw;

            lastPolledRunId = currentLatestId;
            lastPolledUpdatedAt = state.updated_at;

            sendPayload({
              type: 'new_submission',
              state,
              isExternal: true,
            });
          } else if (lastPolledRunId) {
            // Check for progress on the latest run if it is still processing
            const raw = await redis.get<string | RunState>(`run:${lastPolledRunId}`);
            if (!raw) return;
            const state: RunState = typeof raw === 'string' ? JSON.parse(raw) : raw;

            if (state.updated_at !== lastPolledUpdatedAt) {
              lastPolledUpdatedAt = state.updated_at;
              const eventType = state.status === 'Processing' ? 'step_progress' : 'run_complete';
              sendPayload({
                type: eventType,
                state,
                isExternal: true,
              });
            }
          }
        } catch (err) {
          console.warn('[Feed SSE] Redis check error:', err);
        }
      }, 1000);

      // 3. Keepalive heartbeat ping every 15s to keep connections alive
      const keepAliveInterval = setInterval(() => {
        if (isClosed) {
          clearInterval(keepAliveInterval);
          return;
        }
        try {
          controller.enqueue(encoder.encode(': keepalive\n\n'));
        } catch {
          isClosed = true;
          clearInterval(keepAliveInterval);
        }
      }, 15000);

      // Cleanup on client abort/disconnect
      request.signal.addEventListener('abort', () => {
        isClosed = true;
        clearInterval(redisInterval);
        clearInterval(keepAliveInterval);
        vendorEvents.off('all', onVendorEvent);
        try {
          controller.close();
        } catch {
          // Stream already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

