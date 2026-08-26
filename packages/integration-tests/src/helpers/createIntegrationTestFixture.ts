import { DataSource, EntitySchema } from 'typeorm';
import { createTestDatasourceFixture } from '@packmind/test-utils';
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
 *
 * Seeding the same rows for every test in a file is the dominant cost of this
 * suite — a sign-up plus a handful of entities runs to a few hundred
 * milliseconds, paid once per test. When every test starts from the same seed,
 * build it once in `beforeAll` and call `snapshot()`; `cleanup()` then rewinds
 * to it in O(1) rather than truncating and re-seeding:
 *
 * ```typescript
 * beforeAll(async () => {
 *   await fixture.initialize();
 *   testApp = await fixture.createTestApp();
 *   // ... seed the entities the tests read ...
 *   fixture.snapshot();
 * });
 *
 * afterEach(() => fixture.cleanup()); // back to the seeded state
 * ```
 *
 * Note that `testApp` is then shared by every test in the file, so specs doing
 * this must let Jest undo their spies — `restoreMocks` is enabled for this
 * project, so `jest.spyOn` is reverted after each test automatically.
 */
export function createIntegrationTestFixture(entities: EntitySchema[]) {
  const fixture = createTestDatasourceFixture(entities);

  return {
    get datasource(): DataSource {
      return fixture.datasource;
    },

    initialize: () => fixture.initialize(),

    snapshot: () => fixture.snapshot(),

    cleanup: () => fixture.cleanup(),

    destroy: () => fixture.destroy(),

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
