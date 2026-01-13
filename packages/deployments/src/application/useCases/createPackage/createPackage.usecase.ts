import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  CreatePackageCommand,
  CreatePackageResponse,
  IAccountsPort,
  ICreatePackageUseCase,
  IRecipesPort,
  ISkillsPort,
  ISpacesPort,
  IStandardsPort,
  createPackageId,
  createUserId,
} from '@packmind/types';
import { DeploymentsServices } from '../../services/DeploymentsServices';
import { v4 as uuidv4 } from 'uuid';
import slug from 'slug';

const origin = 'CreatePackageUsecase';

export class CreatePackageUsecase
  extends AbstractMemberUseCase<CreatePackageCommand, CreatePackageResponse>
  implements ICreatePackageUseCase
{
  constructor(
    accountsPort: IAccountsPort,
    private readonly services: DeploymentsServices,
    private readonly spacesPort: ISpacesPort,
    private readonly recipesPort: IRecipesPort,
    private readonly standardsPort: IStandardsPort,
    private readonly skillsPort: ISkillsPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
    this.logger.info('CreatePackageUsecase initialized');
  }

  async executeForMembers(
    command: CreatePackageCommand & MemberContext,
  ): Promise<CreatePackageResponse> {
    const {
      spaceId,
      name,
      description,
      recipeIds,
      standardIds,
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

    // Validate space exists and belongs to organization
    const space = await this.spacesPort.getSpaceById(spaceId);
    if (!space) {
      throw new Error(`Space with id ${spaceId} not found`);
    }

    if (space.organizationId !== command.organizationId) {
      throw new Error(
        `Space ${spaceId} does not belong to organization ${command.organizationId}`,
      );
    }

    // Generate unique slug from package name
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

    // Validate all recipes belong to the space
    if (recipeIds.length > 0) {
      const recipes = await Promise.all(
        recipeIds.map((recipeId) =>
          this.recipesPort.getRecipeByIdInternal(recipeId),
        ),
      );

      for (let i = 0; i < recipes.length; i++) {
        const recipe = recipes[i];
        if (!recipe) {
          throw new Error(`Recipe with id ${recipeIds[i]} not found`);
        }
        if (recipe.spaceId !== spaceId) {
          throw new Error(
            `Recipe ${recipeIds[i]} does not belong to space ${spaceId}`,
          );
        }
      }
    }

    // Validate all standards belong to the space
    if (standardIds.length > 0) {
      const standards = await Promise.all(
        standardIds.map((standardId) =>
          this.standardsPort.getStandard(standardId),
        ),
      );

      for (let i = 0; i < standards.length; i++) {
        const standard = standards[i];
        if (!standard) {
          throw new Error(`Standard with id ${standardIds[i]} not found`);
        }
        if (standard.spaceId !== spaceId) {
          throw new Error(
            `Standard ${standardIds[i]} does not belong to space ${spaceId}`,
          );
        }
      }
    }

    // Validate all skills belong to the space
    if (skillIds.length > 0) {
      const skills = await Promise.all(
        skillIds.map((skillId) => this.skillsPort.getSkill(skillId)),
      );

      for (let i = 0; i < skills.length; i++) {
        const skill = skills[i];
        if (!skill) {
          throw new Error(`Skill with id ${skillIds[i]} not found`);
        }
        if (skill.spaceId !== spaceId) {
          throw new Error(
            `Skill ${skillIds[i]} does not belong to space ${spaceId}`,
          );
        }
      }
    }

    // Create package using the service
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
