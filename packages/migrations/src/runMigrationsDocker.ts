#!/usr/bin/env node

/**
 * Migration runner script for Docker production environments.
 * This script runs TypeORM migrations using the production datasource configuration.
 */

import datasourceProduction from './datasourceProduction';

async function runMigrations() {
  console.log('🔄 Starting database migrations...');

  try {
    // Initialize the datasource
    await datasourceProduction.initialize();
    console.log('✅ Database connection established');

    // Check for pending migrations
    const pendingMigrations = await datasourceProduction.showMigrations();
    if (pendingMigrations) {
      console.log('📋 Found pending migrations, executing...');

      // Run migrations
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
    // Always close the connection
    if (datasourceProduction.isInitialized) {
      await datasourceProduction.destroy();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations().catch((error) => {
    console.error('❌ Fatal error during migration:', error);
    process.exit(1);
  });
}

export { runMigrations };
