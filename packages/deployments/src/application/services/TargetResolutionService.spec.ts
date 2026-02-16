import { stubLogger } from '@packmind/test-utils';
import {
  IGitPort,
  Target,
  RecipeVersion,
  StandardVersion,
  SkillVersion,
  createGitRepoId,
  createOrganizationId,
  createTargetId,
  createRecipeVersionId,
  createRecipeId,
  createStandardVersionId,
  createStandardId,
  createSkillVersionId,
  createSkillId,
  createUserId,
  createPackageId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { TargetResolutionService } from './TargetResolutionService';
import { TargetService } from './TargetService';
import { IDistributionRepository } from '../../domain/repositories/IDistributionRepository';

describe('TargetResolutionService', () => {
  let service: TargetResolutionService;
  let gitPort: jest.Mocked<IGitPort>;
  let targetService: jest.Mocked<TargetService>;
  let distributionRepository: jest.Mocked<IDistributionRepository>;

  const organizationId = createOrganizationId(uuidv4());
  const userId = uuidv4();
  const gitRemoteUrl = 'https://github.com/test-owner/test-repo.git';
  const gitBranch = 'main';
  const providerId = uuidv4();
  const gitRepoId = createGitRepoId(uuidv4());
  const targetId = createTargetId(uuidv4());

  const target: Target = {
    id: targetId,
    name: 'production',
    path: '/',
    gitRepoId,
  };

  beforeEach(() => {
    gitPort = {
      listProviders: jest.fn(),
      listRepos: jest.fn(),
    } as unknown as jest.Mocked<IGitPort>;

    targetService = {
      getTargetsByGitRepoId: jest.fn(),
    } as unknown as jest.Mocked<TargetService>;

    distributionRepository = {
      findActiveStandardVersionsByTargetAndPackages: jest.fn(),
      findActiveRecipeVersionsByTargetAndPackages: jest.fn(),
      findActiveSkillVersionsByTargetAndPackages: jest.fn(),
    } as unknown as jest.Mocked<IDistributionRepository>;

    service = new TargetResolutionService(
      gitPort,
      targetService,
      distributionRepository,
      stubLogger(),
    );
  });

  afterEach(() => jest.clearAllMocks());

  describe('findTargetFromGitInfo', () => {
    describe('when matching repo and target exist', () => {
      beforeEach(() => {
        gitPort.listProviders.mockResolvedValue({
          providers: [{ id: providerId, name: 'github', type: 'github' }],
        });
        gitPort.listRepos.mockResolvedValue([
          {
            id: gitRepoId,
            owner: 'test-owner',
            repo: 'test-repo',
            branch: 'main',
          },
        ]);
        targetService.getTargetsByGitRepoId.mockResolvedValue([target]);
      });

      it('returns the matching target', async () => {
        const result = await service.findTargetFromGitInfo(
          organizationId,
          userId,
          gitRemoteUrl,
          gitBranch,
          '/',
        );

        expect(result).toEqual(target);
      });
    });

    describe('when no matching repo exists', () => {
      beforeEach(() => {
        gitPort.listProviders.mockResolvedValue({
          providers: [{ id: providerId, name: 'github', type: 'github' }],
        });
        gitPort.listRepos.mockResolvedValue([
          {
            id: gitRepoId,
            owner: 'other-owner',
            repo: 'other-repo',
            branch: 'main',
          },
        ]);
      });

      it('returns null', async () => {
        const result = await service.findTargetFromGitInfo(
          organizationId,
          userId,
          gitRemoteUrl,
          gitBranch,
          '/',
        );

        expect(result).toBeNull();
      });
    });

    describe('when repo exists but no matching target', () => {
      beforeEach(() => {
        gitPort.listProviders.mockResolvedValue({
          providers: [{ id: providerId, name: 'github', type: 'github' }],
        });
        gitPort.listRepos.mockResolvedValue([
          {
            id: gitRepoId,
            owner: 'test-owner',
            repo: 'test-repo',
            branch: 'main',
          },
        ]);
        targetService.getTargetsByGitRepoId.mockResolvedValue([
          { ...target, path: '/other-path/' },
        ]);
      });

      it('returns null', async () => {
        const result = await service.findTargetFromGitInfo(
          organizationId,
          userId,
          gitRemoteUrl,
          gitBranch,
          '/',
        );

        expect(result).toBeNull();
      });
    });

    describe('when relativePath needs normalization', () => {
      beforeEach(() => {
        gitPort.listProviders.mockResolvedValue({
          providers: [{ id: providerId, name: 'github', type: 'github' }],
        });
        gitPort.listRepos.mockResolvedValue([
          {
            id: gitRepoId,
            owner: 'test-owner',
            repo: 'test-repo',
            branch: 'main',
          },
        ]);
      });

      describe('when leading slash is missing', () => {
        it('adds leading slash and matches target', async () => {
          const subTarget: Target = {
            ...target,
            path: '/subdir/',
          };
          targetService.getTargetsByGitRepoId.mockResolvedValue([subTarget]);

          const result = await service.findTargetFromGitInfo(
            organizationId,
            userId,
            gitRemoteUrl,
            gitBranch,
            'subdir/',
          );

          expect(result).toEqual(subTarget);
        });
      });

      describe('when trailing slash is missing', () => {
        it('adds trailing slash and matches target', async () => {
          const subTarget: Target = {
            ...target,
            path: '/subdir/',
          };
          targetService.getTargetsByGitRepoId.mockResolvedValue([subTarget]);

          const result = await service.findTargetFromGitInfo(
            organizationId,
            userId,
            gitRemoteUrl,
            gitBranch,
            '/subdir',
          );

          expect(result).toEqual(subTarget);
        });
      });

      describe('when both leading and trailing slashes are missing', () => {
        it('adds both slashes and matches target', async () => {
          const subTarget: Target = {
            ...target,
            path: '/subdir/',
          };
          targetService.getTargetsByGitRepoId.mockResolvedValue([subTarget]);

          const result = await service.findTargetFromGitInfo(
            organizationId,
            userId,
            gitRemoteUrl,
            gitBranch,
            'subdir',
          );

          expect(result).toEqual(subTarget);
        });
      });
    });

    describe('when no providers exist', () => {
      beforeEach(() => {
        gitPort.listProviders.mockResolvedValue({ providers: [] });
      });

      it('returns null', async () => {
        const result = await service.findTargetFromGitInfo(
          organizationId,
          userId,
          gitRemoteUrl,
          gitBranch,
          '/',
        );

        expect(result).toBeNull();
      });
    });
  });

  describe('findPreviouslyDeployedVersions', () => {
    const packageIds = [createPackageId(uuidv4())];

    const standardVersion: StandardVersion = {
      id: createStandardVersionId(uuidv4()),
      standardId: createStandardId(uuidv4()),
      name: 'Test Standard',
      slug: 'test-standard',
      version: 1,
      rules: [],
      userId: createUserId(uuidv4()),
    };

    const recipeVersion: RecipeVersion = {
      id: createRecipeVersionId(uuidv4()),
      recipeId: createRecipeId(uuidv4()),
      name: 'Test Recipe',
      slug: 'test-recipe',
      version: 1,
      userId: createUserId(uuidv4()),
    };

    const skillVersion: SkillVersion = {
      id: createSkillVersionId(uuidv4()),
      skillId: createSkillId(uuidv4()),
      name: 'Test Skill',
      slug: 'test-skill',
      description: 'Test skill description',
      prompt: 'Test prompt',
      version: 1,
      userId: createUserId(uuidv4()),
    };

    describe('when target exists', () => {
      beforeEach(() => {
        gitPort.listProviders.mockResolvedValue({
          providers: [{ id: providerId, name: 'github', type: 'github' }],
        });
        gitPort.listRepos.mockResolvedValue([
          {
            id: gitRepoId,
            owner: 'test-owner',
            repo: 'test-repo',
            branch: 'main',
          },
        ]);
        targetService.getTargetsByGitRepoId.mockResolvedValue([target]);
        distributionRepository.findActiveStandardVersionsByTargetAndPackages.mockResolvedValue(
          [standardVersion],
        );
        distributionRepository.findActiveRecipeVersionsByTargetAndPackages.mockResolvedValue(
          [recipeVersion],
        );
        distributionRepository.findActiveSkillVersionsByTargetAndPackages.mockResolvedValue(
          [skillVersion],
        );
      });

      it('returns deployed standard versions', async () => {
        const result = await service.findPreviouslyDeployedVersions(
          organizationId,
          userId,
          gitRemoteUrl,
          gitBranch,
          '/',
          packageIds,
        );

        expect(result.standardVersions).toEqual([standardVersion]);
      });

      it('returns deployed recipe versions', async () => {
        const result = await service.findPreviouslyDeployedVersions(
          organizationId,
          userId,
          gitRemoteUrl,
          gitBranch,
          '/',
          packageIds,
        );

        expect(result.recipeVersions).toEqual([recipeVersion]);
      });

      it('returns deployed skill versions', async () => {
        const result = await service.findPreviouslyDeployedVersions(
          organizationId,
          userId,
          gitRemoteUrl,
          gitBranch,
          '/',
          packageIds,
        );

        expect(result.skillVersions).toEqual([skillVersion]);
      });

      it('queries standard versions from distribution repository', async () => {
        await service.findPreviouslyDeployedVersions(
          organizationId,
          userId,
          gitRemoteUrl,
          gitBranch,
          '/',
          packageIds,
        );

        expect(
          distributionRepository.findActiveStandardVersionsByTargetAndPackages,
        ).toHaveBeenCalledWith(organizationId, targetId, packageIds);
      });

      it('queries recipe versions from distribution repository', async () => {
        await service.findPreviouslyDeployedVersions(
          organizationId,
          userId,
          gitRemoteUrl,
          gitBranch,
          '/',
          packageIds,
        );

        expect(
          distributionRepository.findActiveRecipeVersionsByTargetAndPackages,
        ).toHaveBeenCalledWith(organizationId, targetId, packageIds);
      });

      it('queries skill versions from distribution repository', async () => {
        await service.findPreviouslyDeployedVersions(
          organizationId,
          userId,
          gitRemoteUrl,
          gitBranch,
          '/',
          packageIds,
        );

        expect(
          distributionRepository.findActiveSkillVersionsByTargetAndPackages,
        ).toHaveBeenCalledWith(organizationId, targetId, packageIds);
      });
    });

    describe('when target is not found', () => {
      beforeEach(() => {
        gitPort.listProviders.mockResolvedValue({ providers: [] });
      });

      it('returns empty standard versions', async () => {
        const result = await service.findPreviouslyDeployedVersions(
          organizationId,
          userId,
          gitRemoteUrl,
          gitBranch,
          '/',
          packageIds,
        );

        expect(result.standardVersions).toEqual([]);
      });

      it('returns empty recipe versions', async () => {
        const result = await service.findPreviouslyDeployedVersions(
          organizationId,
          userId,
          gitRemoteUrl,
          gitBranch,
          '/',
          packageIds,
        );

        expect(result.recipeVersions).toEqual([]);
      });

      it('returns empty skill versions', async () => {
        const result = await service.findPreviouslyDeployedVersions(
          organizationId,
          userId,
          gitRemoteUrl,
          gitBranch,
          '/',
          packageIds,
        );

        expect(result.skillVersions).toEqual([]);
      });

      it('does not query standard versions from distribution repository', async () => {
        await service.findPreviouslyDeployedVersions(
          organizationId,
          userId,
          gitRemoteUrl,
          gitBranch,
          '/',
          packageIds,
        );

        expect(
          distributionRepository.findActiveStandardVersionsByTargetAndPackages,
        ).not.toHaveBeenCalled();
      });

      it('does not query recipe versions from distribution repository', async () => {
        await service.findPreviouslyDeployedVersions(
          organizationId,
          userId,
          gitRemoteUrl,
          gitBranch,
          '/',
          packageIds,
        );

        expect(
          distributionRepository.findActiveRecipeVersionsByTargetAndPackages,
        ).not.toHaveBeenCalled();
      });

      it('does not query skill versions from distribution repository', async () => {
        await service.findPreviouslyDeployedVersions(
          organizationId,
          userId,
          gitRemoteUrl,
          gitBranch,
          '/',
          packageIds,
        );

        expect(
          distributionRepository.findActiveSkillVersionsByTargetAndPackages,
        ).not.toHaveBeenCalled();
      });
    });
  });
});
