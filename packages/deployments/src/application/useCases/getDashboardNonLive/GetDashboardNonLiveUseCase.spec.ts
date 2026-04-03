import {
  IStandardsPort,
  IRecipesPort,
  ISkillsPort,
  createOrganizationId,
  createUserId,
  createSpaceId,
  createStandardId,
  createRecipeId,
  createSkillId,
  GetDashboardNonLiveCommand,
  DashboardNonLiveResponse,
} from '@packmind/types';
import { stubLogger } from '@packmind/test-utils';
import { standardFactory } from '@packmind/standards/test';
import { recipeFactory } from '@packmind/recipes/test';
import { skillFactory } from '@packmind/skills/test';
import { GetDashboardNonLiveUseCase } from './GetDashboardNonLiveUseCase';
import { IDistributionRepository } from '../../../domain/repositories/IDistributionRepository';

describe('GetDashboardNonLiveUseCase', () => {
  let useCase: GetDashboardNonLiveUseCase;
  let mockDistributionRepository: jest.Mocked<IDistributionRepository>;
  let mockStandardsPort: jest.Mocked<IStandardsPort>;
  let mockRecipesPort: jest.Mocked<IRecipesPort>;
  let mockSkillsPort: jest.Mocked<ISkillsPort>;
  const logger = stubLogger();

  const organizationId = createOrganizationId('org-1');
  const userId = createUserId('user-1');
  const spaceId = createSpaceId('space-1');

  const command: GetDashboardNonLiveCommand = {
    organizationId,
    userId,
    spaceId,
  };

  beforeEach(() => {
    mockDistributionRepository = {
      listDeployedArtifactIdsBySpace: jest.fn(),
    } as unknown as jest.Mocked<IDistributionRepository>;

    mockStandardsPort = {
      listStandardsBySpace: jest.fn(),
    } as unknown as jest.Mocked<IStandardsPort>;

    mockRecipesPort = {
      listRecipesBySpace: jest.fn(),
    } as unknown as jest.Mocked<IRecipesPort>;

    mockSkillsPort = {
      listSkillsBySpace: jest.fn(),
    } as unknown as jest.Mocked<ISkillsPort>;

    useCase = new GetDashboardNonLiveUseCase(
      mockDistributionRepository,
      mockStandardsPort,
      mockRecipesPort,
      mockSkillsPort,
      logger,
    );
  });

  afterEach(() => jest.clearAllMocks());

  describe('when some artifacts are not deployed', () => {
    const deployedStandardId = createStandardId('std-deployed');
    const nonDeployedStandardId = createStandardId('std-not-deployed');
    const deployedRecipeId = createRecipeId('rec-deployed');
    const nonDeployedRecipeId = createRecipeId('rec-not-deployed');
    const deployedSkillId = createSkillId('skill-deployed');
    const nonDeployedSkillId = createSkillId('skill-not-deployed');

    const deployedStandard = standardFactory({
      id: deployedStandardId,
      name: 'Deployed Standard',
    });
    const nonDeployedStandard = standardFactory({
      id: nonDeployedStandardId,
      name: 'Non-Deployed Standard',
    });
    const deployedRecipe = recipeFactory({
      id: deployedRecipeId,
      name: 'Deployed Recipe',
    });
    const nonDeployedRecipe = recipeFactory({
      id: nonDeployedRecipeId,
      name: 'Non-Deployed Recipe',
    });
    const deployedSkill = skillFactory({
      id: deployedSkillId,
      name: 'Deployed Skill',
      slug: 'deployed-skill',
    });
    const nonDeployedSkill = skillFactory({
      id: nonDeployedSkillId,
      name: 'Non-Deployed Skill',
      slug: 'non-deployed-skill',
    });

    let result: DashboardNonLiveResponse;

    beforeEach(async () => {
      mockStandardsPort.listStandardsBySpace.mockResolvedValue([
        deployedStandard,
        nonDeployedStandard,
      ]);
      mockRecipesPort.listRecipesBySpace.mockResolvedValue([
        deployedRecipe,
        nonDeployedRecipe,
      ]);
      mockSkillsPort.listSkillsBySpace.mockResolvedValue([
        deployedSkill,
        nonDeployedSkill,
      ]);
      mockDistributionRepository.listDeployedArtifactIdsBySpace.mockResolvedValue(
        {
          standardIds: [deployedStandardId],
          recipeIds: [deployedRecipeId],
          skillIds: [deployedSkillId],
        },
      );

      result = await useCase.execute(command);
    });

    it('returns only non-deployed standards', () => {
      expect(result.standards).toEqual([
        { id: nonDeployedStandardId, name: 'Non-Deployed Standard' },
      ]);
    });

    it('returns only non-deployed recipes', () => {
      expect(result.recipes).toEqual([
        { id: nonDeployedRecipeId, name: 'Non-Deployed Recipe' },
      ]);
    });

    it('returns only non-deployed skills with slug', () => {
      expect(result.skills).toEqual([
        {
          id: nonDeployedSkillId,
          name: 'Non-Deployed Skill',
          slug: 'non-deployed-skill',
        },
      ]);
    });
  });

  describe('when no artifacts exist', () => {
    let result: DashboardNonLiveResponse;

    beforeEach(async () => {
      mockStandardsPort.listStandardsBySpace.mockResolvedValue([]);
      mockRecipesPort.listRecipesBySpace.mockResolvedValue([]);
      mockSkillsPort.listSkillsBySpace.mockResolvedValue([]);
      mockDistributionRepository.listDeployedArtifactIdsBySpace.mockResolvedValue(
        {
          standardIds: [],
          recipeIds: [],
          skillIds: [],
        },
      );

      result = await useCase.execute(command);
    });

    it('returns empty standards array', () => {
      expect(result.standards).toEqual([]);
    });

    it('returns empty recipes array', () => {
      expect(result.recipes).toEqual([]);
    });

    it('returns empty skills array', () => {
      expect(result.skills).toEqual([]);
    });
  });

  describe('when all artifacts are deployed', () => {
    const standardId = createStandardId('std-1');
    const recipeId = createRecipeId('rec-1');
    const skillId = createSkillId('skill-1');

    let result: DashboardNonLiveResponse;

    beforeEach(async () => {
      mockStandardsPort.listStandardsBySpace.mockResolvedValue([
        standardFactory({ id: standardId }),
      ]);
      mockRecipesPort.listRecipesBySpace.mockResolvedValue([
        recipeFactory({ id: recipeId }),
      ]);
      mockSkillsPort.listSkillsBySpace.mockResolvedValue([
        skillFactory({ id: skillId }),
      ]);
      mockDistributionRepository.listDeployedArtifactIdsBySpace.mockResolvedValue(
        {
          standardIds: [standardId],
          recipeIds: [recipeId],
          skillIds: [skillId],
        },
      );

      result = await useCase.execute(command);
    });

    it('returns empty standards array', () => {
      expect(result.standards).toEqual([]);
    });

    it('returns empty recipes array', () => {
      expect(result.recipes).toEqual([]);
    });

    it('returns empty skills array', () => {
      expect(result.skills).toEqual([]);
    });
  });
});
