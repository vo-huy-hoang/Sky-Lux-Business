import dataSource from '../data-source';
import { runInitialSeed } from './initial.seed';

async function bootstrap() {
  try {
    console.log('🔄 Initializing DataSource for seeding...');
    await dataSource.initialize();
    await runInitialSeed(dataSource);
    await dataSource.destroy();
    console.log('🏁 Seed process finished.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
}

bootstrap();
