import { PackmindLogger } from '@packmind/logger';
import {
  AbstractSpaceMemberUseCase,
  SpaceMemberContext,
  PackmindEventEmitterService,
} from '@packmind/node-utils';
import {
  UpdatePackageCommand,
  UpdatePackageResponse,
  IAccountsPort,
  IUpdatePackageUseCase,
  ICommandsPort,
  ISpacesPort,
  IStandardsPort,
  ISkillsPort,
  ArtefactRemovedFromPackageEvent,
  createUserId,
  createOrganizationId,
} from '@packmind/types';
import { ArtefactNotInSpaceError } from '../../../domain/errors/ArtefactNotInSpaceError';
import { PackageNotFoundError } from '../../../domain/errors/PackageNotFoundError';
import { DeploymentsServices } from '../../services/DeploymentsServices';

const origin = 'UpdatePackageUseCase';

export class UpdatePackageUseCase
  extends AbstractSpaceMemberUseCase<
    UpdatePackageCommand,
    UpdatePackageResponse
  >
  implements IUpdatePackageUseCase
{
  constructor(
    spacesPort: ISpacesPort,
    accountsPort: IAccountsPort,
    private readonly services: DeploymentsServices,
    private readonly commandsPort: ICommandsPort,
    private readonly standardsPort: IStandardsPort,
    private readonly skillsPort: ISkillsPort,
    private readonly eventEmitterService: PackmindEventEmitterService,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(spacesPort, accountsPort, logger);
    this.logger.info('UpdatePackageUseCase initialized');
  }

  async executeForSpaceMembers(
    command: UpdatePackageCommand & SpaceMemberContext,
  ): Promise<UpdatePackageResponse> {
    const { packageId, name, description, recipeIds, standardIds, skillsIds } =
      command;

    this.logger.info('Updating package', {
      packageId,
      name,
      recipeCount: recipeIds.length,
      standardCount: standardIds.length,
      skillCount: skillsIds.length,
    });

    const existingPackage = await this.services
      .getPackageService()
      .findById(packageId);
    if (!existingPackage) {
      throw new PackageNotFoundError(packageId);
    }

    /*
     * A package whose space is gone, and one whose space belongs to another
     * organization, answer the same thing as a package that was never there:
     * otherwise a distinct message tells an outsider the id is real.
     */
    const space = await this.spacesPort.getSpaceById(existingPackage.spaceId);
    if (!space || space.organizationId !== command.organizationId) {
      throw new PackageNotFoundError(packageId, existingPackage.spaceId);
    }

    if (recipeIds.length > 0) {
      const recipes = await Promise.all(
        recipeIds.map((recipeId) =>
          this.commandsPort.getCommandByIdInternal(recipeId),
        ),
      );

      for (let i = 0; i < recipes.length; i++) {
        const recipe = recipes[i];
        if (!recipe || recipe.spaceId !== existingPackage.spaceId) {
          throw new ArtefactNotInSpaceError(
            'command',
            recipeIds[i],
            existingPackage.spaceId,
          );
        }
      }
    }

    if (standardIds.length > 0) {
      const standards = await Promise.all(
        standardIds.map((standardId) =>
          this.standardsPort.getStandard(standardId),
        ),
      );

      for (let i = 0; i < standards.length; i++) {
        const standard = standards[i];
        if (!standard || standard.spaceId !== existingPackage.spaceId) {
          throw new ArtefactNotInSpaceError(
            'standard',
            standardIds[i],
            existingPackage.spaceId,
          );
        }
      }
    }

    if (skillsIds.length > 0) {
      const skills = await Promise.all(
        skillsIds.map((skillId) => this.skillsPort.getSkill(skillId)),
      );

      for (let i = 0; i < skills.length; i++) {
        const skill = skills[i];
        if (!skill || skill.spaceId !== existingPackage.spaceId) {
          throw new ArtefactNotInSpaceError(
            'skill',
            skillsIds[i],
            existingPackage.spaceId,
          );
        }
      }
    }

    const updatedPackage = await this.services
      .getPackageService()
      .updatePackage(
        packageId,
        name,
        description,
        recipeIds,
        standardIds,
        skillsIds,
      );

    this.logger.info('Package updated successfully', {
      packageId: updatedPackage.id,
      name: updatedPackage.name,
      recipeCount: updatedPackage.recipes?.length ?? 0,
      standardCount: updatedPackage.standards?.length ?? 0,
      skillCount: updatedPackage.skills?.length ?? 0,
    });

    const removedStandards = (existingPackage.standards ?? []).filter(
      (id) => !standardIds.includes(id),
    );
    const removedCommands = (existingPackage.recipes ?? []).filter(
      (id) => !recipeIds.includes(id),
    );
    const removedSkills = (existingPackage.skills ?? []).filter(
      (id) => !skillsIds.includes(id),
    );

    const removedArtefacts = [
      ...removedStandards.map((id) => String(id)),
      ...removedCommands.map((id) => String(id)),
      ...removedSkills.map((id) => String(id)),
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

    return { package: updatedPackage };
  }
}
