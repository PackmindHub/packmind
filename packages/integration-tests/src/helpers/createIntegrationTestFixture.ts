import { DataSource, EntitySchema } from 'typeorm';
import {
  createContainerTestDatasourceFixture,
  makeTestDatasource,
} from '@packmind/test-utils';
import { TestApp } from './TestApp';
import { DataFactory } from './DataFactory';

type DatasourceBackend = 'pg-mem' | 'container';

interface IntegrationTestFixtureOptions {
  backend?: DatasourceBackend;
}

/**
 * Integration test fixture for optimized test execution.
 *
 * Initializes the database schema once per test file instead of per test case.
 * Uses table truncation for cleanup between tests, which is significantly faster
 * than recreating the schema.
 *
 * Backends:
 * - 'pg-mem' (default): in-memory PostgreSQL emulation, fast but lossy.
 * - 'container': real PostgreSQL via Testcontainers; opt in for tests that
 *   exercise JSON ops, full-text search, advisory locks, or anything pg-mem
 *   does not implement faithfully.
 */
export function createIntegrationTestFixture(
  entities: EntitySchema[],
  options: IntegrationTestFixtureOptions = {},
) {
  const backend = options.backend ?? 'pg-mem';

  if (backend === 'container') {
    return wrapWithTestAppHelpers(
      createContainerTestDatasourceFixture(entities),
    );
  }

  return wrapWithTestAppHelpers(createPgMemFixture(entities));
}

/**
 * Convenience helper for tests that need real PostgreSQL fidelity.
 * Equivalent to createIntegrationTestFixture(entities, { backend: 'container' }).
 */
export function createContainerIntegrationTestFixture(
  entities: EntitySchema[],
) {
  return createIntegrationTestFixture(entities, { backend: 'container' });
}

interface BaseDatasourceFixture {
  readonly datasource: DataSource;
  initialize(): Promise<DataSource>;
  cleanup(): Promise<void>;
  destroy(): Promise<void>;
}

function createPgMemFixture(entities: EntitySchema[]): BaseDatasourceFixture {
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

      tableNames = datasource.entityMetadatas.map(
        (metadata) => metadata.tableName,
      );

      return datasource;
    },

    async cleanup(): Promise<void> {
      if (!datasource?.isInitialized) return;

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

function wrapWithTestAppHelpers(base: BaseDatasourceFixture) {
  return {
    get datasource(): DataSource {
      return base.datasource;
    },

    initialize: () => base.initialize(),
    cleanup: () => base.cleanup(),
    destroy: () => base.destroy(),

    /**
     * Creates a new TestApp instance bound to the fixture's datasource.
     * Call this in beforeEach to get a fresh TestApp for each test.
     */
    async createTestApp(): Promise<TestApp> {
      const testApp = new TestApp(base.datasource);
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
