import { DataSource, EntitySchema } from 'typeorm';
import { IBackup, IMemoryDb, newDb } from 'pg-mem';
import { createQueryRecorder, QueryRecorder } from './queryRecorder';

export type TestDatabaseOptions = {
  /** Records every statement issued, exposed as `queries`. */
  recordQueries?: boolean;
};

export type TestDatabase = {
  /**
   * The underlying pg-mem instance. Its `backup()` gives an O(1) restore point,
   * which is what makes seed-once fixtures possible — see
   * `createTestDatasourceFixture`.
   */
  db: IMemoryDb;
  datasource: DataSource;
  queries?: QueryRecorder;
};

export async function makeTestDatabase(
  entities: EntitySchema[],
  opts?: TestDatabaseOptions,
): Promise<TestDatabase> {
  const db = newDb({
    autoCreateForeignKeyIndices: true,
  });

  db.public.registerFunction({
    implementation: () => 'test',
    name: 'current_database',
  });

  db.public.registerFunction({
    implementation() {
      return '17';
    },
    name: 'version',
  });

  const queries = opts?.recordQueries ? createQueryRecorder() : undefined;

  const datasource = db.adapters.createTypeormDataSource({
    type: 'postgres',
    entities,
    ...(queries ? { logging: true, logger: queries.logger } : {}),
  }) as DataSource;

  return { db, datasource, queries };
}

export async function makeTestDatasource(
  entities: EntitySchema[],
  opts?: TestDatabaseOptions,
): Promise<DataSource> {
  const { datasource } = await makeTestDatabase(entities, opts);
  return datasource;
}

/**
 * Test datasource fixture for repository tests.
 *
 * Optimized pattern that initializes the database schema once per test file
 * instead of per test case. Uses table truncation for cleanup between tests,
 * which is significantly faster than recreating the schema.
 *
 * Usage:
 * ```typescript
 * describe('MyRepository', () => {
 *   const fixture = createTestDatasourceFixture([Schema1, Schema2]);
 *
 *   beforeAll(() => fixture.initialize());
 *   afterEach(() => fixture.cleanup());
 *   afterAll(() => fixture.destroy());
 *
 *   it('test case', async () => {
 *     const repo = fixture.datasource.getRepository(Schema1);
 *     // ...
 *   });
 * });
 * ```
 *
 * When every test in a file needs the same seeded rows, seed them once in
 * `beforeAll` and call `snapshot()`. `cleanup()` then rewinds to that seeded
 * state instead of truncating, which is an O(1) pg-mem operation:
 *
 * ```typescript
 * beforeAll(async () => {
 *   await fixture.initialize();
 *   await seedTheRowsEveryTestNeeds(fixture.datasource);
 *   fixture.snapshot();
 * });
 *
 * afterEach(() => fixture.cleanup()); // back to the seeded state
 * ```
 *
 * Pass `{ recordQueries: true }` to read the issued SQL through
 * `fixture.queries`. `initialize()` and `cleanup()` are recorded too, so call
 * `fixture.queries.reset()` immediately before the act.
 */
export function createTestDatasourceFixture(
  entities: EntitySchema[],
  opts?: TestDatabaseOptions,
) {
  let db: IMemoryDb | null = null;
  let datasource: DataSource | null = null;
  let tableNames: string[] = [];
  let backup: IBackup | null = null;
  let queries: QueryRecorder | undefined = undefined;

  return {
    get datasource(): DataSource {
      if (!datasource) {
        throw new Error(
          'Datasource not initialized. Call initialize() in beforeAll.',
        );
      }
      return datasource;
    },

    get queries(): QueryRecorder {
      if (!queries) {
        throw new Error(
          'Query recording is off. Pass { recordQueries: true } to createTestDatasourceFixture.',
        );
      }
      return queries;
    },

    async initialize(): Promise<DataSource> {
      const testDatabase = await makeTestDatabase(entities, opts);
      db = testDatabase.db;
      datasource = testDatabase.datasource;
      queries = testDatabase.queries;
      await datasource.initialize();
      await datasource.synchronize();

      // Cache table names for fast cleanup
      tableNames = datasource.entityMetadatas.map(
        (metadata) => metadata.tableName,
      );

      return datasource;
    },

    /**
     * Records the current rows as the state `cleanup()` rewinds to.
     *
     * Call this after seeding, in `beforeAll`. Taking a restore point is O(1),
     * and so is every subsequent `cleanup()` — which is what lets a whole file
     * share one seed instead of rebuilding it per test.
     *
     * The schema must not change afterwards; snapshot after `initialize()`.
     */
    snapshot(): void {
      if (!db) {
        throw new Error(
          'Datasource not initialized. Call initialize() in beforeAll.',
        );
      }
      backup = db.backup();
    },

    /**
     * Resets state between tests: rewinds to the last `snapshot()` when one was
     * taken, otherwise truncates all tables (itself much faster than dropping
     * and recreating the schema).
     */
    async cleanup(): Promise<void> {
      if (!datasource?.isInitialized) return;

      if (backup) {
        backup.restore();
        return;
      }

      // Truncate all tables in a single transaction
      // Use CASCADE to handle foreign key constraints
      const queryRunner = datasource.createQueryRunner();
      try {
        await queryRunner.startTransaction();
        for (const tableName of tableNames) {
          await queryRunner.query(`TRUNCATE TABLE "${tableName}" CASCADE`);
        }
        await queryRunner.commitTransaction();
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    },

    async destroy(): Promise<void> {
      if (datasource?.isInitialized) {
        await datasource.destroy();
      }
      db = null;
      datasource = null;
      tableNames = [];
      backup = null;
      queries = undefined;
    },
  };
}
