import { PackmindListener } from '@packmind/node-utils';
import {
  StandardCreatedEvent,
  StandardUpdatedEvent,
  RuleAddedEvent,
  RecipeCreatedEvent,
  RecipeUpdatedEvent,
  DeploymentCompletedEvent,
  ArtifactsPulledEvent,
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
    this.subscribe(RuleAddedEvent, this.onRuleAdded);
    this.subscribe(RecipeCreatedEvent, this.onRecipeCreated);
    this.subscribe(RecipeUpdatedEvent, this.onRecipeUpdated);
    this.subscribe(DeploymentCompletedEvent, this.onDeploymentCompleted);
    this.subscribe(ArtifactsPulledEvent, this.onArtifactsPulled);
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

  private onRecipeCreated = async (
    event: RecipeCreatedEvent,
  ): Promise<void> => {
    const { userId, organizationId, recipeId, spaceId } = event.payload;
    await this.adapter.trackEvent(userId, organizationId, 'recipe_created', {
      recipeId,
      spaceId,
    });
  };

  private onRecipeUpdated = async (
    event: RecipeUpdatedEvent,
  ): Promise<void> => {
    const { userId, organizationId, recipeId, spaceId, newVersion } =
      event.payload;
    await this.adapter.trackEvent(userId, organizationId, 'recipe_updated', {
      recipeId,
      spaceId,
      newVersion,
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
}
