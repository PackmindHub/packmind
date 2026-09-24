import { PackmindLogger } from '@packmind/logger';
import { PackmindListener } from '@packmind/node-utils';
import {
  CommandCreatedEvent,
  CommandDeletedEvent,
  CommandUpdatedEvent,
  SkillCreatedEvent,
  SkillDeletedEvent,
  SkillUpdatedEvent,
  StandardCreatedEvent,
  StandardDeletedEvent,
  StandardUpdatedEvent,
} from '@packmind/types';
import { IPackageRepository } from '../../domain/repositories/IPackageRepository';
import { SpaceContentNotifier } from '../services/SpaceContentNotifier';

const origin = 'DeploymentsListener';

/**
 * What deployments does about a component's life elsewhere.
 *
 * Deleting takes the component out of every package holding it, which is a
 * membership change like any other and has to reach the readers looking at
 * those packages. It does not go through the package use cases — the component
 * is gone and there is nothing to validate it against — so the write is made
 * here and announced beside it.
 *
 * The other six events change nothing in deployments and are subscribed to
 * only to be announced. A package holds ids, and a content surface draws a row
 * by finding each id in the space's catalogue: a component created or renamed
 * in another tab is a catalogue that has moved under a package list that has
 * not. Creating straight into a package was the case that made this visible —
 * the membership arrived, the catalogue did not, and the package's count went
 * up with no row beneath it.
 *
 * Listening here rather than publishing from the three domains themselves:
 * they do not know that anything reads them alongside packages, and the surface
 * that does is this one. It also keeps the announcement in one file instead of
 * thirteen write paths, none of which could be added to without remembering.
 */
export class DeploymentsListener extends PackmindListener<IPackageRepository> {
  constructor(
    adapter: IPackageRepository,
    private readonly spaceContentNotifier: SpaceContentNotifier = new SpaceContentNotifier(),
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(adapter);
  }

  protected registerHandlers(): void {
    this.subscribe(CommandDeletedEvent, this.handleCommandDeleted);
    this.subscribe(SkillDeletedEvent, this.handleSkillDeleted);
    this.subscribe(StandardDeletedEvent, this.handleStandardDeleted);

    this.subscribe(CommandCreatedEvent, this.announce);
    this.subscribe(CommandUpdatedEvent, this.announce);
    this.subscribe(SkillCreatedEvent, this.announce);
    this.subscribe(SkillUpdatedEvent, this.announce);
    this.subscribe(StandardCreatedEvent, this.announce);
    this.subscribe(StandardUpdatedEvent, this.announce);
  }

  /**
   * One handler for all six, since none of them is read for anything but the
   * space it happened in: the event says only that a reader should go and look
   * again, and where.
   */
  private announce = async (event: {
    payload: { organizationId: string; spaceId: string };
  }): Promise<void> => {
    await this.spaceContentNotifier.spaceContentChanged(
      event.payload.organizationId,
      event.payload.spaceId,
    );
  };

  private handleCommandDeleted = async (
    event: CommandDeletedEvent,
  ): Promise<void> => {
    const { id } = event.payload;
    this.logger.info('Handling RecipeDeletedEvent', { recipeId: id });

    try {
      await this.adapter.removeCommandFromAllPackages(id);
      await this.spaceContentNotifier.spaceContentChanged(
        event.payload.organizationId,
        event.payload.spaceId,
      );
      this.logger.info('Recipe removed from all packages successfully', {
        recipeId: id,
      });
    } catch (error) {
      this.logger.error('Failed to remove recipe from packages', {
        recipeId: id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  };

  private handleSkillDeleted = async (
    event: SkillDeletedEvent,
  ): Promise<void> => {
    const { skillId } = event.payload;
    this.logger.info('Handling SkillDeletedEvent', { skillId });

    try {
      await this.adapter.removeSkillFromAllPackages(skillId);
      await this.spaceContentNotifier.spaceContentChanged(
        event.payload.organizationId,
        event.payload.spaceId,
      );
      this.logger.info('Skill removed from all packages successfully', {
        skillId,
      });
    } catch (error) {
      this.logger.error('Failed to remove skill from packages', {
        skillId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  };

  private handleStandardDeleted = async (
    event: StandardDeletedEvent,
  ): Promise<void> => {
    const { standardId } = event.payload;
    this.logger.info('Handling StandardDeletedEvent', { standardId });

    try {
      await this.adapter.removeStandardFromAllPackages(standardId);
      await this.spaceContentNotifier.spaceContentChanged(
        event.payload.organizationId,
        event.payload.spaceId,
      );
      this.logger.info('Standard removed from all packages successfully', {
        standardId,
      });
    } catch (error) {
      this.logger.error('Failed to remove standard from packages', {
        standardId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  };
}
