import { stubLogger } from '@packmind/test-utils';
import {
  IGitPort,
  Target,
  RecipeVersion,
  StandardVersion,
  SkillVersion,
  createGitRepoId,
  createGitProviderId,
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
      addGitProvider: jest.fn(),
      addGitRepo: jest.fn(),
      listAvailableRepos: jest.fn(),
    } as unknown as jest.Mocked<IGitPort>;

    targetService = {
      getTargetsByGitRepoId: jest.fn(),
      addTarget: jest.fn(),
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

  describe('findOrCreateTargetFromGitInfo', () => {
    describe('when target already exists', () => {
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

      it('returns the existing target', async () => {
        const result = await service.findOrCreateTargetFromGitInfo(
          organizationId,
          userId,
          gitRemoteUrl,
          gitBranch,
          '/',
        );

        expect(result).toEqual(target);
      });

      it('does not create a provider', async () => {
        await service.findOrCreateTargetFromGitInfo(
          organizationId,
          userId,
          gitRemoteUrl,
          gitBranch,
          '/',
        );

        expect(gitPort.addGitProvider).not.toHaveBeenCalled();
      });

      it('does not create a repo', async () => {
        await service.findOrCreateTargetFromGitInfo(
          organizationId,
          userId,
          gitRemoteUrl,
          gitBranch,
          '/',
        );

        expect(gitPort.addGitRepo).not.toHaveBeenCalled();
      });

      it('does not create a target', async () => {
        await service.findOrCreateTargetFromGitInfo(
          organizationId,
          userId,
          gitRemoteUrl,
          gitBranch,
          '/',
        );

        expect(targetService.addTarget).not.toHaveBeenCalled();
      });
    });

    describe('when no provider exists', () => {
      const newProviderId = createGitProviderId(uuidv4());
      const newRepoId = createGitRepoId(uuidv4());
      const newTarget: Target = {
        id: createTargetId(uuidv4()),
        name: 'Default',
        path: '/',
        gitRepoId: newRepoId,
      };

      beforeEach(() => {
        // First call (findTargetFromGitInfo) - no providers
        // Second call (findOrCreateProviderAndRepo) - no providers
        gitPort.listProviders.mockResolvedValue({ providers: [] });
        gitPort.addGitProvider.mockResolvedValue({
          id: newProviderId,
          source: 'github',
          organizationId,
          url: 'https://github.com',
          token: null,
        });
        gitPort.listRepos.mockResolvedValue([]);
        gitPort.addGitRepo.mockResolvedValue({
          id: newRepoId as unknown as string,
          owner: 'test-owner',
          repo: 'test-repo',
          branch: 'main',
          providerId: newProviderId,
        });
        targetService.getTargetsByGitRepoId.mockResolvedValue([]);
        targetService.addTarget.mockResolvedValue(newTarget);
      });

      it('creates a tokenless provider', async () => {
        await service.findOrCreateTargetFromGitInfo(
          organizationId,
          userId,
          gitRemoteUrl,
          gitBranch,
          '/',
        );

        expect(gitPort.addGitProvider).toHaveBeenCalledWith(
          expect.objectContaining({
            gitProvider: {
              source: 'github',
              url: 'https://github.com',
              token: null,
            },
            allowTokenlessProvider: true,
          }),
        );
      });

      it('creates a repo under the tokenless provider', async () => {
        await service.findOrCreateTargetFromGitInfo(
          organizationId,
          userId,
          gitRemoteUrl,
          gitBranch,
          '/',
        );

        expect(gitPort.addGitRepo).toHaveBeenCalledWith(
          expect.objectContaining({
            gitProviderId: newProviderId,
            owner: 'test-owner',
            repo: 'test-repo',
            branch: 'main',
            allowTokenlessProvider: true,
          }),
        );
      });

      it('creates a target', async () => {
        await service.findOrCreateTargetFromGitInfo(
          organizationId,
          userId,
          gitRemoteUrl,
          gitBranch,
          '/',
        );

        expect(targetService.addTarget).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Default',
            path: '/',
            gitRepoId: newRepoId,
          }),
        );
      });

      it('returns the newly created target', async () => {
        const result = await service.findOrCreateTargetFromGitInfo(
          organizationId,
          userId,
          gitRemoteUrl,
          gitBranch,
          '/',
        );

        expect(result).toEqual(newTarget);
      });
    });

    describe('when provider exists but no repo', () => {
      const existingProviderId = createGitProviderId(uuidv4());
      const newRepoId = createGitRepoId(uuidv4());
      const newTarget: Target = {
        id: createTargetId(uuidv4()),
        name: 'Default',
        path: '/',
        gitRepoId: newRepoId,
      };

      beforeEach(() => {
        gitPort.listProviders.mockResolvedValue({
          providers: [
            {
              id: existingProviderId,
              source: 'github',
              organizationId,
              url: 'https://github.com',
              hasToken: false,
            },
          ],
        });
        gitPort.listRepos.mockResolvedValue([]);
        gitPort.addGitRepo.mockResolvedValue({
          id: newRepoId as unknown as string,
          owner: 'test-owner',
          repo: 'test-repo',
          branch: 'main',
          providerId: existingProviderId,
        });
        targetService.getTargetsByGitRepoId.mockResolvedValue([]);
        targetService.addTarget.mockResolvedValue(newTarget);
      });

      it('does not create a new provider', async () => {
        await service.findOrCreateTargetFromGitInfo(
          organizationId,
          userId,
          gitRemoteUrl,
          gitBranch,
          '/',
        );

        expect(gitPort.addGitProvider).not.toHaveBeenCalled();
      });

      it('creates a repo under the existing provider', async () => {
        await service.findOrCreateTargetFromGitInfo(
          organizationId,
          userId,
          gitRemoteUrl,
          gitBranch,
          '/',
        );

        expect(gitPort.addGitRepo).toHaveBeenCalledWith(
          expect.objectContaining({
            gitProviderId: existingProviderId,
            owner: 'test-owner',
            repo: 'test-repo',
            branch: 'main',
          }),
        );
      });

      it('creates a target', async () => {
        await service.findOrCreateTargetFromGitInfo(
          organizationId,
          userId,
          gitRemoteUrl,
          gitBranch,
          '/',
        );

        expect(targetService.addTarget).toHaveBeenCalled();
      });
    });

    describe('when provider and repo exist but no target', () => {
      const newTarget: Target = {
        id: createTargetId(uuidv4()),
        name: 'src-packages',
        path: '/src/packages/',
        gitRepoId,
      };

      beforeEach(() => {
        gitPort.listProviders.mockResolvedValue({
          providers: [
            {
              id: providerId,
              source: 'github',
              organizationId,
              url: 'https://github.com',
              hasToken: false,
            },
          ],
        });
        gitPort.listRepos.mockResolvedValue([
          {
            id: gitRepoId,
            owner: 'test-owner',
            repo: 'test-repo',
            branch: 'main',
          },
        ]);
        // findTargetFromGitInfo returns null (target not found for this path)
        targetService.getTargetsByGitRepoId.mockResolvedValue([target]); // Only root target exists
        targetService.addTarget.mockResolvedValue(newTarget);
      });

      it('does not create a new provider or repo', async () => {
        await service.findOrCreateTargetFromGitInfo(
          organizationId,
          userId,
          gitRemoteUrl,
          gitBranch,
          '/src/packages/',
        );

        expect(gitPort.addGitProvider).not.toHaveBeenCalled();
        expect(gitPort.addGitRepo).not.toHaveBeenCalled();
      });

      it('creates a target with slugified name', async () => {
        await service.findOrCreateTargetFromGitInfo(
          organizationId,
          userId,
          gitRemoteUrl,
          gitBranch,
          '/src/packages/',
        );

        expect(targetService.addTarget).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'src-packages',
            path: '/src/packages/',
          }),
        );
      });

      it('returns the newly created target', async () => {
        const result = await service.findOrCreateTargetFromGitInfo(
          organizationId,
          userId,
          gitRemoteUrl,
          gitBranch,
          '/src/packages/',
        );

        expect(result).toEqual(newTarget);
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
