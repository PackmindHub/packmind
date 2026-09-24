import { PackmindLogger } from '@packmind/logger';
import { PackmindListener } from '@packmind/node-utils';
import {
  CommandDeletedEvent,
  SkillDeletedEvent,
  StandardDeletedEvent,
} from '@packmind/types';
import { IPackageRepository } from '../../domain/repositories/IPackageRepository';
import { PackageChangeNotifier } from '../services/PackageChangeNotifier';

const origin = 'DeploymentsListener';

/**
 * Deleting an artefact takes it out of every package holding it, which is a
 * membership change like any other and has to reach the readers looking at
 * those packages. It does not go through the package use cases — the artefact
 * is gone and there is nothing to validate it against — so the announcement is
 * made here, next to the write it belongs to.
 */
export class DeploymentsListener extends PackmindListener<IPackageRepository> {
  constructor(
    adapter: IPackageRepository,
    private readonly packageChangeNotifier: PackageChangeNotifier = new PackageChangeNotifier(),
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(adapter);
  }

  protected registerHandlers(): void {
    this.subscribe(CommandDeletedEvent, this.handleCommandDeleted);
    this.subscribe(SkillDeletedEvent, this.handleSkillDeleted);
    this.subscribe(StandardDeletedEvent, this.handleStandardDeleted);
  }

  private handleCommandDeleted = async (
    event: CommandDeletedEvent,
  ): Promise<void> => {
    const { id } = event.payload;
    this.logger.info('Handling RecipeDeletedEvent', { recipeId: id });

    try {
      await this.adapter.removeCommandFromAllPackages(id);
      await this.packageChangeNotifier.packagesChanged(
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
      await this.packageChangeNotifier.packagesChanged(
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
      await this.packageChangeNotifier.packagesChanged(
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
