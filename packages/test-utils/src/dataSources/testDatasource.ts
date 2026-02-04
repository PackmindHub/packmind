import { DataSource, EntitySchema } from 'typeorm';
import { newDb } from 'pg-mem';

export async function makeTestDatasource(
  entities: EntitySchema[],
): Promise<DataSource> {
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

  return db.adapters.createTypeormDataSource({
    type: 'postgres',
    entities,
  });
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
 */
export function createTestDatasourceFixture(entities: EntitySchema[]) {
  let datasource: DataSource | null = null;
  let tableNames: string[] = [];

  return {
    get datasource(): DataSource {
      if (!datasource) {
        throw new Error(
          'Datasource not initialized. Call initialize() in beforeAll.',
        );
      }
      return datasource;
    },

    async initialize(): Promise<DataSource> {
      datasource = await makeTestDatasource(entities);
      await datasource.initialize();
      await datasource.synchronize();

      // Cache table names for fast cleanup
      tableNames = datasource.entityMetadatas.map(
        (metadata) => metadata.tableName,
      );

      return datasource;
    },

    /**
     * Truncates all tables to reset state between tests.
     * Much faster than dropping and recreating the schema.
     */
    async cleanup(): Promise<void> {
      if (!datasource?.isInitialized) return;

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
      datasource = null;
      tableNames = [];
    },
  };
}
