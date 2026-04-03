import {
  IStandardsPort,
  IRecipesPort,
  IGitPort,
  createOrganizationId,
  createUserId,
  createSpaceId,
  createStandardId,
  createRecipeId,
  DashboardOutdatedResponse,
  GetDashboardOutdatedCommand,
} from '@packmind/types';
import { stubLogger } from '@packmind/test-utils';
import { gitRepoFactory } from '@packmind/git/test';
import { standardFactory } from '@packmind/standards/test';
import { recipeFactory } from '@packmind/recipes/test';
import {
  IDistributionRepository,
  OutdatedDeploymentsByTarget,
} from '../../../domain/repositories/IDistributionRepository';
import { targetFactory } from '../../../../test/targetFactory';
import { GetDashboardOutdatedUseCase } from './GetDashboardOutdatedUseCase';

describe('GetDashboardOutdatedUseCase', () => {
  let useCase: GetDashboardOutdatedUseCase;
  let mockDistributionRepository: jest.Mocked<
    Pick<IDistributionRepository, 'findOutdatedDeploymentsBySpace'>
  >;
  let mockStandardsPort: jest.Mocked<
    Pick<IStandardsPort, 'listStandardsBySpace' | 'getStandard'>
  >;
  let mockRecipesPort: jest.Mocked<
    Pick<IRecipesPort, 'listRecipesBySpace' | 'getRecipeByIdInternal'>
  >;
  let mockGitPort: jest.Mocked<Pick<IGitPort, 'getOrganizationRepositories'>>;
  const logger = stubLogger();

  const organizationId = createOrganizationId('org-123');
  const userId = createUserId('user-123');
  const spaceId = createSpaceId('space-1');

  const command: GetDashboardOutdatedCommand = {
    organizationId,
    userId,
    spaceId,
  };

  beforeEach(() => {
    mockDistributionRepository = {
      findOutdatedDeploymentsBySpace: jest.fn(),
    } as jest.Mocked<
      Pick<IDistributionRepository, 'findOutdatedDeploymentsBySpace'>
    >;

    mockStandardsPort = {
      listStandardsBySpace: jest.fn(),
      getStandard: jest.fn(),
    } as unknown as jest.Mocked<
      Pick<IStandardsPort, 'listStandardsBySpace' | 'getStandard'>
    >;

    mockRecipesPort = {
      listRecipesBySpace: jest.fn(),
      getRecipeByIdInternal: jest.fn(),
    } as unknown as jest.Mocked<
      Pick<IRecipesPort, 'listRecipesBySpace' | 'getRecipeByIdInternal'>
    >;

    mockGitPort = {
      getOrganizationRepositories: jest.fn(),
    } as unknown as jest.Mocked<Pick<IGitPort, 'getOrganizationRepositories'>>;

    useCase = new GetDashboardOutdatedUseCase(
      mockDistributionRepository as unknown as IDistributionRepository,
      mockStandardsPort as unknown as IStandardsPort,
      mockRecipesPort as unknown as IRecipesPort,
      mockGitPort as unknown as IGitPort,
      logger,
    );
  });

  afterEach(() => jest.clearAllMocks());

  describe('when there are mixed outdated and up-to-date artifacts', () => {
    const gitRepo = gitRepoFactory();
    const target = targetFactory({ gitRepoId: gitRepo.id });

    const outdatedStandard = standardFactory({
      id: createStandardId('std-outdated'),
      name: 'Outdated Standard',
      version: 3,
    });

    const upToDateStandard = standardFactory({
      id: createStandardId('std-uptodate'),
      name: 'Up To Date Standard',
      version: 2,
    });

    const outdatedRecipe = recipeFactory({
      id: createRecipeId('recipe-outdated'),
      name: 'Outdated Recipe',
      version: 5,
    });

    const upToDateRecipe = recipeFactory({
      id: createRecipeId('recipe-uptodate'),
      name: 'Up To Date Recipe',
      version: 1,
    });

    const outdatedDeployments: OutdatedDeploymentsByTarget[] = [
      {
        targetId: target.id,
        targetName: target.name,
        gitRepoId: gitRepo.id,
        standards: [
          {
            artifactId: outdatedStandard.id,
            artifactName: '',
            deployedVersion: 1,
            latestVersion: 0,
            deploymentDate: '2024-01-01T00:00:00Z',
            isDeleted: false,
          },
          {
            artifactId: upToDateStandard.id,
            artifactName: '',
            deployedVersion: 2,
            latestVersion: 0,
            deploymentDate: '2024-01-01T00:00:00Z',
            isDeleted: false,
          },
        ],
        recipes: [
          {
            artifactId: outdatedRecipe.id,
            artifactName: '',
            deployedVersion: 2,
            latestVersion: 0,
            deploymentDate: '2024-01-02T00:00:00Z',
            isDeleted: false,
          },
          {
            artifactId: upToDateRecipe.id,
            artifactName: '',
            deployedVersion: 1,
            latestVersion: 0,
            deploymentDate: '2024-01-02T00:00:00Z',
            isDeleted: false,
          },
        ],
      },
    ];

    let result: DashboardOutdatedResponse;

    beforeEach(async () => {
      mockDistributionRepository.findOutdatedDeploymentsBySpace.mockResolvedValue(
        outdatedDeployments,
      );
      mockStandardsPort.listStandardsBySpace.mockResolvedValue([
        outdatedStandard,
        upToDateStandard,
      ]);
      mockRecipesPort.listRecipesBySpace.mockResolvedValue([
        outdatedRecipe,
        upToDateRecipe,
      ]);
      mockGitPort.getOrganizationRepositories.mockResolvedValue([gitRepo]);

      result = await useCase.execute(command);
    });

    it('returns one target', () => {
      expect(result.targets).toHaveLength(1);
    });

    it('returns the correct target', () => {
      expect(result.targets[0].target.id).toBe(target.id);
    });

    it('returns the correct git repo', () => {
      expect(result.targets[0].gitRepo.id).toBe(gitRepo.id);
    });

    it('includes only the outdated standard', () => {
      expect(result.targets[0].outdatedStandards).toHaveLength(1);
    });

    it('returns the outdated standard with correct artifact info', () => {
      expect(result.targets[0].outdatedStandards[0].standard.id).toBe(
        outdatedStandard.id,
      );
    });

    it('returns the outdated standard with deployed version 1', () => {
      expect(
        result.targets[0].outdatedStandards[0].deployedVersion.version,
      ).toBe(1);
    });

    it('returns the outdated standard with latest version 3', () => {
      expect(result.targets[0].outdatedStandards[0].latestVersion.version).toBe(
        3,
      );
    });

    it('marks the outdated standard as not up to date', () => {
      expect(result.targets[0].outdatedStandards[0].isUpToDate).toBe(false);
    });

    it('includes only the outdated recipe', () => {
      expect(result.targets[0].outdatedRecipes).toHaveLength(1);
    });

    it('returns the outdated recipe with correct artifact info', () => {
      expect(result.targets[0].outdatedRecipes[0].recipe.id).toBe(
        outdatedRecipe.id,
      );
    });

    it('returns the outdated recipe with deployed version 2', () => {
      expect(result.targets[0].outdatedRecipes[0].deployedVersion.version).toBe(
        2,
      );
    });

    it('returns the outdated recipe with latest version 5', () => {
      expect(result.targets[0].outdatedRecipes[0].latestVersion.version).toBe(
        5,
      );
    });

    it('marks the outdated recipe as not up to date', () => {
      expect(result.targets[0].outdatedRecipes[0].isUpToDate).toBe(false);
    });
  });

  describe('when everything is up to date', () => {
    const gitRepo = gitRepoFactory();
    const target = targetFactory({ gitRepoId: gitRepo.id });

    const standard = standardFactory({
      id: createStandardId('std-1'),
      name: 'Standard',
      version: 1,
    });

    const outdatedDeployments: OutdatedDeploymentsByTarget[] = [
      {
        targetId: target.id,
        targetName: target.name,
        gitRepoId: gitRepo.id,
        standards: [
          {
            artifactId: standard.id,
            artifactName: '',
            deployedVersion: 1,
            latestVersion: 0,
            deploymentDate: '2024-01-01T00:00:00Z',
            isDeleted: false,
          },
        ],
        recipes: [],
      },
    ];

    let result: DashboardOutdatedResponse;

    beforeEach(async () => {
      mockDistributionRepository.findOutdatedDeploymentsBySpace.mockResolvedValue(
        outdatedDeployments,
      );
      mockStandardsPort.listStandardsBySpace.mockResolvedValue([standard]);
      mockRecipesPort.listRecipesBySpace.mockResolvedValue([]);
      mockGitPort.getOrganizationRepositories.mockResolvedValue([gitRepo]);

      result = await useCase.execute(command);
    });

    it('returns empty targets', () => {
      expect(result.targets).toHaveLength(0);
    });
  });

  describe('when deleted artifacts are flagged as outdated', () => {
    const gitRepo = gitRepoFactory();
    const target = targetFactory({ gitRepoId: gitRepo.id });

    const deletedStandard = standardFactory({
      id: createStandardId('std-deleted'),
      name: 'Deleted Standard',
      version: 2,
    });

    const deletedRecipe = recipeFactory({
      id: createRecipeId('recipe-deleted'),
      name: 'Deleted Recipe',
      version: 3,
    });

    const outdatedDeployments: OutdatedDeploymentsByTarget[] = [
      {
        targetId: target.id,
        targetName: target.name,
        gitRepoId: gitRepo.id,
        standards: [
          {
            artifactId: deletedStandard.id,
            artifactName: '',
            deployedVersion: 1,
            latestVersion: 0,
            deploymentDate: '2024-01-01T00:00:00Z',
            isDeleted: false,
          },
        ],
        recipes: [
          {
            artifactId: deletedRecipe.id,
            artifactName: '',
            deployedVersion: 1,
            latestVersion: 0,
            deploymentDate: '2024-01-02T00:00:00Z',
            isDeleted: false,
          },
        ],
      },
    ];

    let result: DashboardOutdatedResponse;

    beforeEach(async () => {
      mockDistributionRepository.findOutdatedDeploymentsBySpace.mockResolvedValue(
        outdatedDeployments,
      );
      // Return empty lists — these artifacts are deleted
      mockStandardsPort.listStandardsBySpace.mockResolvedValue([]);
      mockRecipesPort.listRecipesBySpace.mockResolvedValue([]);
      mockGitPort.getOrganizationRepositories.mockResolvedValue([gitRepo]);

      // The use case should fetch deleted artifacts individually
      mockStandardsPort.getStandard.mockResolvedValue(deletedStandard);
      mockRecipesPort.getRecipeByIdInternal.mockResolvedValue(deletedRecipe);

      result = await useCase.execute(command);
    });

    it('returns one target', () => {
      expect(result.targets).toHaveLength(1);
    });

    it('includes the deleted standard as outdated', () => {
      expect(result.targets[0].outdatedStandards).toHaveLength(1);
    });

    it('marks the deleted standard with isDeleted', () => {
      expect(result.targets[0].outdatedStandards[0].isDeleted).toBe(true);
    });

    it('returns the deleted standard with correct name', () => {
      expect(result.targets[0].outdatedStandards[0].standard.name).toBe(
        'Deleted Standard',
      );
    });

    it('includes the deleted recipe as outdated', () => {
      expect(result.targets[0].outdatedRecipes).toHaveLength(1);
    });

    it('marks the deleted recipe with isDeleted', () => {
      expect(result.targets[0].outdatedRecipes[0].isDeleted).toBe(true);
    });

    it('returns the deleted recipe with correct name', () => {
      expect(result.targets[0].outdatedRecipes[0].recipe.name).toBe(
        'Deleted Recipe',
      );
    });
  });

  describe('when no outdated deployments exist', () => {
    let result: DashboardOutdatedResponse;

    beforeEach(async () => {
      mockDistributionRepository.findOutdatedDeploymentsBySpace.mockResolvedValue(
        [],
      );
      mockStandardsPort.listStandardsBySpace.mockResolvedValue([]);
      mockRecipesPort.listRecipesBySpace.mockResolvedValue([]);
      mockGitPort.getOrganizationRepositories.mockResolvedValue([]);

      result = await useCase.execute(command);
    });

    it('returns empty targets', () => {
      expect(result.targets).toHaveLength(0);
    });
  });

  describe('when git repo is not found for a target', () => {
    const target = targetFactory();

    const standard = standardFactory({
      id: createStandardId('std-1'),
      name: 'Standard',
      version: 2,
    });

    const outdatedDeployments: OutdatedDeploymentsByTarget[] = [
      {
        targetId: target.id,
        targetName: target.name,
        gitRepoId: target.gitRepoId,
        standards: [
          {
            artifactId: standard.id,
            artifactName: '',
            deployedVersion: 1,
            latestVersion: 0,
            deploymentDate: '2024-01-01T00:00:00Z',
            isDeleted: false,
          },
        ],
        recipes: [],
      },
    ];

    let result: DashboardOutdatedResponse;

    beforeEach(async () => {
      mockDistributionRepository.findOutdatedDeploymentsBySpace.mockResolvedValue(
        outdatedDeployments,
      );
      mockStandardsPort.listStandardsBySpace.mockResolvedValue([standard]);
      mockRecipesPort.listRecipesBySpace.mockResolvedValue([]);
      // Return empty git repos — no match for the target's gitRepoId
      mockGitPort.getOrganizationRepositories.mockResolvedValue([]);

      result = await useCase.execute(command);
    });

    it('filters out the target', () => {
      expect(result.targets).toHaveLength(0);
    });
  });
});
