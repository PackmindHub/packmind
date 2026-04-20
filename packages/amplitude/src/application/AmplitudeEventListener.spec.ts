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
  StandardSampleSelectedEvent,
  LinterCalledEvent,
  LinterRuleSeverityUpdatedEvent,
  SkillCreatedEvent,
  OrganizationCreatedEvent,
  UserSignedInEvent,
  ChangeProposalSubmittedEvent,
  ChangeProposalAcceptedEvent,
  ChangeProposalRejectedEvent,
  SpaceCreatedEvent,
  SpaceDeletedEvent,
  SpaceMembersAddedEvent,
  SpaceMembersRemovedEvent,
  SpaceMembersRoleUpdatedEvent,
  SpaceVisibilityUpdatedEvent,
  SpaceType,
  UserSpaceRole,
  PlaybookArtefactMovedEvent,
  createUserId,
  createOrganizationId,
  createRecipeId,
  createSpaceId,
  createSkillId,
  createRuleId,
  createStandardId,
  createStandardVersionId,
  createTargetId,
  createChangeProposalId,
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

  describe('StandardSampleSelectedEvent', () => {
    it('tracks standard_sample_selected event with correct payload', async () => {
      const event = new StandardSampleSelectedEvent({
        userId: createUserId('user-123'),
        organizationId: createOrganizationId('org-456'),
        sampleId: 'sample-typescript',
        sampleType: 'language',
        spaceId: createSpaceId('space-abc'),
        source: 'ui',
      });

      eventEmitterService.emit(event);

      await flushPromises();

      expect(mockAdapter.trackEvent).toHaveBeenCalledWith(
        'user-123',
        'org-456',
        'standard_sample_selected',
        {
          name: 'sample-typescript',
          spaceId: 'space-abc',
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

  describe('LinterRuleSeverityUpdatedEvent', () => {
    it('tracks linter_rule_severity_updated event with correct payload', async () => {
      const event = new LinterRuleSeverityUpdatedEvent({
        userId: createUserId('user-123'),
        organizationId: createOrganizationId('org-456'),
        ruleId: createRuleId('rule-789'),
        severity: 'warning',
        source: 'ui',
      });

      eventEmitterService.emit(event);

      await flushPromises();

      expect(mockAdapter.trackEvent).toHaveBeenCalledWith(
        'user-123',
        'org-456',
        'linter_rule_severity_updated',
        {
          ruleId: 'rule-789',
          severity: 'warning',
          source: 'ui',
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

  describe('UserSignedInEvent', () => {
    it('tracks user_signed_in event with correct payload', async () => {
      const event = new UserSignedInEvent({
        userId: createUserId('user-123'),
        organizationId: createOrganizationId('org-456'),
        email: 'test@example.com',
        method: 'social',
        socialProvider: 'google',
        source: 'ui',
      });

      eventEmitterService.emit(event);

      await flushPromises();

      expect(mockAdapter.trackEvent).toHaveBeenCalledWith(
        'user-123',
        'org-456',
        'user_signed_in',
        {
          authType: 'social',
          socialProvider: 'google',
          source: 'ui',
        },
      );
    });

    describe('when signing in with password', () => {
      it('tracks user_signed_in event with empty socialProvider', async () => {
        const event = new UserSignedInEvent({
          userId: createUserId('user-123'),
          organizationId: createOrganizationId('org-456'),
          email: 'test@example.com',
          method: 'password',
          source: 'ui',
        });

        eventEmitterService.emit(event);

        await flushPromises();

        expect(mockAdapter.trackEvent).toHaveBeenCalledWith(
          'user-123',
          'org-456',
          'user_signed_in',
          {
            authType: 'password',
            socialProvider: '',
            source: 'ui',
          },
        );
      });
    });
  });

  describe('ChangeProposalSubmittedEvent', () => {
    it('tracks change_proposal_submitted event with correct payload', async () => {
      const event = new ChangeProposalSubmittedEvent({
        userId: createUserId('user-123'),
        organizationId: createOrganizationId('org-456'),
        changeProposalId: createChangeProposalId('cp-789'),
        itemType: 'standard',
        itemId: 'std-001',
        changeType: 'addRule',
        captureMode: 'commit',
        source: 'ui',
      });

      eventEmitterService.emit(event);

      await flushPromises();

      expect(mockAdapter.trackEvent).toHaveBeenCalledWith(
        'user-123',
        'org-456',
        'change_proposal_submitted',
        {
          changeProposalId: 'cp-789',
          itemType: 'standard',
          itemId: 'std-001',
          changeType: 'addRule',
          captureMode: 'commit',
          source: 'ui',
        },
      );
    });
  });

  describe('ChangeProposalAcceptedEvent', () => {
    it('tracks change_proposal_accepted event with correct payload', async () => {
      const event = new ChangeProposalAcceptedEvent({
        userId: createUserId('user-123'),
        organizationId: createOrganizationId('org-456'),
        changeProposalId: createChangeProposalId('cp-789'),
        itemType: 'command',
        itemId: 'cmd-001',
        changeType: 'updateCommandName',
        source: 'ui',
      });

      eventEmitterService.emit(event);

      await flushPromises();

      expect(mockAdapter.trackEvent).toHaveBeenCalledWith(
        'user-123',
        'org-456',
        'change_proposal_accepted',
        {
          changeProposalId: 'cp-789',
          itemType: 'command',
          itemId: 'cmd-001',
          changeType: 'updateCommandName',
          source: 'ui',
        },
      );
    });
  });

  describe('ChangeProposalRejectedEvent', () => {
    it('tracks change_proposal_rejected event with correct payload', async () => {
      const event = new ChangeProposalRejectedEvent({
        userId: createUserId('user-123'),
        organizationId: createOrganizationId('org-456'),
        changeProposalId: createChangeProposalId('cp-789'),
        itemType: 'skill',
        itemId: 'skill-001',
        changeType: 'updateSkillName',
        source: 'ui',
      });

      eventEmitterService.emit(event);

      await flushPromises();

      expect(mockAdapter.trackEvent).toHaveBeenCalledWith(
        'user-123',
        'org-456',
        'change_proposal_rejected',
        {
          changeProposalId: 'cp-789',
          itemType: 'skill',
          itemId: 'skill-001',
          changeType: 'updateSkillName',
          source: 'ui',
        },
      );
    });
  });

  describe('SpaceCreatedEvent', () => {
    it('tracks space_created event with correct payload', async () => {
      const event = new SpaceCreatedEvent({
        userId: createUserId('user-123'),
        organizationId: createOrganizationId('org-456'),
        spaceName: 'My Space',
        spaceSlug: 'my-space',
        visibility: SpaceType.open,
        source: 'ui',
      });

      eventEmitterService.emit(event);

      await flushPromises();

      expect(mockAdapter.trackEvent).toHaveBeenCalledWith(
        'user-123',
        'org-456',
        'space_created',
        {
          spaceName: 'My Space',
          spaceSlug: 'my-space',
          visibility: 'open',
          source: 'ui',
        },
      );
    });
  });

  describe('SpaceDeletedEvent', () => {
    it('tracks space_deleted event with correct payload', async () => {
      const event = new SpaceDeletedEvent({
        userId: createUserId('user-123'),
        organizationId: createOrganizationId('org-456'),
        spaceId: createSpaceId('space-789'),
        spaceName: 'My Space',
        spaceSlug: 'my-space',
        source: 'ui',
      });

      eventEmitterService.emit(event);

      await flushPromises();

      expect(mockAdapter.trackEvent).toHaveBeenCalledWith(
        'user-123',
        'org-456',
        'space_deleted',
        {
          spaceId: 'space-789',
          source: 'ui',
        },
      );
    });
  });

  describe('SpaceMembersAddedEvent', () => {
    it('tracks space_members_added event with correct payload', async () => {
      const event = new SpaceMembersAddedEvent({
        userId: createUserId('user-123'),
        organizationId: createOrganizationId('org-456'),
        spaceId: createSpaceId('space-789'),
        memberUserIds: [createUserId('member-1'), createUserId('member-2')],
        source: 'ui',
      });

      eventEmitterService.emit(event);

      await flushPromises();

      expect(mockAdapter.trackEvent).toHaveBeenCalledWith(
        'user-123',
        'org-456',
        'space_members_added',
        {
          spaceId: 'space-789',
          memberCount: 2,
          source: 'ui',
        },
      );
    });
  });

  describe('SpaceMembersRemovedEvent', () => {
    it('tracks space_members_removed event with correct payload', async () => {
      const event = new SpaceMembersRemovedEvent({
        userId: createUserId('user-123'),
        organizationId: createOrganizationId('org-456'),
        spaceId: createSpaceId('space-789'),
        memberUserIds: [createUserId('member-1')],
        source: 'ui',
      });

      eventEmitterService.emit(event);

      await flushPromises();

      expect(mockAdapter.trackEvent).toHaveBeenCalledWith(
        'user-123',
        'org-456',
        'space_members_removed',
        {
          spaceId: 'space-789',
          memberCount: 1,
          source: 'ui',
        },
      );
    });
  });

  describe('SpaceMembersRoleUpdatedEvent', () => {
    it('tracks space_members_role_updated event with correct payload', async () => {
      const event = new SpaceMembersRoleUpdatedEvent({
        userId: createUserId('user-123'),
        organizationId: createOrganizationId('org-456'),
        spaceId: createSpaceId('space-789'),
        memberUserIds: [createUserId('member-1')],
        newRole: UserSpaceRole.ADMIN,
        source: 'ui',
      });

      eventEmitterService.emit(event);

      await flushPromises();

      expect(mockAdapter.trackEvent).toHaveBeenCalledWith(
        'user-123',
        'org-456',
        'space_members_role_updated',
        {
          spaceId: 'space-789',
          memberCount: 1,
          newRole: 'admin',
          source: 'ui',
        },
      );
    });
  });

  describe('SpaceVisibilityUpdatedEvent', () => {
    it('tracks space_visibility_updated event with correct payload', async () => {
      const event = new SpaceVisibilityUpdatedEvent({
        userId: createUserId('user-123'),
        organizationId: createOrganizationId('org-456'),
        spaceId: createSpaceId('space-789'),
        newVisibility: SpaceType.private,
        source: 'ui',
      });

      eventEmitterService.emit(event);

      await flushPromises();

      expect(mockAdapter.trackEvent).toHaveBeenCalledWith(
        'user-123',
        'org-456',
        'space_visibility_updated',
        {
          spaceId: 'space-789',
          newVisibility: 'private',
          source: 'ui',
        },
      );
    });
  });

  describe('PlaybookArtefactMovedEvent', () => {
    it('tracks playbook_artefact_moved event with correct payload', async () => {
      const event = new PlaybookArtefactMovedEvent({
        userId: createUserId('user-123'),
        organizationId: createOrganizationId('org-456'),
        artifactType: 'standard',
        oldArtifactId: 'old-standard-id',
        newArtifactId: 'new-standard-id',
        sourceSpaceId: createSpaceId('space-source'),
        destinationSpaceId: createSpaceId('space-dest'),
        source: 'ui',
      });

      eventEmitterService.emit(event);

      await flushPromises();

      expect(mockAdapter.trackEvent).toHaveBeenCalledWith(
        'user-123',
        'org-456',
        'playbook_artefact_moved',
        {
          artifactType: 'standard',
          oldArtifactId: 'old-standard-id',
          newArtifactId: 'new-standard-id',
          sourceSpaceId: 'space-source',
          destinationSpaceId: 'space-dest',
          source: 'ui',
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
