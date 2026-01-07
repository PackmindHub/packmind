import { PackmindListener } from '@packmind/node-utils';
import {
  StandardCreatedEvent,
  StandardUpdatedEvent,
  RuleAddedEvent,
  CommandCreatedEvent,
  CommandUpdatedEvent,
  DeploymentCompletedEvent,
  ArtifactsPulledEvent,
  AnonymousTrialStartedEvent,
  AnonymousTrialAccountActivatedEvent,
  StandardDeletedEvent,
  CommandDeletedEvent,
  LinterCalledEvent,
} from '@packmind/types';
import { EventTrackingAdapter } from './EventTrackingAdapter';

/**
 * Listens to domain events and forwards them to Amplitude for tracking.
 *
 * This listener subscribes to various domain events emitted through
 * PackmindEventEmitterService and translates them into Amplitude tracking calls.
 */
export class AmplitudeEventListener extends PackmindListener<EventTrackingAdapter> {
  protected registerHandlers(): void {
    this.subscribe(StandardCreatedEvent, this.onStandardCreated);
    this.subscribe(StandardUpdatedEvent, this.onStandardUpdated);
    this.subscribe(StandardDeletedEvent, this.onStandardDeleted);
    this.subscribe(RuleAddedEvent, this.onRuleAdded);
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
  }

  private onStandardCreated = async (
    event: StandardCreatedEvent,
  ): Promise<void> => {
    const { userId, organizationId, standardId, spaceId, source } =
      event.payload;
    await this.adapter.trackEvent(userId, organizationId, 'standard_created', {
      standardId,
      spaceId,
      source,
    });
  };

  private onStandardUpdated = async (
    event: StandardUpdatedEvent,
  ): Promise<void> => {
    const { userId, organizationId, standardId, spaceId, newVersion } =
      event.payload;
    await this.adapter.trackEvent(userId, organizationId, 'standard_updated', {
      standardId,
      spaceId,
      newVersion,
    });
  };

  private onStandardDeleted = async (
    event: StandardDeletedEvent,
  ): Promise<void> => {
    const { userId, organizationId, standardId, spaceId } = event.payload;
    await this.adapter.trackEvent(userId, organizationId, 'standard_deleted', {
      standardId,
      spaceId,
    });
  };

  private onRuleAdded = async (event: RuleAddedEvent): Promise<void> => {
    const {
      userId,
      organizationId,
      standardId,
      standardVersionId,
      newVersion,
    } = event.payload;
    await this.adapter.trackEvent(userId, organizationId, 'rule_added', {
      standardId,
      standardVersionId,
      newVersion,
    });
  };

  private onCommandCreated = async (
    event: CommandCreatedEvent,
  ): Promise<void> => {
    const { userId, organizationId, id, spaceId } = event.payload;
    await this.adapter.trackEvent(userId, organizationId, 'command_created', {
      id,
      spaceId,
    });
  };

  private onCommandUpdated = async (
    event: CommandUpdatedEvent,
  ): Promise<void> => {
    const { userId, organizationId, id, spaceId, newVersion } = event.payload;
    await this.adapter.trackEvent(userId, organizationId, 'command_updated', {
      id,
      spaceId,
      newVersion,
    });
  };

  private onCommandDeleted = async (
    event: CommandDeletedEvent,
  ): Promise<void> => {
    const { userId, organizationId, id, spaceId } = event.payload;
    await this.adapter.trackEvent(userId, organizationId, 'command_deleted', {
      id,
      spaceId,
    });
  };

  private onDeploymentCompleted = async (
    event: DeploymentCompletedEvent,
  ): Promise<void> => {
    const { userId, organizationId, targetIds, recipeCount, standardCount } =
      event.payload;
    await this.adapter.trackEvent(userId, organizationId, 'deployment_done', {
      targetCount: targetIds.length,
      recipeCount,
      standardCount,
    });
  };

  private onArtifactsPulled = async (
    event: ArtifactsPulledEvent,
  ): Promise<void> => {
    const {
      userId,
      organizationId,
      packageSlugs,
      recipeCount,
      standardCount,
      source,
    } = event.payload;
    await this.adapter.trackEvent(userId, organizationId, 'artifacts_pulled', {
      packageCount: packageSlugs.length,
      recipeCount,
      standardCount,
      source,
    });
  };

  private handleTrialStarted = async (
    event: AnonymousTrialStartedEvent,
  ): Promise<void> => {
    const { userId, organizationId, agent, startedAt } = event.payload;

    await this.adapter.trackEvent(
      userId,
      organizationId,
      'anonymous_trial_started',
      {
        agent,
        startedAt: startedAt.toISOString(),
      },
    );
  };

  private handleTrialAccountActivated = async (
    event: AnonymousTrialAccountActivatedEvent,
  ): Promise<void> => {
    const { userId, organizationId } = event.payload;

    await this.adapter.trackEvent(
      userId,
      organizationId,
      'anonymous_trial_account_activated',
      {},
    );
  };

  private onLinterCalled = async (event: LinterCalledEvent): Promise<void> => {
    const { userId, organizationId, gitRepoId, targetCount, standardCount } =
      event.payload;
    await this.adapter.trackEvent(userId, organizationId, 'linter_called', {
      gitRepoId,
      targetCount,
      standardCount,
    });
  };
}
