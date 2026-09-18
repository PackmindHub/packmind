import { DataSource } from 'typeorm';

/**
 * Production DataSource for Docker migrations.
 */
export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [],
  migrations: ['packages/migrations/src/migrations/*.js'],
  synchronize: false,
  logging: process.env.NODE_ENV !== 'production',
  migrationsRun: false,
  connectTimeoutMS: 60000,
  maxQueryExecutionTime: 60000,
});
