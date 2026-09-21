import { DataSource, EntitySchema } from 'typeorm';
import { createTestDatasourceFixture } from '@packmind/test-utils';
import { TestApp } from './TestApp';
import { DataFactory } from './DataFactory';

/**
 * `createTestDatasourceFixture` — schema built once per file, `snapshot()` and
 * `cleanup()` to rewind between tests — plus the `TestApp` / `DataFactory`
 * wiring the specs in this package need.
 *
 * Seed in `beforeAll` and call `snapshot()` so the whole file shares one seed;
 * `cleanup()` in `afterEach` rewinds to it. The `TestApp` is then shared by
 * every test in the file, and `restoreMocks` is enabled for this project, so a
 * `jest.spyOn` is reverted after each test — stubs belong in `beforeEach`, not
 * in the seed block.
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

    async createTestApp(): Promise<TestApp> {
      const testApp = new TestApp(this.datasource);
      await testApp.initialize();
      return testApp;
    },

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
