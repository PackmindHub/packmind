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
  SkillCreatedEvent,
  OrganizationCreatedEvent,
  createUserId,
  createOrganizationId,
  createRecipeId,
  createSpaceId,
  createSkillId,
  createStandardId,
  createStandardVersionId,
  createTargetId,
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
      identifyOrganizationGroup: jest.fn().mockResolvedValue(undefined),
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
        userId: createUserId('user-123'),
        organizationId: createOrganizationId('org-456'),
        standardId: createStandardId('std-789'),
        spaceId: createSpaceId('space-abc'),
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
        userId: createUserId('user-123'),
        organizationId: createOrganizationId('org-456'),
        standardId: createStandardId('std-789'),
        spaceId: createSpaceId('space-abc'),
        newVersion: 2,
        source: 'ui',
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
          source: 'ui',
        },
      );
    });
  });

  describe('RuleAddedEvent', () => {
    it('tracks rule_added event with correct payload', async () => {
      const event = new RuleAddedEvent({
        userId: createUserId('user-123'),
        organizationId: createOrganizationId('org-456'),
        standardId: createStandardId('std-789'),
        standardVersionId: createStandardVersionId('sv-001'),
        newVersion: 3,
        source: 'ui',
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
          source: 'ui',
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
        source: 'ui',
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
          source: 'ui',
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
        source: 'ui',
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
          source: 'ui',
        },
      );
    });
  });

  describe('DeploymentCompletedEvent', () => {
    it('tracks deployment_done event with correct payload', async () => {
      const event = new DeploymentCompletedEvent({
        userId: createUserId('user-123'),
        organizationId: createOrganizationId('org-456'),
        targetIds: ['target-1', 'target-2', 'target-3'].map(createTargetId),
        recipeCount: 5,
        standardCount: 3,
        source: 'ui',
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
          source: 'ui',
        },
      );
    });
  });

  describe('ArtifactsPulledEvent', () => {
    it('tracks artifacts_pulled event with correct payload', async () => {
      const event = new ArtifactsPulledEvent({
        userId: createUserId('user-123'),
        organizationId: createOrganizationId('org-456'),
        packageSlugs: ['pkg-1', 'pkg-2'],
        recipeCount: 10,
        standardCount: 5,
        skillCount: 2,
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
          skillCount: 2,
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
        targetCount: 3,
        standardCount: 5,
        source: 'cli',
      });

      eventEmitterService.emit(event);

      await flushPromises();

      expect(mockAdapter.trackEvent).toHaveBeenCalledWith(
        'user-123',
        'org-456',
        'linter_called',
        {
          targetCount: 3,
          standardCount: 5,
          source: 'cli',
        },
      );
    });
  });

  describe('SkillCreatedEvent', () => {
    it('tracks skill_created event with correct payload', async () => {
      const event = new SkillCreatedEvent({
        userId: createUserId('user-123'),
        organizationId: createOrganizationId('org-456'),
        skillId: createSkillId('skill-789'),
        spaceId: createSpaceId('space-abc'),
        source: 'ui',
        fileCount: 3,
      });

      eventEmitterService.emit(event);

      await flushPromises();

      expect(mockAdapter.trackEvent).toHaveBeenCalledWith(
        'user-123',
        'org-456',
        'skill_created',
        {
          skillId: 'skill-789',
          spaceId: 'space-abc',
          source: 'ui',
          fileCount: 3,
        },
      );
    });
  });

  describe('OrganizationCreatedEvent', () => {
    it('identifies organization group with name', async () => {
      const event = new OrganizationCreatedEvent({
        userId: createUserId('user-123'),
        organizationId: createOrganizationId('org-456'),
        name: 'trial-abc123',
        method: 'trial',
        source: 'api',
      });

      eventEmitterService.emit(event);

      await flushPromises();

      expect(mockAdapter.identifyOrganizationGroup).toHaveBeenCalledWith(
        'org-456',
        'trial-abc123',
      );
    });

    it('tracks new_organization_created event with correct payload', async () => {
      const event = new OrganizationCreatedEvent({
        userId: createUserId('user-123'),
        organizationId: createOrganizationId('org-456'),
        name: 'trial-abc123',
        method: 'trial',
        source: 'api',
      });

      eventEmitterService.emit(event);

      await flushPromises();

      expect(mockAdapter.trackEvent).toHaveBeenCalledWith(
        'user-123',
        'org-456',
        'new_organization_created',
        {
          name: 'trial-abc123',
          method: 'trial',
          source: 'api',
        },
      );
    });
  });
});

function flushPromises(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}
