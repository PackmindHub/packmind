import { stubLogger } from '@packmind/test-utils';
import {
  IGitPort,
  Target,
  CommandVersion,
  StandardVersion,
  SkillVersion,
  createGitRepoId,
  createGitProviderId,
  createOrganizationId,
  createTargetId,
  createCommandVersionId,
  createCommandId,
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
      findOrCreateGitRepo: jest.fn(),
    } as unknown as jest.Mocked<IGitPort>;

    targetService = {
      getTargetsByGitRepoId: jest.fn(),
      addTarget: jest.fn(),
    } as unknown as jest.Mocked<TargetService>;

    distributionRepository = {
      findActiveStandardVersionsByTargetAndPackages: jest.fn(),
      findActiveCommandVersionsByTargetAndPackages: jest.fn(),
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

      it('does not delegate to findOrCreateGitRepo', async () => {
        await service.findOrCreateTargetFromGitInfo(
          organizationId,
          userId,
          gitRemoteUrl,
          gitBranch,
          '/',
        );

        expect(gitPort.findOrCreateGitRepo).not.toHaveBeenCalled();
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

    describe('when target does not exist', () => {
      const newRepoId = createGitRepoId(uuidv4());
      const newTarget: Target = {
        id: createTargetId(uuidv4()),
        name: 'Default',
        path: '/',
        gitRepoId: newRepoId,
      };

      beforeEach(() => {
        // findTargetFromGitInfo finds no matching repo -> returns null,
        // so findOrCreateTargetFromGitInfo delegates to findOrCreateGitRepo.
        gitPort.listProviders.mockResolvedValue({ providers: [] });
        gitPort.findOrCreateGitRepo.mockResolvedValue({
          id: newRepoId as unknown as string,
          owner: 'test-owner',
          repo: 'test-repo',
          branch: 'main',
          providerId: createGitProviderId(uuidv4()),
        });
        targetService.getTargetsByGitRepoId.mockResolvedValue([]);
        targetService.addTarget.mockResolvedValue(newTarget);
      });

      it('delegates provider/repo resolution to findOrCreateGitRepo', async () => {
        await service.findOrCreateTargetFromGitInfo(
          organizationId,
          userId,
          gitRemoteUrl,
          gitBranch,
          '/',
        );

        expect(gitPort.findOrCreateGitRepo).toHaveBeenCalledWith(
          expect.objectContaining({
            userId,
            organizationId,
            providerVendor: 'github',
            gitRemoteUrl,
            owner: 'test-owner',
            repo: 'test-repo',
            branch: 'main',
          }),
        );
      });

      it('creates a target under the resolved repo', async () => {
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

      it('creates a target with a slugified name for nested paths', async () => {
        const nestedTarget: Target = {
          id: createTargetId(uuidv4()),
          name: 'src-packages',
          path: '/src/packages/',
          gitRepoId: newRepoId,
        };
        targetService.addTarget.mockResolvedValue(nestedTarget);

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

    const recipeVersion: CommandVersion = {
      id: createCommandVersionId(uuidv4()),
      recipeId: createCommandId(uuidv4()),
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
        distributionRepository.findActiveCommandVersionsByTargetAndPackages.mockResolvedValue(
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
          distributionRepository.findActiveCommandVersionsByTargetAndPackages,
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
          distributionRepository.findActiveCommandVersionsByTargetAndPackages,
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
