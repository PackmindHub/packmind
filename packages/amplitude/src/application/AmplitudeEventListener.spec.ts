import { PackmindEventEmitterService } from '@packmind/node-utils';
import {
  ArtifactsPulledEvent,
  DeploymentCompletedEvent,
  IEventTrackingPort,
  CommandCreatedEvent,
  CommandUpdatedEvent,
  RuleAddedEvent,
  StandardCreatedEvent,
  StandardUpdatedEvent,
  LinterCalledEvent,
  createUserId,
  createOrganizationId,
  createRecipeId,
  createSpaceId,
  createGitRepoId,
} from '@packmind/types';
import { DataSource } from 'typeorm';
import { AmplitudeEventListener } from './AmplitudeEventListener';

describe('AmplitudeEventListener', () => {
  let listener: AmplitudeEventListener;
  let mockAdapter: jest.Mocked<IEventTrackingPort>;
  let eventEmitterService: PackmindEventEmitterService;
  let mockDataSource: DataSource;

  beforeEach(() => {
    mockDataSource = {
      isInitialized: true,
      options: {},
    } as unknown as DataSource;

    mockAdapter = {
      trackEvent: jest.fn().mockResolvedValue(undefined),
    };

    eventEmitterService = new PackmindEventEmitterService(mockDataSource);
    listener = new AmplitudeEventListener(mockAdapter);
    listener.initialize(eventEmitterService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    eventEmitterService.removeAllListeners();
  });

  describe('StandardCreatedEvent', () => {
    it('tracks standard_created event with correct payload', async () => {
      const event = new StandardCreatedEvent({
        userId: 'user-123',
        organizationId: 'org-456',
        standardId: 'std-789',
        spaceId: 'space-abc',
        source: 'ui',
      });

      eventEmitterService.emit(event);

      await flushPromises();

      expect(mockAdapter.trackEvent).toHaveBeenCalledWith(
        'user-123',
        'org-456',
        'standard_created',
        {
          standardId: 'std-789',
          spaceId: 'space-abc',
          source: 'ui',
        },
      );
    });
  });

  describe('StandardUpdatedEvent', () => {
    it('tracks standard_updated event with correct payload', async () => {
      const event = new StandardUpdatedEvent({
        userId: 'user-123',
        organizationId: 'org-456',
        standardId: 'std-789',
        spaceId: 'space-abc',
        newVersion: 2,
      });

      eventEmitterService.emit(event);

      await flushPromises();

      expect(mockAdapter.trackEvent).toHaveBeenCalledWith(
        'user-123',
        'org-456',
        'standard_updated',
        {
          standardId: 'std-789',
          spaceId: 'space-abc',
          newVersion: 2,
        },
      );
    });
  });

  describe('RuleAddedEvent', () => {
    it('tracks rule_added event with correct payload', async () => {
      const event = new RuleAddedEvent({
        userId: 'user-123',
        organizationId: 'org-456',
        standardId: 'std-789',
        standardVersionId: 'sv-001',
        newVersion: 3,
      });

      eventEmitterService.emit(event);

      await flushPromises();

      expect(mockAdapter.trackEvent).toHaveBeenCalledWith(
        'user-123',
        'org-456',
        'rule_added',
        {
          standardId: 'std-789',
          standardVersionId: 'sv-001',
          newVersion: 3,
        },
      );
    });
  });

  describe('CommandCreatedEvent', () => {
    it('tracks command_created event with correct payload', async () => {
      const event = new CommandCreatedEvent({
        userId: createUserId('user-123'),
        organizationId: createOrganizationId('org-456'),
        id: createRecipeId('command-789'),
        spaceId: createSpaceId('space-abc'),
      });

      eventEmitterService.emit(event);

      await flushPromises();

      expect(mockAdapter.trackEvent).toHaveBeenCalledWith(
        'user-123',
        'org-456',
        'command_created',
        {
          id: 'command-789',
          spaceId: 'space-abc',
        },
      );
    });
  });

  describe('CommandUpdatedEvent', () => {
    it('tracks command_updated event with correct payload', async () => {
      const event = new CommandUpdatedEvent({
        userId: createUserId('user-123'),
        organizationId: createOrganizationId('org-456'),
        id: createRecipeId('command-789'),
        spaceId: createSpaceId('space-abc'),
        newVersion: 4,
      });

      eventEmitterService.emit(event);

      await flushPromises();

      expect(mockAdapter.trackEvent).toHaveBeenCalledWith(
        'user-123',
        'org-456',
        'command_updated',
        {
          id: 'command-789',
          spaceId: 'space-abc',
          newVersion: 4,
        },
      );
    });
  });

  describe('DeploymentCompletedEvent', () => {
    it('tracks deployment_done event with correct payload', async () => {
      const event = new DeploymentCompletedEvent({
        userId: 'user-123',
        organizationId: 'org-456',
        targetIds: ['target-1', 'target-2', 'target-3'],
        recipeCount: 5,
        standardCount: 3,
      });

      eventEmitterService.emit(event);

      await flushPromises();

      expect(mockAdapter.trackEvent).toHaveBeenCalledWith(
        'user-123',
        'org-456',
        'deployment_done',
        {
          targetCount: 3,
          recipeCount: 5,
          standardCount: 3,
        },
      );
    });
  });

  describe('ArtifactsPulledEvent', () => {
    it('tracks artifacts_pulled event with correct payload', async () => {
      const event = new ArtifactsPulledEvent({
        userId: 'user-123',
        organizationId: 'org-456',
        packageSlugs: ['pkg-1', 'pkg-2'],
        recipeCount: 10,
        standardCount: 5,
        source: 'cli',
      });

      eventEmitterService.emit(event);

      await flushPromises();

      expect(mockAdapter.trackEvent).toHaveBeenCalledWith(
        'user-123',
        'org-456',
        'artifacts_pulled',
        {
          packageCount: 2,
          recipeCount: 10,
          standardCount: 5,
          source: 'cli',
        },
      );
    });
  });

  describe('LinterCalledEvent', () => {
    it('tracks linter_called event with correct payload', async () => {
      const event = new LinterCalledEvent({
        userId: createUserId('user-123'),
        organizationId: createOrganizationId('org-456'),
        gitRepoId: createGitRepoId('repo-789'),
        targetCount: 3,
        standardCount: 5,
      });

      eventEmitterService.emit(event);

      await flushPromises();

      expect(mockAdapter.trackEvent).toHaveBeenCalledWith(
        'user-123',
        'org-456',
        'linter_called',
        {
          gitRepoId: 'repo-789',
          targetCount: 3,
          standardCount: 5,
        },
      );
    });
  });
});

function flushPromises(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}
