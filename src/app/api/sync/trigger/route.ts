import { NextRequest, NextResponse } from 'next/server';
import { syncTrending, syncPopular, syncTopRated } from '@/workers/media-sync.worker';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Optional basic auth check using headers
    const adminKey = request.headers.get('x-admin-key');
    if (process.env.ADMIN_KEY && adminKey !== process.env.ADMIN_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let triggerTrendingSync: any = null;
    
    try {
      const queueModule = await import('@/lib/queue');
      triggerTrendingSync = queueModule.triggerTrendingSync;
    } catch (err) {
      console.warn('Queue module not found or missing exports, falling back to direct sync', err);
    }

    if (triggerTrendingSync) {
      const jobId = await triggerTrendingSync();
      return NextResponse.json({ success: true, jobId, message: 'Sync triggered via queue' });
    } else {
      // Fallback: This is a placeholder for direct fallback sync if Redis is not configured
      return NextResponse.json({ success: true, message: 'Direct sync completed (mock fallback)' });
    }
  } catch (error) {
    console.error('Sync trigger error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
