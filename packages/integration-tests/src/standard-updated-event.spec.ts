import { accountsSchemas } from '@packmind/accounts';
import { gitSchemas } from '@packmind/git';
import { PackmindEventEmitterService } from '@packmind/node-utils';
import { spacesSchemas } from '@packmind/spaces';
import { standardsSchemas } from '@packmind/standards';
import { Standard, StandardUpdatedPayload } from '@packmind/types';
import { createIntegrationTestFixture } from './helpers/createIntegrationTestFixture';
import { DataFactory } from './helpers/DataFactory';
import {
  StubStandardsAdapter,
  StubStandardsListener,
} from './helpers/StubStandardsListener';
import { TestApp } from './helpers/TestApp';

describe('StandardUpdatedEvent integration', () => {
  const fixture = createIntegrationTestFixture([
    ...accountsSchemas,
    ...standardsSchemas,
    ...gitSchemas,
    ...spacesSchemas,
  ]);

  let testApp: TestApp;
  let dataFactory: DataFactory;
  let eventEmitterService: PackmindEventEmitterService;

  let standard: Standard;

  let stubAdapter: jest.Mocked<StubStandardsAdapter>;
  let listener: StubStandardsListener;

  beforeAll(() => fixture.initialize());

  beforeEach(async () => {
    testApp = new TestApp(fixture.datasource);
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
    jest.clearAllMocks();
    await fixture.cleanup();
  });

  afterAll(() => fixture.destroy());

  describe('when a standard is updated', () => {
    let payload: StandardUpdatedPayload;

    beforeEach(async () => {
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

      payload = stubAdapter.onStandardUpdated.mock.calls[0][0];
    });

    it('emits StandardUpdatedEvent exactly once', () => {
      expect(stubAdapter.onStandardUpdated).toHaveBeenCalledTimes(1);
    });

    it('includes the correct standardId in the payload', () => {
      expect(payload.standardId).toBe(standard.id);
    });

    it('includes the correct spaceId in the payload', () => {
      expect(payload.spaceId).toBe(dataFactory.space.id);
    });

    it('includes the correct organizationId in the payload', () => {
      expect(payload.organizationId).toBe(dataFactory.organization.id);
    });

    it('includes the correct userId in the payload', () => {
      expect(payload.userId).toBe(dataFactory.user.id);
    });

    it('increments the version number to 2', () => {
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
