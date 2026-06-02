import { PackmindListener } from '@packmind/node-utils';
import { PackmindLogger } from '@packmind/logger';
import {
  StandardCreatedEvent,
  StandardUpdatedEvent,
  RuleAddedEvent,
  RuleDeletedEvent,
  CommandCreatedEvent,
  CommandUpdatedEvent,
  DeploymentCompletedEvent,
  ArtifactsPulledEvent,
  AnonymousTrialStartedEvent,
  AnonymousTrialAccountActivatedEvent,
  StandardDeletedEvent,
  CommandDeletedEvent,
  LinterCalledEvent,
  LinterRuleSeverityUpdatedEvent,
  SkillCreatedEvent,
  SkillUpdatedEvent,
  RuleUpdatedEvent,
  UserEvent,
  UserId,
  UserSignedUpEvent,
  UserSignedInEvent,
  IAccountsPort,
  OrganizationCreatedEvent,
  StandardSampleSelectedEvent,
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
  PlaybookArtefactMovedEvent,
  PluginRenderedEvent,
  PluginDeletedEvent,
  MarketplaceLinkedEvent,
  MarketplaceUnlinkedEvent,
} from '@packmind/types';
import { EventTrackingAdapter } from './EventTrackingAdapter';
import { AmplitudeMetadata } from '../domain/entities/AmplitudeNodeEvent';

const TEST_USER_EMAIL_PREFIX = 'test-';

/**
 * Listens to domain events and forwards them to Amplitude for tracking.
 *
 * This listener subscribes to various domain events emitted through
 * PackmindEventEmitterService and translates them into Amplitude tracking calls.
 */
export class AmplitudeEventListener extends PackmindListener<EventTrackingAdapter> {
  private readonly logger = new PackmindLogger('AmplitudeEventListener');
  private accountsAdapter?: IAccountsPort;
  private readonly testUserCache = new Map<string, boolean>();

  setAccountsAdapter(adapter: IAccountsPort): void {
    this.accountsAdapter = adapter;
  }

  private async isTestUser(userId: UserId): Promise<boolean> {
    const cached = this.testUserCache.get(userId);
    if (cached !== undefined) {
      return cached;
    }

    if (!this.accountsAdapter) {
      return false;
    }

    try {
      const user = await this.accountsAdapter.getUserById(userId);
      const isTest =
        !!user && user.email.toLowerCase().startsWith(TEST_USER_EMAIL_PREFIX);
      this.testUserCache.set(userId, isTest);
      return isTest;
    } catch (error) {
      this.logger.debug('Failed to resolve user for test-user filter', {
        userId: userId.substring(0, 6) + '*',
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  protected registerHandlers(): void {
    this.subscribe(StandardCreatedEvent, this.onStandardCreated);
    this.subscribe(StandardUpdatedEvent, this.onStandardUpdated);
    this.subscribe(StandardDeletedEvent, this.onStandardDeleted);
    this.subscribe(StandardSampleSelectedEvent, this.onStandardSampleSelected);
    this.subscribe(RuleAddedEvent, this.onRuleAdded);
    this.subscribe(RuleUpdatedEvent, this.onRuleUpdated);
    this.subscribe(RuleDeletedEvent, this.onRuleDeleted);
    this.subscribe(CommandCreatedEvent, this.onCommandCreated);
    this.subscribe(CommandUpdatedEvent, this.onCommandUpdated);
    this.subscribe(CommandDeletedEvent, this.onCommandDeleted);
    this.subscribe(DeploymentCompletedEvent, this.onDeploymentCompleted);
    this.subscribe(ArtifactsPulledEvent, this.onArtifactsPulled);
    this.subscribe(AnonymousTrialStartedEvent, this.handleTrialStarted);
    this.subscribe(
      AnonymousTrialAccountActivatedEvent,
      this.handleTrialAccountActivated,
    );
    this.subscribe(LinterCalledEvent, this.onLinterCalled);
    this.subscribe(
      LinterRuleSeverityUpdatedEvent,
      this.onLinterRuleSeverityUpdated,
    );
    this.subscribe(SkillCreatedEvent, this.onSkillCreated);
    this.subscribe(SkillUpdatedEvent, this.onSkillUpdated);
    this.subscribe(UserSignedUpEvent, this.onUserSignedUpEvent);
    this.subscribe(UserSignedInEvent, this.onUserSignedInEvent);
    this.subscribe(OrganizationCreatedEvent, this.onOrganizationCreatedEvent);
    this.subscribe(
      ChangeProposalSubmittedEvent,
      this.onChangeProposalSubmitted,
    );
    this.subscribe(ChangeProposalAcceptedEvent, this.onChangeProposalAccepted);
    this.subscribe(ChangeProposalRejectedEvent, this.onChangeProposalRejected);
    this.subscribe(SpaceCreatedEvent, this.onSpaceCreated);
    this.subscribe(SpaceDeletedEvent, this.onSpaceDeleted);
    this.subscribe(SpaceMembersAddedEvent, this.onSpaceMembersAdded);
    this.subscribe(SpaceMembersRemovedEvent, this.onSpaceMembersRemoved);
    this.subscribe(
      SpaceMembersRoleUpdatedEvent,
      this.onSpaceMembersRoleUpdated,
    );
    this.subscribe(SpaceRenamedEvent, this.onSpaceRenamed);
    this.subscribe(SpaceVisibilityUpdatedEvent, this.onSpaceVisibilityUpdated);
    this.subscribe(SpacePinnedEvent, this.onSpacePinned);
    this.subscribe(SpaceUnpinnedEvent, this.onSpaceUnpinned);
    this.subscribe(PlaybookArtefactMovedEvent, this.onPlaybookArtefactMoved);
    this.subscribe(PluginRenderedEvent, this.onPluginRendered);
    this.subscribe(PluginDeletedEvent, this.onPluginDeleted);
    this.subscribe(MarketplaceLinkedEvent, this.onMarketplaceLinked);
    this.subscribe(MarketplaceUnlinkedEvent, this.onMarketplaceUnlinked);
  }

  private async emitAmplitudeEvent<T extends UserEvent>(
    event: T,
    eventName: string,
    transformer: (payload: T['payload']) => AmplitudeMetadata,
  ) {
    const { userId, organizationId } = event.payload;

    if (await this.isTestUser(userId)) {
      this.logger.debug('Skipping Amplitude event for test user', {
        eventName,
        userId: userId.substring(0, 6) + '*',
      });
      return;
    }

    await this.adapter.trackEvent(userId, organizationId, eventName, {
      ...transformer(event.payload),
      source: event.payload.source,
      ...(event.payload.originSkill && {
        originSkill: event.payload.originSkill,
      }),
    });
  }

  private onUserSignedUpEvent(event: UserSignedUpEvent) {
    return this.emitAmplitudeEvent(event, 'user_signed_up', (payload) => ({
      quickStart: payload.quickStart,
      method: payload.method,
      socialProvider: payload.socialProvider ?? '',
    }));
  }

  private onUserSignedInEvent = async (
    event: UserSignedInEvent,
  ): Promise<void> => {
    return this.emitAmplitudeEvent(event, 'user_signed_in', (payload) => ({
      authType: payload.method,
      socialProvider: payload.socialProvider ?? '',
    }));
  };

  private onStandardCreated = async (
    event: StandardCreatedEvent,
  ): Promise<void> => {
    return this.emitAmplitudeEvent(event, 'standard_created', (payload) => ({
      standardId: payload.standardId,
      spaceId: payload.spaceId,
      method: payload.method,
    }));
  };

  private onStandardUpdated = async (
    event: StandardUpdatedEvent,
  ): Promise<void> => {
    return this.emitAmplitudeEvent(event, 'standard_updated', (payload) => ({
      standardId: payload.standardId,
      spaceId: payload.spaceId,
      newVersion: payload.newVersion,
    }));
  };

  private onStandardDeleted = async (
    event: StandardDeletedEvent,
  ): Promise<void> => {
    return this.emitAmplitudeEvent(event, 'standard_deleted', (payload) => ({
      standardId: payload.standardId,
      spaceId: payload.spaceId,
    }));
  };

  private onStandardSampleSelected = async (
    event: StandardSampleSelectedEvent,
  ): Promise<void> => {
    return this.emitAmplitudeEvent(
      event,
      'standard_sample_selected',
      (payload) => ({
        name: payload.sampleId,
        spaceId: payload.spaceId,
      }),
    );
  };

  private onRuleAdded = async (event: RuleAddedEvent): Promise<void> => {
    return this.emitAmplitudeEvent(event, 'rule_added', (payload) => ({
      standardId: payload.standardId,
      standardVersionId: payload.standardVersionId,
      newVersion: payload.newVersion,
    }));
  };

  private onRuleUpdated = async (event: RuleUpdatedEvent): Promise<void> => {
    return this.emitAmplitudeEvent(event, 'rule_updated', (payload) => ({
      standardId: payload.standardId,
      standardVersionId: payload.standardVersionId,
      newVersion: payload.newVersion,
    }));
  };

  private onRuleDeleted = async (event: RuleDeletedEvent): Promise<void> => {
    return this.emitAmplitudeEvent(event, 'rule_deleted', (payload) => ({
      standardId: payload.standardId,
      standardVersionId: payload.standardVersionId,
      newVersion: payload.newVersion,
    }));
  };

  private onCommandCreated = async (
    event: CommandCreatedEvent,
  ): Promise<void> => {
    return this.emitAmplitudeEvent(event, 'command_created', (payload) => ({
      id: payload.id,
      spaceId: payload.spaceId,
    }));
  };

  private onCommandUpdated = async (
    event: CommandUpdatedEvent,
  ): Promise<void> => {
    return this.emitAmplitudeEvent(event, 'command_updated', (payload) => ({
      id: payload.id,
      spaceId: payload.spaceId,
      newVersion: payload.newVersion,
    }));
  };

  private onCommandDeleted = async (
    event: CommandDeletedEvent,
  ): Promise<void> => {
    return this.emitAmplitudeEvent(event, 'command_deleted', (payload) => ({
      id: payload.id,
      spaceId: payload.spaceId,
    }));
  };

  private onDeploymentCompleted = async (
    event: DeploymentCompletedEvent,
  ): Promise<void> => {
    return this.emitAmplitudeEvent(event, 'deployment_done', (payload) => ({
      targetCount: payload.targetIds.length,
      recipeCount: payload.recipeCount,
      standardCount: payload.standardCount,
    }));
  };

  private onArtifactsPulled = async (
    event: ArtifactsPulledEvent,
  ): Promise<void> => {
    return this.emitAmplitudeEvent(event, 'artifacts_pulled', (payload) => ({
      packageCount: payload.packageSlugs.length,
      recipeCount: payload.recipeCount,
      standardCount: payload.standardCount,
      skillCount: payload.skillCount,
    }));
  };

  private handleTrialStarted = async (
    event: AnonymousTrialStartedEvent,
  ): Promise<void> => {
    return this.emitAmplitudeEvent(
      event,
      'anonymous_trial_started',
      (payload) => ({
        agent: payload.agent,
        startedAt: payload.startedAt.toISOString(),
      }),
    );
  };

  private handleTrialAccountActivated = async (
    event: AnonymousTrialAccountActivatedEvent,
  ): Promise<void> => {
    return this.emitAmplitudeEvent(
      event,
      'anonymous_trial_account_activated',
      (payload) => ({
        userId: payload.userId,
        organizationId: payload.organizationId,
      }),
    );
  };

  private onLinterCalled = async (event: LinterCalledEvent): Promise<void> => {
    return this.emitAmplitudeEvent(event, 'linter_called', (payload) => ({
      targetCount: payload.targetCount,
      standardCount: payload.standardCount,
    }));
  };

  private onLinterRuleSeverityUpdated = async (
    event: LinterRuleSeverityUpdatedEvent,
  ): Promise<void> => {
    return this.emitAmplitudeEvent(
      event,
      'linter_rule_severity_updated',
      (payload) => ({
        ruleId: payload.ruleId,
        severity: payload.severity,
      }),
    );
  };

  private onSkillCreated = async (event: SkillCreatedEvent): Promise<void> => {
    return this.emitAmplitudeEvent(event, 'skill_created', (payload) => ({
      skillId: payload.skillId,
      spaceId: payload.spaceId,
      fileCount: payload.fileCount,
    }));
  };

  private onSkillUpdated = async (event: SkillUpdatedEvent) => {
    return this.emitAmplitudeEvent(event, 'skill_updated', (payload) => ({
      fileCount: payload.fileCount,
    }));
  };

  private onOrganizationCreatedEvent = async (
    event: OrganizationCreatedEvent,
  ): Promise<void> => {
    const { userId, organizationId, name } = event.payload;

    if (await this.isTestUser(userId)) {
      this.logger.debug(
        'Skipping Amplitude organization identify for test user',
        {
          eventName: 'new_organization_created',
          userId: userId.substring(0, 6) + '*',
        },
      );
      return;
    }

    // Set the organization group name in Amplitude
    await this.adapter.identifyOrganizationGroup(organizationId, name);

    // Track the event
    return this.emitAmplitudeEvent(
      event,
      'new_organization_created',
      (payload) => ({
        name: payload.name,
        method: payload.method,
      }),
    );
  };

  private onChangeProposalSubmitted = async (
    event: ChangeProposalSubmittedEvent,
  ): Promise<void> => {
    return this.emitAmplitudeEvent(
      event,
      'change_proposal_submitted',
      (payload) => ({
        changeProposalId: payload.changeProposalId,
        itemType: payload.itemType,
        itemId: payload.itemId,
        changeType: payload.changeType,
        captureMode: payload.captureMode,
      }),
    );
  };

  private onChangeProposalAccepted = async (
    event: ChangeProposalAcceptedEvent,
  ): Promise<void> => {
    return this.emitAmplitudeEvent(
      event,
      'change_proposal_accepted',
      (payload) => ({
        changeProposalId: payload.changeProposalId,
        itemType: payload.itemType,
        itemId: payload.itemId,
        changeType: payload.changeType,
      }),
    );
  };

  private onChangeProposalRejected = async (
    event: ChangeProposalRejectedEvent,
  ): Promise<void> => {
    return this.emitAmplitudeEvent(
      event,
      'change_proposal_rejected',
      (payload) => ({
        changeProposalId: payload.changeProposalId,
        itemType: payload.itemType,
        itemId: payload.itemId,
        changeType: payload.changeType,
      }),
    );
  };

  private onSpaceRenamed = async (event: SpaceRenamedEvent): Promise<void> => {
    return this.emitAmplitudeEvent(event, 'space_renamed', (payload) => ({
      spaceId: payload.spaceId,
      spaceSlug: payload.spaceSlug,
      oldName: payload.oldName,
      newName: payload.newName,
    }));
  };

  private onSpaceVisibilityUpdated = async (
    event: SpaceVisibilityUpdatedEvent,
  ): Promise<void> => {
    return this.emitAmplitudeEvent(
      event,
      'space_visibility_updated',
      (payload) => ({
        spaceId: payload.spaceId,
        newVisibility: payload.newVisibility,
      }),
    );
  };

  private onSpaceCreated = async (event: SpaceCreatedEvent): Promise<void> => {
    return this.emitAmplitudeEvent(event, 'space_created', (payload) => ({
      spaceName: payload.spaceName,
      spaceSlug: payload.spaceSlug,
      visibility: payload.visibility,
    }));
  };

  private onSpaceDeleted = async (event: SpaceDeletedEvent): Promise<void> => {
    return this.emitAmplitudeEvent(event, 'space_deleted', (payload) => ({
      spaceId: payload.spaceId,
    }));
  };

  private onSpaceMembersAdded = async (
    event: SpaceMembersAddedEvent,
  ): Promise<void> => {
    return this.emitAmplitudeEvent(event, 'space_members_added', (payload) => ({
      spaceId: payload.spaceId,
      memberCount: payload.memberUserIds.length,
    }));
  };

  private onSpaceMembersRemoved = async (
    event: SpaceMembersRemovedEvent,
  ): Promise<void> => {
    return this.emitAmplitudeEvent(
      event,
      'space_members_removed',
      (payload) => ({
        spaceId: payload.spaceId,
        memberCount: payload.memberUserIds.length,
      }),
    );
  };

  private onSpaceMembersRoleUpdated = async (
    event: SpaceMembersRoleUpdatedEvent,
  ): Promise<void> => {
    return this.emitAmplitudeEvent(
      event,
      'space_members_role_updated',
      (payload) => ({
        spaceId: payload.spaceId,
        memberCount: payload.memberUserIds.length,
        newRole: payload.newRole,
      }),
    );
  };

  private onSpacePinned = async (event: SpacePinnedEvent): Promise<void> => {
    return this.emitAmplitudeEvent(event, 'space_pinned', (payload) => ({
      spaceId: payload.spaceId,
    }));
  };

  private onSpaceUnpinned = async (
    event: SpaceUnpinnedEvent,
  ): Promise<void> => {
    return this.emitAmplitudeEvent(event, 'space_unpinned', (payload) => ({
      spaceId: payload.spaceId,
    }));
  };

  private onPlaybookArtefactMoved = async (
    event: PlaybookArtefactMovedEvent,
  ): Promise<void> => {
    return this.emitAmplitudeEvent(
      event,
      'playbook_artefact_moved',
      (payload) => ({
        artifactType: payload.artifactType,
        oldArtifactId: payload.oldArtifactId,
        newArtifactId: payload.newArtifactId,
        sourceSpaceId: payload.sourceSpaceId,
        destinationSpaceId: payload.destinationSpaceId,
      }),
    );
  };

  private onPluginRendered = async (
    event: PluginRenderedEvent,
  ): Promise<void> => {
    return this.emitAmplitudeEvent(event, 'plugin_rendered', (payload) => ({
      packageId: payload.packageId,
      packageSlug: payload.packageSlug,
      mode: payload.mode,
      pluginRoot: payload.pluginRoot,
      ...(payload.marketplaceRepo && {
        marketplaceRepo: payload.marketplaceRepo,
      }),
    }));
  };

  private onPluginDeleted = async (
    event: PluginDeletedEvent,
  ): Promise<void> => {
    return this.emitAmplitudeEvent(event, 'plugin_deleted', (payload) => ({
      packageId: payload.packageId,
      packageSlug: payload.packageSlug,
      ...(payload.marketplaceRepo && {
        marketplaceRepo: payload.marketplaceRepo,
      }),
    }));
  };

  private onMarketplaceLinked = async (
    event: MarketplaceLinkedEvent,
  ): Promise<void> => {
    return this.emitAmplitudeEvent(event, 'marketplace_linked', (payload) => ({
      marketplaceId: payload.marketplaceId,
      gitRepoId: payload.gitRepoId,
      addedBy: payload.addedBy,
    }));
  };

  private onMarketplaceUnlinked = async (
    event: MarketplaceUnlinkedEvent,
  ): Promise<void> => {
    return this.emitAmplitudeEvent(
      event,
      'marketplace_unlinked',
      (payload) => ({
        marketplaceId: payload.marketplaceId,
        gitRepoId: payload.gitRepoId,
      }),
    );
  };
}
