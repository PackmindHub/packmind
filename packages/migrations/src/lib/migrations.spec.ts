import { DataSource, QueryRunner } from 'typeorm';
import { newDb } from 'pg-mem';
import { PackmindLogger } from '@packmind/logger';
import { migrations } from './migrations';
import { AddIsTrackedToGitRepos1813000000000 } from '../migrations/1813000000000-AddIsTrackedToGitRepos';

describe('migrations', () => {
  it('works', () => {
    expect(migrations()).toEqual('migrations');
  });
});

const silentLogger = {
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} as unknown as PackmindLogger;

function makeInMemoryDataSource(): DataSource {
  const db = newDb({ autoCreateForeignKeyIndices: true });

  db.public.registerFunction({
    implementation: () => 'test',
    name: 'current_database',
  });
  db.public.registerFunction({
    implementation: () => '17',
    name: 'version',
  });

  return db.adapters.createTypeormDataSource({
    type: 'postgres',
    entities: [],
  });
}

describe('AddIsTrackedToGitRepos1813000000000', () => {
  const migration = new AddIsTrackedToGitRepos1813000000000(silentLogger);
  let dataSource: DataSource;
  let queryRunner: QueryRunner;

  const isTrackedColumnExists = async (): Promise<boolean> => {
    const rows = await queryRunner.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'git_repos' AND column_name = 'is_tracked'`,
    );
    return rows.length > 0;
  };

  beforeEach(async () => {
    dataSource = makeInMemoryDataSource();
    await dataSource.initialize();
    queryRunner = dataSource.createQueryRunner();

    await queryRunner.query(`
      CREATE TABLE "git_repos" (
        "id" uuid PRIMARY KEY,
        "owner" varchar NOT NULL,
        "repo" varchar NOT NULL,
        "branch" varchar NOT NULL
      )
    `);
  });

  afterEach(async () => {
    await queryRunner.release();
    await dataSource.destroy();
  });

  it('is registered as a reversible migration', () => {
    expect(typeof migration.up).toBe('function');
    expect(typeof migration.down).toBe('function');
  });

  it('adds the is_tracked column on up', async () => {
    expect(await isTrackedColumnExists()).toBe(false);

    await migration.up(queryRunner);

    expect(await isTrackedColumnExists()).toBe(true);
  });

  it('defaults is_tracked to false for existing rows', async () => {
    await migration.up(queryRunner);

    await queryRunner.query(
      `INSERT INTO "git_repos" ("id", "owner", "repo", "branch")
       VALUES ('11111111-1111-1111-1111-111111111111', 'acme', 'app', 'main')`,
    );

    const rows = await queryRunner.query(
      `SELECT "is_tracked" FROM "git_repos"`,
    );
    expect(rows[0].is_tracked).toBe(false);
  });

  it('drops the is_tracked column on down (up/down round-trip)', async () => {
    await migration.up(queryRunner);
    expect(await isTrackedColumnExists()).toBe(true);

    await migration.down(queryRunner);
    expect(await isTrackedColumnExists()).toBe(false);
  });
});
