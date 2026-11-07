import { redis } from '@/lib/redis';
import type { RunState } from '@/lib/pipeline/types';

export const maxDuration = 60;

export async function GET() {
  try {
    // 1. Fetch from the recent_runs index list
    const indexedRunIds = await redis.lrange<string>('recent_runs', 0, 19);

    // 2. Also scan for run:* keys to ensure any past executions are included
    const runKeys = await redis.keys('run:*');
    const scannedRunIds = runKeys.map((key) => key.replace(/^run:/, ''));

    // 3. Deduplicate run IDs preserving order
    const allRunIds = Array.from(new Set([...indexedRunIds, ...scannedRunIds]));

    if (allRunIds.length === 0) {
      return Response.json({ runs: [] }, { status: 200 });
    }

    // 4. Fetch the full states concurrently
    const statesRaw = await Promise.all(
      allRunIds.map(async (id) => {
        try {
          const raw = await redis.get<string | RunState>(`run:${id}`);
          if (!raw) return null;
          const parsed: RunState = typeof raw === 'string' ? JSON.parse(raw) : raw;
          return parsed;
        } catch {
          return null;
        }
      })
    );

    // 5. Filter out nulls and sort descending by updated_at or created_at
    const validRuns = statesRaw
      .filter((item): item is RunState => item !== null && typeof item === 'object' && 'run_id' in item)
      .sort((a, b) => {
        const timeA = new Date(a.updated_at || a.created_at).getTime();
        const timeB = new Date(b.updated_at || b.created_at).getTime();
        return timeB - timeA;
      })
      .slice(0, 10); // Return the last 10 executions

    return Response.json({ runs: validRuns }, { status: 200 });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[API /api/vendor/history] Failed to fetch run history:', errorMsg);
    return Response.json(
      { error: 'Failed to retrieve run history from Redis', details: errorMsg },
      { status: 500 }
    );
  }
}

