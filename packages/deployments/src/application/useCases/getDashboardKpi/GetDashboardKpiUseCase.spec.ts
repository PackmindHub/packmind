import { stubLogger } from '@packmind/test-utils';
import {
  createOrganizationId,
  createSpaceId,
  createUserId,
  DashboardKpiResponse,
  GetDashboardKpiCommand,
  IRecipesPort,
  ISkillsPort,
  IStandardsPort,
} from '@packmind/types';
import { IDistributionRepository } from '../../../domain/repositories/IDistributionRepository';
import { GetDashboardKpiUseCase } from './GetDashboardKpiUseCase';

describe('GetDashboardKpiUseCase', () => {
  let useCase: GetDashboardKpiUseCase;
  let distributionRepository: jest.Mocked<IDistributionRepository>;
  let standardsPort: jest.Mocked<IStandardsPort>;
  let recipesPort: jest.Mocked<IRecipesPort>;
  let skillsPort: jest.Mocked<ISkillsPort>;

  const organizationId = createOrganizationId('org-1');
  const spaceId = createSpaceId('space-1');
  const userId = createUserId('user-1');

  const command: GetDashboardKpiCommand = {
    organizationId,
    spaceId,
    userId,
  };

  beforeEach(() => {
    distributionRepository = {
      countActiveArtifactsBySpace: jest.fn(),
    } as unknown as jest.Mocked<IDistributionRepository>;

    standardsPort = {
      listStandardsBySpace: jest.fn(),
    } as unknown as jest.Mocked<IStandardsPort>;

    recipesPort = {
      listRecipesBySpace: jest.fn(),
    } as unknown as jest.Mocked<IRecipesPort>;

    skillsPort = {
      listSkillsBySpace: jest.fn(),
    } as unknown as jest.Mocked<ISkillsPort>;

    useCase = new GetDashboardKpiUseCase(
      distributionRepository,
      standardsPort,
      recipesPort,
      skillsPort,
      stubLogger(),
    );
  });

  afterEach(() => jest.clearAllMocks());

  describe('when some artifacts are deployed', () => {
    let result: DashboardKpiResponse;

    beforeEach(async () => {
      standardsPort.listStandardsBySpace.mockResolvedValue([
        {} as never,
        {} as never,
        {} as never,
      ]);
      recipesPort.listRecipesBySpace.mockResolvedValue([
        {} as never,
        {} as never,
      ]);
      skillsPort.listSkillsBySpace.mockResolvedValue([{} as never]);
      distributionRepository.countActiveArtifactsBySpace.mockResolvedValue({
        standards: 2,
        recipes: 1,
        skills: 0,
      });

      result = await useCase.execute(command);
    });

    it('returns total standards count', () => {
      expect(result.standards.total).toBe(3);
    });

    it('returns active standards count', () => {
      expect(result.standards.active).toBe(2);
    });

    it('returns total recipes count', () => {
      expect(result.recipes.total).toBe(2);
    });

    it('returns active recipes count', () => {
      expect(result.recipes.active).toBe(1);
    });

    it('returns total skills count', () => {
      expect(result.skills.total).toBe(1);
    });

    it('returns active skills count', () => {
      expect(result.skills.active).toBe(0);
    });
  });

  describe('when no artifacts exist', () => {
    let result: DashboardKpiResponse;

    beforeEach(async () => {
      standardsPort.listStandardsBySpace.mockResolvedValue([]);
      recipesPort.listRecipesBySpace.mockResolvedValue([]);
      skillsPort.listSkillsBySpace.mockResolvedValue([]);
      distributionRepository.countActiveArtifactsBySpace.mockResolvedValue({
        standards: 0,
        recipes: 0,
        skills: 0,
      });

      result = await useCase.execute(command);
    });

    it('returns zero total standards', () => {
      expect(result.standards.total).toBe(0);
    });

    it('returns zero active standards', () => {
      expect(result.standards.active).toBe(0);
    });

    it('returns zero total recipes', () => {
      expect(result.recipes.total).toBe(0);
    });

    it('returns zero active recipes', () => {
      expect(result.recipes.active).toBe(0);
    });

    it('returns zero total skills', () => {
      expect(result.skills.total).toBe(0);
    });

    it('returns zero active skills', () => {
      expect(result.skills.active).toBe(0);
    });
  });

  describe('when all artifacts are deployed', () => {
    let result: DashboardKpiResponse;

    beforeEach(async () => {
      standardsPort.listStandardsBySpace.mockResolvedValue([
        {} as never,
        {} as never,
      ]);
      recipesPort.listRecipesBySpace.mockResolvedValue([
        {} as never,
        {} as never,
        {} as never,
      ]);
      skillsPort.listSkillsBySpace.mockResolvedValue([
        {} as never,
        {} as never,
      ]);
      distributionRepository.countActiveArtifactsBySpace.mockResolvedValue({
        standards: 2,
        recipes: 3,
        skills: 2,
      });

      result = await useCase.execute(command);
    });

    it('returns standards active equal to total', () => {
      expect(result.standards.active).toBe(result.standards.total);
    });

    it('returns recipes active equal to total', () => {
      expect(result.recipes.active).toBe(result.recipes.total);
    });

    it('returns skills active equal to total', () => {
      expect(result.skills.active).toBe(result.skills.total);
    });
  });
});
