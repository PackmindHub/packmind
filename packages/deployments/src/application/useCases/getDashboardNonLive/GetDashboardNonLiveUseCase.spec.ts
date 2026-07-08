import {
  IStandardsPort,
  ICommandsPort,
  ISkillsPort,
  createOrganizationId,
  createUserId,
  createSpaceId,
  createStandardId,
  createCommandId,
  createSkillId,
  GetDashboardNonLiveCommand,
  DashboardNonLiveResponse,
} from '@packmind/types';
import { stubLogger } from '@packmind/test-utils';
import { standardFactory } from '@packmind/standards/test';
import { commandFactory } from '@packmind/commands/test';
import { skillFactory } from '@packmind/skills/test';
import { GetDashboardNonLiveUseCase } from './GetDashboardNonLiveUseCase';
import { IDistributionRepository } from '../../../domain/repositories/IDistributionRepository';

describe('GetDashboardNonLiveUseCase', () => {
  let useCase: GetDashboardNonLiveUseCase;
  let mockDistributionRepository: jest.Mocked<IDistributionRepository>;
  let mockStandardsPort: jest.Mocked<IStandardsPort>;
  let mockCommandsPort: jest.Mocked<ICommandsPort>;
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

    mockCommandsPort = {
      listCommandsBySpace: jest.fn(),
    } as unknown as jest.Mocked<ICommandsPort>;

    mockSkillsPort = {
      listSkillsBySpace: jest.fn(),
    } as unknown as jest.Mocked<ISkillsPort>;

    useCase = new GetDashboardNonLiveUseCase(
      mockDistributionRepository,
      mockStandardsPort,
      mockCommandsPort,
      mockSkillsPort,
      logger,
    );
  });

  afterEach(() => jest.clearAllMocks());

  describe('when some artifacts are not deployed', () => {
    const deployedStandardId = createStandardId('std-deployed');
    const nonDeployedStandardId = createStandardId('std-not-deployed');
    const deployedCommandId = createCommandId('rec-deployed');
    const nonDeployedCommandId = createCommandId('rec-not-deployed');
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
    const deployedCommand = commandFactory({
      id: deployedCommandId,
      name: 'Deployed Recipe',
    });
    const nonDeployedCommand = commandFactory({
      id: nonDeployedCommandId,
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
      mockCommandsPort.listCommandsBySpace.mockResolvedValue([
        deployedCommand,
        nonDeployedCommand,
      ]);
      mockSkillsPort.listSkillsBySpace.mockResolvedValue([
        deployedSkill,
        nonDeployedSkill,
      ]);
      mockDistributionRepository.listDeployedArtifactIdsBySpace.mockResolvedValue(
        {
          standardIds: [deployedStandardId],
          recipeIds: [deployedCommandId],
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
        { id: nonDeployedCommandId, name: 'Non-Deployed Recipe' },
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
      mockCommandsPort.listCommandsBySpace.mockResolvedValue([]);
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
    const recipeId = createCommandId('rec-1');
    const skillId = createSkillId('skill-1');

    let result: DashboardNonLiveResponse;

    beforeEach(async () => {
      mockStandardsPort.listStandardsBySpace.mockResolvedValue([
        standardFactory({ id: standardId }),
      ]);
      mockCommandsPort.listCommandsBySpace.mockResolvedValue([
        commandFactory({ id: recipeId }),
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
