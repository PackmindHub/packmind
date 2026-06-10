import { stubLogger } from '@packmind/test-utils';
import {
  createOrganizationId,
  createRecipeId,
  createSkillId,
  createSpaceId,
  createStandardId,
  IRecipesPort,
  ISkillsPort,
  ISpacesPort,
  IStandardsPort,
  Package,
  Recipe,
  RecipeId,
  Skill,
  SkillId,
  Space,
  SpaceId,
  Standard,
  StandardId,
  UserId,
  createUserId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { packageFactory } from '../../../test';
import { IPackageRepository } from '../../domain/repositories/IPackageRepository';
import { PackageService } from './PackageService';

describe('PackageService', () => {
  const userId: UserId = createUserId(uuidv4());

  const buildRecipe = (id: RecipeId, spaceId: SpaceId): Recipe => ({
    id,
    name: `Recipe ${id}`,
    slug: `recipe-${id}`,
    content: 'content',
    version: 1,
    userId,
    spaceId,
  });

  const buildStandard = (id: StandardId, spaceId: SpaceId): Standard => ({
    id,
    name: `Standard ${id}`,
    slug: `standard-${id}`,
    description: 'description',
    version: 1,
    userId,
    scope: null,
    spaceId,
  });

  const buildSkill = (id: SkillId, spaceId: SpaceId): Skill => ({
    id,
    name: `Skill ${id}`,
    prompt: 'prompt',
    userId,
    spaceId,
    slug: `skill-${id}`,
    version: 1,
    description: '',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  let packageRepository: jest.Mocked<
    Pick<IPackageRepository, 'findBySlugsAndSpaceIds'>
  >;
  let recipesPort: jest.Mocked<Pick<IRecipesPort, 'getRecipesByIdsInternal'>>;
  let standardsPort: jest.Mocked<Pick<IStandardsPort, 'getStandardsByIds'>>;
  let skillsPort: jest.Mocked<Pick<ISkillsPort, 'getSkillsByIds'>>;
  let spacesPort: jest.Mocked<Pick<ISpacesPort, 'listSpacesByOrganization'>>;
  let service: PackageService;

  const wirePorts = () => {
    service.setArtefactPorts({
      recipesPort: recipesPort as unknown as IRecipesPort,
      standardsPort: standardsPort as unknown as IStandardsPort,
      skillsPort: skillsPort as unknown as ISkillsPort,
      spacesPort: spacesPort as unknown as ISpacesPort,
    });
  };

  beforeEach(() => {
    packageRepository = { findBySlugsAndSpaceIds: jest.fn() };
    recipesPort = { getRecipesByIdsInternal: jest.fn() };
    standardsPort = { getStandardsByIds: jest.fn() };
    skillsPort = { getSkillsByIds: jest.fn() };
    spacesPort = { listSpacesByOrganization: jest.fn() };

    service = new PackageService(
      packageRepository as unknown as IPackageRepository,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPackagesBySlugsAndSpaceWithArtefacts', () => {
    describe('when packages reference recipes, standards and skills', () => {
      const spaceId = createSpaceId(uuidv4());
      const recipeIdA = createRecipeId(uuidv4());
      const recipeIdB = createRecipeId(uuidv4());
      const standardId = createStandardId(uuidv4());
      const missingStandardId = createStandardId(uuidv4());
      const skillId = createSkillId(uuidv4());

      let result: Package[];

      beforeEach(async () => {
        const pkg1 = packageFactory({
          spaceId,
          recipes: [recipeIdA, recipeIdB],
          standards: [standardId, missingStandardId],
          skills: [skillId],
        });
        const pkg2 = packageFactory({
          spaceId,
          recipes: [recipeIdB],
          standards: [],
          skills: [],
        });

        packageRepository.findBySlugsAndSpaceIds.mockResolvedValue([
          pkg1,
          pkg2,
        ]);
        recipesPort.getRecipesByIdsInternal.mockResolvedValue([
          buildRecipe(recipeIdA, spaceId),
          buildRecipe(recipeIdB, spaceId),
        ]);
        standardsPort.getStandardsByIds.mockResolvedValue([
          buildStandard(standardId, spaceId),
        ]);
        skillsPort.getSkillsByIds.mockResolvedValue([
          buildSkill(skillId, spaceId),
        ]);

        wirePorts();
        result = await service.getPackagesBySlugsAndSpaceWithArtefacts(
          ['pkg-1', 'pkg-2'],
          spaceId,
        );
      });

      it('resolves recipes in a single batched call with the unique ids', () => {
        expect(recipesPort.getRecipesByIdsInternal).toHaveBeenCalledWith([
          recipeIdA,
          recipeIdB,
        ]);
      });

      it('resolves standards in a single batched call with the unique ids', () => {
        expect(standardsPort.getStandardsByIds).toHaveBeenCalledWith([
          standardId,
          missingStandardId,
        ]);
      });

      it('resolves skills in a single batched call with the unique ids', () => {
        expect(skillsPort.getSkillsByIds).toHaveBeenCalledWith([skillId]);
      });

      it('hydrates the first package with its recipes', () => {
        expect(result[0].recipes.map((r) => r.id)).toEqual([
          recipeIdA,
          recipeIdB,
        ]);
      });

      it('drops artefact ids that the port does not return', () => {
        expect(result[0].standards.map((s) => s.id)).toEqual([standardId]);
      });

      it('hydrates the second package with the shared recipe', () => {
        expect(result[1].recipes.map((r) => r.id)).toEqual([recipeIdB]);
      });
    });

    describe('when no packages match', () => {
      it('returns an empty array without calling the artefact ports', async () => {
        packageRepository.findBySlugsAndSpaceIds.mockResolvedValue([]);
        wirePorts();

        const result = await service.getPackagesBySlugsAndSpaceWithArtefacts(
          ['missing'],
          createSpaceId(uuidv4()),
        );

        expect(result).toEqual([]);
      });
    });

    describe('when the artefact ports are not wired', () => {
      it('throws because the ports are required', async () => {
        packageRepository.findBySlugsAndSpaceIds.mockResolvedValue([
          packageFactory({ recipes: [createRecipeId(uuidv4())] }),
        ]);

        await expect(
          service.getPackagesBySlugsAndSpaceWithArtefacts(
            ['pkg'],
            createSpaceId(uuidv4()),
          ),
        ).rejects.toThrow('recipesPort is not set');
      });
    });
  });

  describe('getPackagesBySlugsWithArtefacts', () => {
    const organizationId = createOrganizationId(uuidv4());
    const spaceId = createSpaceId(uuidv4());

    beforeEach(async () => {
      spacesPort.listSpacesByOrganization.mockResolvedValue([
        { id: spaceId } as Space,
      ]);
      packageRepository.findBySlugsAndSpaceIds.mockResolvedValue([]);
      wirePorts();

      await service.getPackagesBySlugsWithArtefacts(['pkg'], organizationId);
    });

    it('resolves the spaces of the organization', () => {
      expect(spacesPort.listSpacesByOrganization).toHaveBeenCalledWith(
        organizationId,
      );
    });

    it('queries packages scoped to the resolved spaces', () => {
      expect(packageRepository.findBySlugsAndSpaceIds).toHaveBeenCalledWith(
        ['pkg'],
        [spaceId],
      );
    });
  });
});
