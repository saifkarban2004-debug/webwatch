import { syncTrending, syncPopular, syncTopRated } from '../workers/media-sync.worker';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  console.log('Starting manual sync (Bypassing Redis)...');
  try {
    console.log('Syncing trending media...');
    await syncTrending(1); // 1 page for quick test
    console.log('Syncing popular media...');
    await syncPopular(1);
    console.log('Syncing top rated media...');
    await syncTopRated(1);
    console.log('✅ Manual sync completed successfully!');
  } catch (error) {
    console.error('❌ Sync failed:', error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

run();
