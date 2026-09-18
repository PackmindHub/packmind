#!/usr/bin/env node

/**
 * Migration runner for Docker production environments.
 */

import datasourceProduction from './datasourceProduction';

async function runMigrations() {
  console.log('🔄 Starting database migrations...');

  try {
    await datasourceProduction.initialize();
    console.log('✅ Database connection established');

    const pendingMigrations = await datasourceProduction.showMigrations();
    if (pendingMigrations) {
      console.log('📋 Found pending migrations, executing...');

      const migrations = await datasourceProduction.runMigrations();

      if (migrations.length > 0) {
        console.log(`✅ Successfully ran ${migrations.length} migration(s):`);
        migrations.forEach((migration) => {
          console.log(`  - ${migration.name}`);
        });
      } else {
        console.log('ℹ️  No new migrations to run');
      }
    } else {
      console.log('ℹ️  Database is up to date');
    }

    console.log('🎉 Migration process completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    if (datasourceProduction.isInitialized) {
      await datasourceProduction.destroy();
      console.log('🔌 Database connection closed');
    }
  }
}

if (require.main === module) {
  runMigrations().catch((error) => {
    console.error('❌ Fatal error during migration:', error);
    process.exit(1);
  });
}

export { runMigrations };
