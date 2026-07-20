import { PackmindLogger } from '@packmind/logger';
import {
  AbstractSpaceMemberUseCase,
  SpaceMemberContext,
  PackmindEventEmitterService,
} from '@packmind/node-utils';
import {
  RemoveArtefactsFromPackageCommand,
  RemoveArtefactsFromPackageResponse,
  IAccountsPort,
  IRemoveArtefactsFromPackageUseCase,
  ISpacesPort,
  ArtefactRemovedFromPackageEvent,
  createUserId,
  createOrganizationId,
} from '@packmind/types';
import { DeploymentsServices } from '../../services/DeploymentsServices';

const origin = 'RemoveArtefactsFromPackageUseCase';

export class RemoveArtefactsFromPackageUseCase
  extends AbstractSpaceMemberUseCase<
    RemoveArtefactsFromPackageCommand,
    RemoveArtefactsFromPackageResponse
  >
  implements IRemoveArtefactsFromPackageUseCase
{
  constructor(
    spacesPort: ISpacesPort,
    accountsPort: IAccountsPort,
    private readonly services: DeploymentsServices,
    private readonly eventEmitterService: PackmindEventEmitterService,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(spacesPort, accountsPort, logger);
    this.logger.info('RemoveArtefactsFromPackageUseCase initialized');
  }

  async executeForSpaceMembers(
    command: RemoveArtefactsFromPackageCommand & SpaceMemberContext,
  ): Promise<RemoveArtefactsFromPackageResponse> {
    const {
      packageId,
      spaceId,
      recipeIds = [],
      standardIds = [],
      skillIds = [],
    } = command;

    this.logger.info('Removing artefacts from package', {
      packageId,
      recipeCount: recipeIds.length,
      standardCount: standardIds.length,
      skillCount: skillIds.length,
    });

    // Validate space exists and belongs to organization
    const space = await this.spacesPort.getSpaceById(spaceId);
    if (!space) {
      throw new Error(`Space with id ${spaceId} not found`);
    }

    if (space.organizationId !== command.organizationId) {
      throw new Error(
        `Package ${packageId} does not belong to organization ${command.organizationId}`,
      );
    }

    // Validate package exists
    const existingPackage = await this.services
      .getPackageService()
      .findById(packageId);
    if (!existingPackage) {
      throw new Error(`Package with id ${packageId} not found`);
    }

    if (existingPackage.spaceId !== spaceId) {
      throw new Error(
        `Package with id ${packageId} does not exist in space ${spaceId}`,
      );
    }

    // Only remove artefacts that are actually in the package; the rest are skipped
    const currentCommandIds = existingPackage.recipes || [];
    const currentStandardIds = existingPackage.standards || [];
    const currentSkillIds = existingPackage.skills || [];

    const removedCommandIds = recipeIds.filter((recipeId) =>
      currentCommandIds.includes(recipeId),
    );
    const skippedCommandIds = recipeIds.filter(
      (recipeId) => !currentCommandIds.includes(recipeId),
    );

    const removedStandardIds = standardIds.filter((standardId) =>
      currentStandardIds.includes(standardId),
    );
    const skippedStandardIds = standardIds.filter(
      (standardId) => !currentStandardIds.includes(standardId),
    );

    const removedSkillIds = skillIds.filter((skillId) =>
      currentSkillIds.includes(skillId),
    );
    const skippedSkillIds = skillIds.filter(
      (skillId) => !currentSkillIds.includes(skillId),
    );

    // Remove artefacts from package
    const packageRepository = this.services
      .getRepositories()
      .getPackageRepository();

    if (removedCommandIds.length > 0) {
      await packageRepository.removeCommands(packageId, removedCommandIds);
    }

    if (removedStandardIds.length > 0) {
      await packageRepository.removeStandards(packageId, removedStandardIds);
    }

    if (removedSkillIds.length > 0) {
      await packageRepository.removeSkills(packageId, removedSkillIds);
    }

    // Fetch updated package
    const updatedPackage = await this.services
      .getPackageService()
      .findById(packageId);

    if (!updatedPackage) {
      throw new Error(`Failed to retrieve updated package ${packageId}`);
    }

    // Emit an event per removed artefact so deployment drift is tracked. The
    // artefact keeps shipping until the next sync, then stops.
    const removedArtefacts = [
      ...removedStandardIds.map((id) => String(id)),
      ...removedCommandIds.map((id) => String(id)),
      ...removedSkillIds.map((id) => String(id)),
    ];

    if (removedArtefacts.length > 0) {
      const allPackages = await this.services
        .getPackageService()
        .getPackagesBySpaceId(command.spaceId);

      for (const artefactId of removedArtefacts) {
        const remainingPackagesCount = allPackages.filter(
          (p) =>
            p.id !== command.packageId &&
            [...(p.standards ?? []), ...(p.recipes ?? []), ...(p.skills ?? [])]
              .map(String)
              .includes(artefactId),
        ).length;

        this.eventEmitterService.emit(
          new ArtefactRemovedFromPackageEvent({
            artefactId,
            spaceId: command.spaceId,
            packageId: command.packageId,
            remainingPackagesCount,
            userId: createUserId(command.userId),
            organizationId: createOrganizationId(command.organizationId),
            source: command.source ?? 'ui',
          }),
        );
      }
    }

    this.logger.info('Artefacts removed from package successfully', {
      packageId: updatedPackage.id,
      removedRecipes: removedCommandIds.length,
      removedStandards: removedStandardIds.length,
      removedSkills: removedSkillIds.length,
    });

    return {
      package: updatedPackage,
      removed: {
        standards: removedStandardIds,
        commands: removedCommandIds,
        skills: removedSkillIds,
      },
      skipped: {
        standards: skippedStandardIds,
        commands: skippedCommandIds,
        skills: skippedSkillIds,
      },
    };
  }
}
