import { DataSource, QueryRunner } from 'typeorm';
import { newDb } from 'pg-mem';
import { PackmindLogger } from '@packmind/logger';
import { migrations } from './migrations';
import { AddIsTrackedToGitRepos1813000000000 } from '../migrations/1813000000000-AddIsTrackedToGitRepos';
import { AddTrackedBranchLookupIndexToGitRepos1817000000000 } from '../migrations/1817000000000-AddTrackedBranchLookupIndexToGitRepos';
import { AddFacesToMarketplaces1818000000000 } from '../migrations/1818000000000-AddFacesToMarketplaces';

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

describe('AddFacesToMarketplaces1818000000000', () => {
  const migration = new AddFacesToMarketplaces1818000000000(silentLogger);
  let dataSource: DataSource;
  let queryRunner: QueryRunner;

  const facesColumnExists = async (): Promise<boolean> => {
    const rows = await queryRunner.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'marketplaces' AND column_name = 'faces'`,
    );
    return rows.length > 0;
  };

  beforeEach(async () => {
    dataSource = makeInMemoryDataSource();
    await dataSource.initialize();
    queryRunner = dataSource.createQueryRunner();

    await queryRunner.query(`
      CREATE TABLE "marketplaces" (
        "id" uuid PRIMARY KEY,
        "name" varchar NOT NULL,
        "vendor" varchar NOT NULL
      )
    `);
  });

  afterEach(async () => {
    await queryRunner.release();
    await dataSource.destroy();
  });

  describe('before the migration runs', () => {
    it('has no faces column', async () => {
      expect(await facesColumnExists()).toBe(false);
    });
  });

  describe('when the migration is applied', () => {
    beforeEach(async () => {
      await queryRunner.query(
        `INSERT INTO "marketplaces" ("id", "name", "vendor")
         VALUES ('22222222-2222-2222-2222-222222222222', 'Legacy Marketplace', 'anthropic')`,
      );
      await migration.up(queryRunner);
    });

    it('adds the faces column', async () => {
      expect(await facesColumnExists()).toBe(true);
    });

    it('backfills existing rows with the claude face', async () => {
      const rows = await queryRunner.query(
        `SELECT "faces" FROM "marketplaces"`,
      );
      // pg-mem returns jsonb columns as raw strings; the real pg driver parses them.
      const faces =
        typeof rows[0].faces === 'string'
          ? JSON.parse(rows[0].faces)
          : rows[0].faces;
      expect(faces).toEqual(['claude']);
    });

    describe('and then reverted', () => {
      beforeEach(async () => {
        await migration.down(queryRunner);
      });

      it('drops the faces column', async () => {
        expect(await facesColumnExists()).toBe(false);
      });
    });
  });
});
