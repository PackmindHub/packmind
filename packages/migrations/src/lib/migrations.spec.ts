import { DataSource, QueryRunner } from 'typeorm';
import { newDb } from 'pg-mem';
import { PackmindLogger } from '@packmind/logger';
import { migrations } from './migrations';
import { AddIsTrackedToGitRepos1813000000000 } from '../migrations/1813000000000-AddIsTrackedToGitRepos';
import { AddTrackedBranchLookupIndexToGitRepos1817000000000 } from '../migrations/1817000000000-AddTrackedBranchLookupIndexToGitRepos';
import { AddTrackingRemovedAtToGitRepos1818000000000 } from '../migrations/1818000000000-AddTrackingRemovedAtToGitRepos';

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

  describe('before the migration runs', () => {
    it('has no is_tracked column', async () => {
      expect(await isTrackedColumnExists()).toBe(false);
    });
  });

  describe('when the migration is applied', () => {
    beforeEach(async () => {
      await migration.up(queryRunner);
    });

    it('adds the is_tracked column', async () => {
      expect(await isTrackedColumnExists()).toBe(true);
    });

    it('defaults is_tracked to false for existing rows', async () => {
      await queryRunner.query(
        `INSERT INTO "git_repos" ("id", "owner", "repo", "branch")
         VALUES ('11111111-1111-1111-1111-111111111111', 'acme', 'app', 'main')`,
      );

      const rows = await queryRunner.query(
        `SELECT "is_tracked" FROM "git_repos"`,
      );
      expect(rows[0].is_tracked).toBe(false);
    });

    describe('and then reverted', () => {
      beforeEach(async () => {
        await migration.down(queryRunner);
      });

      it('drops the is_tracked column', async () => {
        expect(await isTrackedColumnExists()).toBe(false);
      });
    });
  });
});

describe('AddTrackedBranchLookupIndexToGitRepos1817000000000', () => {
  const migration = new AddTrackedBranchLookupIndexToGitRepos1817000000000(
    silentLogger,
  );
  let dataSource: DataSource;
  let queryRunner: QueryRunner;

  beforeEach(async () => {
    dataSource = makeInMemoryDataSource();
    await dataSource.initialize();
    queryRunner = dataSource.createQueryRunner();

    await queryRunner.query(`
      CREATE TABLE "git_repos" (
        "id" uuid PRIMARY KEY,
        "owner" varchar NOT NULL,
        "repo" varchar NOT NULL,
        "branch" varchar NOT NULL,
        "is_tracked" boolean NOT NULL DEFAULT false,
        "deleted_at" timestamp
      )
    `);
  });

  afterEach(async () => {
    await queryRunner.release();
    await dataSource.destroy();
  });

  // pg-mem does not implement the pg_indexes catalog, so these assert that the
  // partial-index DDL is accepted and reversible. That the index actually exists
  // is verified against a real Postgres when the migration is applied.
  describe('when the migration is applied', () => {
    it('creates the partial index without error', async () => {
      await expect(migration.up(queryRunner)).resolves.not.toThrow();
    });

    it('is idempotent', async () => {
      await migration.up(queryRunner);

      await expect(migration.up(queryRunner)).resolves.not.toThrow();
    });

    describe('and then reverted', () => {
      beforeEach(async () => {
        await migration.up(queryRunner);
      });

      it('drops the index without error', async () => {
        await expect(migration.down(queryRunner)).resolves.not.toThrow();
      });

      it('can be re-applied afterwards', async () => {
        await migration.down(queryRunner);

        await expect(migration.up(queryRunner)).resolves.not.toThrow();
      });
    });
  });
});

describe('AddTrackingRemovedAtToGitRepos1818000000000', () => {
  const migration = new AddTrackingRemovedAtToGitRepos1818000000000(
    silentLogger,
  );
  let dataSource: DataSource;
  let queryRunner: QueryRunner;

  const trackingRemovedAtColumnExists = async (): Promise<boolean> => {
    const rows = await queryRunner.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'git_repos' AND column_name = 'tracking_removed_at'`,
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
        "branch" varchar NOT NULL,
        "is_tracked" boolean NOT NULL DEFAULT false,
        "deleted_at" timestamp
      )
    `);
  });

  afterEach(async () => {
    await queryRunner.release();
    await dataSource.destroy();
  });

  describe('before the migration runs', () => {
    it('has no tracking_removed_at column', async () => {
      expect(await trackingRemovedAtColumnExists()).toBe(false);
    });
  });

  describe('when the migration is applied', () => {
    beforeEach(async () => {
      await migration.up(queryRunner);
    });

    it('adds the tracking_removed_at column', async () => {
      expect(await trackingRemovedAtColumnExists()).toBe(true);
    });

    it('leaves tracking_removed_at null for existing rows', async () => {
      await queryRunner.query(
        `INSERT INTO "git_repos" ("id", "owner", "repo", "branch")
         VALUES ('22222222-2222-2222-2222-222222222222', 'acme', 'app', 'main')`,
      );

      const rows = await queryRunner.query(
        `SELECT "tracking_removed_at" FROM "git_repos"`,
      );
      expect(rows[0].tracking_removed_at).toBeNull();
    });

    describe('and then reverted', () => {
      beforeEach(async () => {
        await migration.down(queryRunner);
      });

      it('drops the tracking_removed_at column', async () => {
        expect(await trackingRemovedAtColumnExists()).toBe(false);
      });
    });
  });
});
