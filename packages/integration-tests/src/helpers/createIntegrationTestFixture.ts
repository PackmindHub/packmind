import { DataSource, EntitySchema } from 'typeorm';
import { makeTestDatasource } from '@packmind/test-utils';
import { TestApp } from './TestApp';
import { DataFactory } from './DataFactory';

/**
 * Integration test fixture for optimized test execution.
 *
 * Initializes the database schema once per test file instead of per test case.
 * Uses table truncation for cleanup between tests, which is significantly faster
 * than recreating the schema.
 *
 * Usage:
 * ```typescript
 * describe('MyIntegration', () => {
 *   const fixture = createIntegrationTestFixture([...schemas]);
 *
 *   let testApp: TestApp;
 *   let dataFactory: DataFactory;
 *
 *   beforeAll(() => fixture.initialize());
 *
 *   beforeEach(async () => {
 *     testApp = new TestApp(fixture.datasource);
 *     await testApp.initialize();
 *     dataFactory = new DataFactory(testApp);
 *   });
 *
 *   afterEach(async () => {
 *     jest.clearAllMocks();
 *     await fixture.cleanup();
 *   });
 *
 *   afterAll(() => fixture.destroy());
 * });
 * ```
 */
export function createIntegrationTestFixture(entities: EntitySchema[]) {
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

    /**
     * Creates a new TestApp instance bound to the fixture's datasource.
     * Call this in beforeEach to get a fresh TestApp for each test.
     */
    async createTestApp(): Promise<TestApp> {
      const testApp = new TestApp(this.datasource);
      await testApp.initialize();
      return testApp;
    },

    /**
     * Creates a new DataFactory instance with a fresh TestApp.
     * Convenience method that combines createTestApp and DataFactory creation.
     */
    async createDataFactory(): Promise<{
      testApp: TestApp;
      dataFactory: DataFactory;
    }> {
      const testApp = await this.createTestApp();
      const dataFactory = new DataFactory(testApp);
      return { testApp, dataFactory };
    },
  };
}
