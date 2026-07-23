/**
 * BullMQ Queue Configuration
 * Manages the media-sync job queue and cron job schedulers
 */

import { Queue } from 'bullmq';
import Redis from 'ioredis';

// ─── Redis Connection ────────────────────────────────────────────────────────

export function createRedisConnection(): Redis {
  return new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false,
    retryStrategy(times: number) {
      const delay = Math.min(times * 200, 5000);
      return delay;
    },
  });
}

// ─── Queue Instance ──────────────────────────────────────────────────────────

let mediaSyncQueue: Queue | null = null;

export function getMediaSyncQueue(): Queue {
  if (!mediaSyncQueue) {
    mediaSyncQueue = new Queue('media-sync', {
      connection: createRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: {
          age: 86400,    // Keep completed jobs for 24 hours
          count: 1000,   // Keep last 1000 completed
        },
        removeOnFail: {
          age: 604800,   // Keep failed jobs for 7 days
        },
      },
    });
  }
  return mediaSyncQueue;
}

// ─── Cron Job Schedulers ─────────────────────────────────────────────────────

export async function setupCronJobs(): Promise<void> {
  const queue = getMediaSyncQueue();

  console.log('[Queue] Setting up cron job schedulers...');

  // Sync trending content every 6 hours
  await queue.upsertJobScheduler(
    'sync-trending-6h',
    { pattern: '0 */6 * * *' }, // Every 6 hours
    {
      name: 'sync-trending',
      data: { type: 'all', pages: 3 },
    }
  );

  // Sync popular movies daily at 3 AM
  await queue.upsertJobScheduler(
    'sync-popular-daily',
    { pattern: '0 3 * * *' },
    {
      name: 'sync-popular',
      data: { type: 'all', pages: 5 },
    }
  );

  // Sync top rated weekly on Sundays at 4 AM
  await queue.upsertJobScheduler(
    'sync-toprated-weekly',
    { pattern: '0 4 * * 0' },
    {
      name: 'sync-toprated',
      data: { type: 'all', pages: 3 },
    }
  );

  console.log('[Queue] Cron jobs configured successfully');
}

// ─── Manual Job Triggers ─────────────────────────────────────────────────────

export async function triggerTrendingSync(): Promise<string> {
  const queue = getMediaSyncQueue();
  const job = await queue.add('sync-trending', {
    type: 'all',
    pages: 3,
    manual: true,
  });
  return job.id || 'unknown';
}

export async function triggerFullSync(): Promise<string> {
  const queue = getMediaSyncQueue();
  const job = await queue.add('sync-full', {
    type: 'all',
    pages: 10,
    manual: true,
  });
  return job.id || 'unknown';
}
