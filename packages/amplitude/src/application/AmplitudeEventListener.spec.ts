import { PackmindEventEmitterService } from '@packmind/node-utils';
import {
  ArtifactsPulledEvent,
  DeploymentCompletedEvent,
  IAccountsPort,
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
  User,
  UserSignedInEvent,
  ChangeProposalSubmittedEvent,
  ChangeProposalAcceptedEvent,
  ChangeProposalRejectedEvent,
  SpaceCreatedEvent,
  SpaceDeletedEvent,
  SpaceMembersAddedEvent,
  SpaceMembersRemovedEvent,
  SpaceMembersRoleUpdatedEvent,
  SpaceRenamedEvent,
  SpacePinnedEvent,
  SpaceUnpinnedEvent,
  SpaceVisibilityUpdatedEvent,
  SpaceType,
  UserSpaceRole,
  PlaybookArtefactMovedEvent,
  PluginRenderedEvent,
  PluginDeletedEvent,
  MarketplaceLinkedEvent,
  MarketplacePluginRemovalInitiatedEvent,
  MarketplaceUnlinkedEvent,
  createMarketplaceDistributionId,
  createMarketplaceId,
  createGitRepoId,
  createPackageId,
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

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: createUserId('user-123'),
    email: 'real-user@example.com',
    displayName: null,
    passwordHash: null,
    active: true,
    memberships: [],
    trial: false,
    ...overrides,
  };
}

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

  describe('SpaceRenamedEvent', () => {
    it('tracks space_renamed event with correct payload', async () => {
      const event = new SpaceRenamedEvent({
        userId: createUserId('user-123'),
        organizationId: createOrganizationId('org-456'),
        spaceId: createSpaceId('space-789'),
        spaceSlug: 'my-space',
        oldName: 'Old Space',
        newName: 'New Space',
        source: 'ui',
      });

      eventEmitterService.emit(event);

      await flushPromises();

      expect(mockAdapter.trackEvent).toHaveBeenCalledWith(
        'user-123',
        'org-456',
        'space_renamed',
        {
          spaceId: 'space-789',
          spaceSlug: 'my-space',
          oldName: 'Old Space',
          newName: 'New Space',
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

  describe('SpacePinnedEvent', () => {
    it('tracks space_pinned event with correct payload', async () => {
      const event = new SpacePinnedEvent({
        userId: createUserId('user-123'),
        organizationId: createOrganizationId('org-456'),
        spaceId: createSpaceId('space-789'),
        source: 'ui',
      });

      eventEmitterService.emit(event);

      await flushPromises();

      expect(mockAdapter.trackEvent).toHaveBeenCalledWith(
        'user-123',
        'org-456',
        'space_pinned',
        {
          spaceId: 'space-789',
          source: 'ui',
        },
      );
    });
  });

  describe('SpaceUnpinnedEvent', () => {
    it('tracks space_unpinned event with correct payload', async () => {
      const event = new SpaceUnpinnedEvent({
        userId: createUserId('user-123'),
        organizationId: createOrganizationId('org-456'),
        spaceId: createSpaceId('space-789'),
        source: 'ui',
      });

      eventEmitterService.emit(event);

      await flushPromises();

      expect(mockAdapter.trackEvent).toHaveBeenCalledWith(
        'user-123',
        'org-456',
        'space_unpinned',
        {
          spaceId: 'space-789',
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

  describe('test-user filtering', () => {
    let mockAccountsPort: jest.Mocked<Pick<IAccountsPort, 'getUserById'>>;

    const buildEvent = (userIdValue: string) =>
      new StandardCreatedEvent({
        userId: createUserId(userIdValue),
        organizationId: createOrganizationId('org-456'),
        standardId: createStandardId('std-789'),
        spaceId: createSpaceId('space-abc'),
        source: 'ui',
      });

    beforeEach(() => {
      mockAccountsPort = {
        getUserById: jest.fn(),
      };
      listener.setAccountsAdapter(mockAccountsPort as unknown as IAccountsPort);
    });

    describe('when user email starts with test-', () => {
      it('skips trackEvent', async () => {
        mockAccountsPort.getUserById.mockResolvedValue(
          buildUser({
            id: createUserId('user-test'),
            email: 'test-abc@example.com',
          }),
        );

        eventEmitterService.emit(buildEvent('user-test'));
        await flushPromises();

        expect(mockAdapter.trackEvent).not.toHaveBeenCalled();
      });
    });

    it('matches test- prefix case-insensitively', async () => {
      mockAccountsPort.getUserById.mockResolvedValue(
        buildUser({
          id: createUserId('user-test-upper'),
          email: 'TEST-foo@example.com',
        }),
      );

      eventEmitterService.emit(buildEvent('user-test-upper'));
      await flushPromises();

      expect(mockAdapter.trackEvent).not.toHaveBeenCalled();
    });

    it('still tracks events for users without test- prefix', async () => {
      mockAccountsPort.getUserById.mockResolvedValue(
        buildUser({
          id: createUserId('user-real'),
          email: 'someone@packmind.com',
        }),
      );

      eventEmitterService.emit(buildEvent('user-real'));
      await flushPromises();

      expect(mockAdapter.trackEvent).toHaveBeenCalledTimes(1);
    });

    it('calls getUserById only once for repeated events for the same user', async () => {
      mockAccountsPort.getUserById.mockResolvedValue(
        buildUser({
          id: createUserId('user-test'),
          email: 'test-abc@example.com',
        }),
      );

      eventEmitterService.emit(buildEvent('user-test'));
      await flushPromises();
      eventEmitterService.emit(buildEvent('user-test'));
      await flushPromises();
      eventEmitterService.emit(buildEvent('user-test'));
      await flushPromises();

      expect(mockAccountsPort.getUserById).toHaveBeenCalledTimes(1);
    });

    it('skips trackEvent for all repeated events for a test- user', async () => {
      mockAccountsPort.getUserById.mockResolvedValue(
        buildUser({
          id: createUserId('user-test'),
          email: 'test-abc@example.com',
        }),
      );

      eventEmitterService.emit(buildEvent('user-test'));
      await flushPromises();
      eventEmitterService.emit(buildEvent('user-test'));
      await flushPromises();
      eventEmitterService.emit(buildEvent('user-test'));
      await flushPromises();

      expect(mockAdapter.trackEvent).not.toHaveBeenCalled();
    });

    describe('when getUserById throws', () => {
      it('falls through and tracks the event', async () => {
        mockAccountsPort.getUserById.mockRejectedValue(new Error('db down'));

        eventEmitterService.emit(buildEvent('user-unknown'));
        await flushPromises();

        expect(mockAdapter.trackEvent).toHaveBeenCalledTimes(1);
      });
    });

    it('skips identifyOrganizationGroup for test users on OrganizationCreatedEvent', async () => {
      mockAccountsPort.getUserById.mockResolvedValue(
        buildUser({
          id: createUserId('user-test'),
          email: 'test-abc@example.com',
        }),
      );

      const event = new OrganizationCreatedEvent({
        userId: createUserId('user-test'),
        organizationId: createOrganizationId('org-test'),
        name: 'test-org',
        method: 'trial',
        source: 'api',
      });

      eventEmitterService.emit(event);
      await flushPromises();

      expect(mockAdapter.identifyOrganizationGroup).not.toHaveBeenCalled();
    });

    it('skips trackEvent for test users on OrganizationCreatedEvent', async () => {
      mockAccountsPort.getUserById.mockResolvedValue(
        buildUser({
          id: createUserId('user-test'),
          email: 'test-abc@example.com',
        }),
      );

      const event = new OrganizationCreatedEvent({
        userId: createUserId('user-test'),
        organizationId: createOrganizationId('org-test'),
        name: 'test-org',
        method: 'trial',
        source: 'api',
      });

      eventEmitterService.emit(event);
      await flushPromises();

      expect(mockAdapter.trackEvent).not.toHaveBeenCalled();
    });
  });

  describe('PluginRenderedEvent', () => {
    it('tracks plugin_rendered event with marketplace metadata', async () => {
      const event = new PluginRenderedEvent({
        userId: createUserId('user-123'),
        organizationId: createOrganizationId('org-456'),
        packageId: createPackageId('pkg-789'),
        packageSlug: 'default/my-package',
        mode: 'marketplace',
        pluginRoot: '/tmp/plugins/my-package',
        marketplaceRepo: 'git@github.com:org/marketplace.git',
        source: 'cli',
      });

      eventEmitterService.emit(event);
      await flushPromises();

      expect(mockAdapter.trackEvent).toHaveBeenCalledWith(
        'user-123',
        'org-456',
        'plugin_rendered',
        {
          packageId: 'pkg-789',
          packageSlug: 'default/my-package',
          mode: 'marketplace',
          pluginRoot: '/tmp/plugins/my-package',
          marketplaceRepo: 'git@github.com:org/marketplace.git',
          source: 'cli',
        },
      );
    });

    describe('when absent (standalone mode)', () => {
      it('omits marketplaceRepo from the tracked event', async () => {
        const event = new PluginRenderedEvent({
          userId: createUserId('user-123'),
          organizationId: createOrganizationId('org-456'),
          packageId: createPackageId('pkg-789'),
          packageSlug: 'default/my-package',
          mode: 'standalone',
          pluginRoot: '/tmp/plugins/my-package',
          source: 'cli',
        });

        eventEmitterService.emit(event);
        await flushPromises();

        expect(mockAdapter.trackEvent).toHaveBeenCalledWith(
          'user-123',
          'org-456',
          'plugin_rendered',
          {
            packageId: 'pkg-789',
            packageSlug: 'default/my-package',
            mode: 'standalone',
            pluginRoot: '/tmp/plugins/my-package',
            source: 'cli',
          },
        );
      });
    });
  });

  describe('PluginDeletedEvent', () => {
    it('tracks plugin_deleted event with marketplace metadata', async () => {
      const event = new PluginDeletedEvent({
        userId: createUserId('user-123'),
        organizationId: createOrganizationId('org-456'),
        packageId: createPackageId('pkg-789'),
        packageSlug: 'default/my-package',
        marketplaceRepo: 'git@github.com:org/marketplace.git',
        source: 'cli',
      });

      eventEmitterService.emit(event);
      await flushPromises();

      expect(mockAdapter.trackEvent).toHaveBeenCalledWith(
        'user-123',
        'org-456',
        'plugin_deleted',
        {
          packageId: 'pkg-789',
          packageSlug: 'default/my-package',
          marketplaceRepo: 'git@github.com:org/marketplace.git',
          source: 'cli',
        },
      );
    });

    describe('when absent', () => {
      it('omits marketplaceRepo from the tracked event', async () => {
        const event = new PluginDeletedEvent({
          userId: createUserId('user-123'),
          organizationId: createOrganizationId('org-456'),
          packageId: createPackageId('pkg-789'),
          packageSlug: 'default/my-package',
          source: 'cli',
        });

        eventEmitterService.emit(event);
        await flushPromises();

        expect(mockAdapter.trackEvent).toHaveBeenCalledWith(
          'user-123',
          'org-456',
          'plugin_deleted',
          {
            packageId: 'pkg-789',
            packageSlug: 'default/my-package',
            source: 'cli',
          },
        );
      });
    });
  });
  describe('MarketplaceLinkedEvent', () => {
    it('tracks marketplace_linked event with marketplace metadata', async () => {
      const event = new MarketplaceLinkedEvent({
        userId: createUserId('user-123'),
        organizationId: createOrganizationId('org-456'),
        marketplaceId: createMarketplaceId('mkt-789'),
        gitRepoId: createGitRepoId('repo-101'),
        addedBy: createUserId('user-123'),
        source: 'ui',
      });

      eventEmitterService.emit(event);
      await flushPromises();

      expect(mockAdapter.trackEvent).toHaveBeenCalledWith(
        'user-123',
        'org-456',
        'marketplace_linked',
        {
          marketplaceId: 'mkt-789',
          gitRepoId: 'repo-101',
          addedBy: 'user-123',
          source: 'ui',
        },
      );
    });
  });

  describe('MarketplaceUnlinkedEvent', () => {
    it('tracks marketplace_unlinked event with marketplace metadata', async () => {
      const event = new MarketplaceUnlinkedEvent({
        userId: createUserId('user-123'),
        organizationId: createOrganizationId('org-456'),
        marketplaceId: createMarketplaceId('mkt-789'),
        gitRepoId: createGitRepoId('repo-101'),
        source: 'ui',
      });

      eventEmitterService.emit(event);
      await flushPromises();

      expect(mockAdapter.trackEvent).toHaveBeenCalledWith(
        'user-123',
        'org-456',
        'marketplace_unlinked',
        {
          marketplaceId: 'mkt-789',
          gitRepoId: 'repo-101',
          source: 'ui',
        },
      );
    });
  });

  describe('MarketplacePluginRemovalInitiatedEvent', () => {
    it('tracks marketplace_plugin_removal_initiated event with correct payload', async () => {
      const event = new MarketplacePluginRemovalInitiatedEvent({
        userId: createUserId('user-123'),
        organizationId: createOrganizationId('org-456'),
        marketplaceId: createMarketplaceId('mkt-789'),
        distributionId: createMarketplaceDistributionId('dist-001'),
        packageId: createPackageId('pkg-789'),
        packageSlug: 'default/my-package',
        pluginSlug: 'my-plugin',
        trigger: 'from_marketplace',
        source: 'ui',
      });

      eventEmitterService.emit(event);
      await flushPromises();

      expect(mockAdapter.trackEvent).toHaveBeenCalledWith(
        'user-123',
        'org-456',
        'marketplace_plugin_removal_initiated',
        {
          marketplace_id: 'mkt-789',
          plugin_slug: 'my-plugin',
          actor_id: 'user-123',
          trigger: 'from_marketplace',
          source: 'ui',
        },
      );
    });

    describe('when triggered by package deletion cascade', () => {
      it('tracks the cascade trigger', async () => {
        const event = new MarketplacePluginRemovalInitiatedEvent({
          userId: createUserId('user-123'),
          organizationId: createOrganizationId('org-456'),
          marketplaceId: createMarketplaceId('mkt-789'),
          distributionId: createMarketplaceDistributionId('dist-002'),
          packageId: createPackageId('pkg-790'),
          packageSlug: 'default/other-package',
          pluginSlug: 'other-plugin',
          trigger: 'from_packmind_package',
          source: 'ui',
        });

        eventEmitterService.emit(event);
        await flushPromises();

        expect(mockAdapter.trackEvent).toHaveBeenCalledWith(
          'user-123',
          'org-456',
          'marketplace_plugin_removal_initiated',
          {
            marketplace_id: 'mkt-789',
            plugin_slug: 'other-plugin',
            actor_id: 'user-123',
            trigger: 'from_packmind_package',
            source: 'ui',
          },
        );
      });
    });
  });
});

function flushPromises(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}
