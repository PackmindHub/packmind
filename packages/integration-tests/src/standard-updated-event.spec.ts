import { accountsSchemas } from '@packmind/accounts';
import { gitSchemas } from '@packmind/git';
import { PackmindEventEmitterService } from '@packmind/node-utils';
import { spacesSchemas } from '@packmind/spaces';
import { standardsSchemas } from '@packmind/standards';
import { makeTestDatasource } from '@packmind/test-utils';
import { Standard, StandardUpdatedPayload } from '@packmind/types';
import { DataSource } from 'typeorm';
import { DataFactory } from './helpers/DataFactory';
import {
  StubStandardsAdapter,
  StubStandardsListener,
} from './helpers/StubStandardsListener';
import { TestApp } from './helpers/TestApp';

describe('StandardUpdatedEvent integration', () => {
  let dataSource: DataSource;
  let testApp: TestApp;
  let dataFactory: DataFactory;
  let eventEmitterService: PackmindEventEmitterService;

  let standard: Standard;

  let stubAdapter: jest.Mocked<StubStandardsAdapter>;
  let listener: StubStandardsListener;

  beforeEach(async () => {
    dataSource = await makeTestDatasource([
      ...accountsSchemas,
      ...standardsSchemas,
      ...gitSchemas,
      ...spacesSchemas,
    ]);
    await dataSource.initialize();
    await dataSource.synchronize();

    testApp = new TestApp(dataSource);
    await testApp.initialize();

    dataFactory = new DataFactory(testApp);

    eventEmitterService = testApp.registry.getService(
      PackmindEventEmitterService,
    );

    // Create stub adapter and listener
    stubAdapter = {
      onStandardUpdated: jest.fn(),
    };
    listener = new StubStandardsListener(stubAdapter);
    listener.initialize(eventEmitterService);

    // Create test data using factory
    await dataFactory.withUserAndOrganization();
    standard = await dataFactory.withStandard({
      name: 'My Test Standard',
      description: 'A test standard for event testing',
    });
  });

  afterEach(async () => {
    eventEmitterService.removeAllListeners();
    await dataSource.destroy();
  });

  describe('when a standard is updated', () => {
    it('emits StandardUpdatedEvent with correct payload', async () => {
      await testApp.standardsHexa.getAdapter().updateStandard({
        standardId: standard.id,
        name: 'Updated Standard Name',
        description: 'Updated description',
        rules: [{ id: undefined as never, content: 'New rule content' }],
        organizationId: dataFactory.organization.id,
        userId: dataFactory.user.id,
        spaceId: dataFactory.space.id,
        scope: 'typescript',
      });

      expect(stubAdapter.onStandardUpdated).toHaveBeenCalledTimes(1);
      const payload: StandardUpdatedPayload =
        stubAdapter.onStandardUpdated.mock.calls[0][0];

      expect(payload.standardId).toBe(standard.id);
      expect(payload.spaceId).toBe(dataFactory.space.id);
      expect(payload.organizationId).toBe(dataFactory.organization.id);
      expect(payload.userId).toBe(dataFactory.user.id);
      expect(payload.newVersion).toBe(2);
    });
  });

  describe('when standard content has not changed', () => {
    it('does not emit StandardUpdatedEvent', async () => {
      await testApp.standardsHexa.getAdapter().updateStandard({
        standardId: standard.id,
        name: standard.name,
        description: standard.description,
        rules: [],
        organizationId: dataFactory.organization.id,
        userId: dataFactory.user.id,
        spaceId: dataFactory.space.id,
        scope: standard.scope,
      });

      expect(stubAdapter.onStandardUpdated).not.toHaveBeenCalled();
    });
  });
});
