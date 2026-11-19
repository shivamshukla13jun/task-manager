import mongoose from 'mongoose';
import connectDB from 'config/database';
import createDefaultData from './index';

/**
 * Standalone seeder — run via:
 *   npm run seed            (NODE_ENV=development)
 *   npm run seed:staging
 *   npm run seed:prod
 */
const run = async (): Promise<void> => {
  try {
    await connectDB();
    await createDefaultData();
    console.log('✅ Seeding completed');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

run();
