import { PackmindLogger } from '@packmind/logger';
import {
  AbstractSpaceMemberUseCase,
  SpaceMemberContext,
} from '@packmind/node-utils';
import {
  CreatePackageCommand,
  CreatePackageResponse,
  IAccountsPort,
  ICreatePackageUseCase,
  ICommandsPort,
  ISkillsPort,
  ISpacesPort,
  IStandardsPort,
  createPackageId,
  createUserId,
} from '@packmind/types';
import { ArtefactNotInSpaceError } from '../../../domain/errors/ArtefactNotInSpaceError';
import { SpaceNotAccessibleError } from '../../../domain/errors/SpaceNotAccessibleError';
import { DeploymentsServices } from '../../services/DeploymentsServices';
import { SpaceContentNotifier } from '../../services/SpaceContentNotifier';
import { v4 as uuidv4 } from 'uuid';
import slug from 'slug';

const origin = 'CreatePackageUseCase';

export class CreatePackageUseCase
  extends AbstractSpaceMemberUseCase<
    CreatePackageCommand,
    CreatePackageResponse
  >
  implements ICreatePackageUseCase
{
  constructor(
    spacesPort: ISpacesPort,
    accountsPort: IAccountsPort,
    private readonly services: DeploymentsServices,
    private readonly commandsPort: ICommandsPort,
    private readonly standardsPort: IStandardsPort,
    private readonly skillsPort: ISkillsPort,
    private readonly spaceContentNotifier: SpaceContentNotifier,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(spacesPort, accountsPort, logger);
    this.logger.info('CreatePackageUseCase initialized');
  }

  async executeForSpaceMembers(
    command: CreatePackageCommand & SpaceMemberContext,
  ): Promise<CreatePackageResponse> {
    const {
      spaceId,
      name,
      description = '',
      recipeIds = [],
      standardIds = [],
      skillIds = [],
      userId,
    } = command;

    this.logger.info('Creating package', {
      spaceId,
      name,
      recipeCount: recipeIds.length,
      standardCount: standardIds.length,
      skillCount: skillIds.length,
    });

    const space = await this.spacesPort.getSpaceById(spaceId);
    if (!space || space.organizationId !== command.organizationId) {
      throw new SpaceNotAccessibleError(spaceId, command.organizationId);
    }

    this.logger.info('Generating slug from package name', { name });
    const baseSlug = slug(name);
    this.logger.info('Base slug generated', { slug: baseSlug });

    // Ensure slug is unique per space. If it exists, append "-1", "-2", ... until unique
    this.logger.info('Checking slug uniqueness within space', {
      baseSlug,
      spaceId,
    });
    const existingPackages = await this.services
      .getPackageService()
      .getPackagesBySpaceId(spaceId);
    const existingSlugs = new Set(existingPackages.map((p) => p.slug));

    let packageSlug = baseSlug;
    if (existingSlugs.has(packageSlug)) {
      let counter = 1;
      while (existingSlugs.has(`${baseSlug}-${counter}`)) {
        counter++;
      }
      packageSlug = `${baseSlug}-${counter}`;
    }
    this.logger.info('Resolved unique slug', { slug: packageSlug });

    if (recipeIds.length > 0) {
      const recipes = await Promise.all(
        recipeIds.map((recipeId) =>
          this.commandsPort.getCommandByIdInternal(recipeId),
        ),
      );

      for (let i = 0; i < recipes.length; i++) {
        const recipe = recipes[i];
        if (!recipe || recipe.spaceId !== spaceId) {
          throw new ArtefactNotInSpaceError('command', recipeIds[i], spaceId);
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
        if (!standard || standard.spaceId !== spaceId) {
          throw new ArtefactNotInSpaceError(
            'standard',
            standardIds[i],
            spaceId,
          );
        }
      }
    }

    if (skillIds.length > 0) {
      const skills = await Promise.all(
        skillIds.map((skillId) => this.skillsPort.getSkill(skillId)),
      );

      for (let i = 0; i < skills.length; i++) {
        const skill = skills[i];
        if (!skill || skill.spaceId !== spaceId) {
          throw new ArtefactNotInSpaceError('skill', skillIds[i], spaceId);
        }
      }
    }

    const savedPackage = await this.services.getPackageService().createPackage(
      {
        id: createPackageId(uuidv4()),
        name,
        slug: packageSlug,
        description,
        spaceId,
        createdBy: createUserId(userId),
      },
      recipeIds,
      standardIds,
      skillIds,
    );

    await this.spaceContentNotifier.spaceContentChanged(
      command.organizationId,
      spaceId,
    );

    this.logger.info('Package created successfully', {
      packageId: savedPackage.id,
      name: savedPackage.name,
      recipeCount: savedPackage.recipes?.length ?? 0,
      standardCount: savedPackage.standards?.length ?? 0,
      skillCount: savedPackage.skills?.length ?? 0,
    });

    return { package: savedPackage };
  }
}
