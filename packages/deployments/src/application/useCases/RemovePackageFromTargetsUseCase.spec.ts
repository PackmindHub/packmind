import { RemovePackageFromTargetsUseCase } from './RemovePackageFromTargetsUseCase';
import { PackageService } from '../services/PackageService';
import { TargetService } from '../services/TargetService';
import { IDistributionRepository } from '../../domain/repositories/IDistributionRepository';
import { IDistributedPackageRepository } from '../../domain/repositories/IDistributedPackageRepository';
import { RenderModeConfigurationService } from '../services/RenderModeConfigurationService';
import { PackmindConfigService } from '../services/PackmindConfigService';
import { PackageNotFoundError } from '../../domain/errors/PackageNotFoundError';
import { TargetNotFoundError } from '../../domain/errors/TargetNotFoundError';
import { stubLogger } from '@packmind/test-utils';
import {
  createPackageId,
  createTargetId,
  createUserId,
  createOrganizationId,
  createSpaceId,
  createGitRepoId,
  createDistributionId,
  createDistributedPackageId,
  createRecipeVersionId,
  createStandardVersionId,
  createSkillVersionId,
  createRecipeId,
  createStandardId,
  createSkillId,
  RemovePackageFromTargetsCommand,
  Package,
  Target,
  Distribution,
  DistributionStatus,
  DistributedPackage,
  IRecipesPort,
  IStandardsPort,
  ISkillsPort,
  IGitPort,
  ICodingAgentPort,
  GitRepo,
  createGitProviderId,
  createGitCommitId,
} from '@packmind/types';

describe('RemovePackageFromTargetsUseCase', () => {
  let useCase: RemovePackageFromTargetsUseCase;
  let mockPackageService: jest.Mocked<PackageService>;
  let mockTargetService: jest.Mocked<TargetService>;
  let mockDistributionRepository: jest.Mocked<IDistributionRepository>;
  let mockDistributedPackageRepository: jest.Mocked<IDistributedPackageRepository>;
  let mockRecipesPort: jest.Mocked<IRecipesPort>;
  let mockStandardsPort: jest.Mocked<IStandardsPort>;
  let mockSkillsPort: jest.Mocked<ISkillsPort>;
  let mockGitPort: jest.Mocked<IGitPort>;
  let mockCodingAgentPort: jest.Mocked<ICodingAgentPort>;
  let mockRenderModeConfigurationService: jest.Mocked<RenderModeConfigurationService>;
  let mockPackmindConfigService: jest.Mocked<PackmindConfigService>;

  const userId = createUserId('user-123');
  const organizationId = createOrganizationId('org-123');
  const packageId = createPackageId('package-123');
  const otherPackageId = createPackageId('package-456');
  const targetIds = [createTargetId('target-1'), createTargetId('target-2')];
  const spaceId = createSpaceId('space-123');
  const gitRepoId = createGitRepoId('repo-123');

  const mockPackage: Package = {
    id: packageId,
    name: 'Test Package',
    slug: 'test-package',
    description: 'A test package',
    spaceId,
    createdBy: userId,
    recipes: [],
    standards: [],
  };

  const mockTarget: Target = {
    id: targetIds[0],
    name: 'production',
    path: '/src/',
    gitRepoId,
  };

  const mockTarget2: Target = {
    id: targetIds[1],
    name: 'staging',
    path: '/staging/',
    gitRepoId,
  };

  const mockGitRepo: GitRepo = {
    branch: '',
    id: gitRepoId,
    owner: 'test-owner',
    repo: 'test-repo',
    providerId: createGitProviderId('provider-123'),
  };

  beforeEach(() => {
    mockPackageService = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<PackageService>;

    mockTargetService = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<TargetService>;

    mockDistributionRepository = {
      listByTargetIds: jest.fn(),
      add: jest.fn(),
    } as unknown as jest.Mocked<IDistributionRepository>;

    mockDistributedPackageRepository = {
      add: jest.fn(),
      addStandardVersions: jest.fn(),
      addRecipeVersions: jest.fn(),
      addSkillVersions: jest.fn(),
    } as unknown as jest.Mocked<IDistributedPackageRepository>;

    mockRecipesPort = {
      getRecipeVersionById: jest.fn(),
    } as unknown as jest.Mocked<IRecipesPort>;

    mockStandardsPort = {
      getStandardVersionById: jest.fn(),
      getRulesByStandardId: jest.fn(),
    } as unknown as jest.Mocked<IStandardsPort>;

    mockSkillsPort = {
      getSkillVersion: jest.fn(),
    } as unknown as jest.Mocked<ISkillsPort>;

    mockGitPort = {
      getRepositoryById: jest.fn(),
      getFileFromRepo: jest.fn(),
      commitToGit: jest.fn(),
      getFilesInFolder: jest.fn(),
    } as unknown as jest.Mocked<IGitPort>;

    mockCodingAgentPort = {
      renderArtifacts: jest.fn(),
    } as unknown as jest.Mocked<ICodingAgentPort>;

    mockRenderModeConfigurationService = {
      getActiveRenderModes: jest.fn(),
      mapRenderModesToCodingAgents: jest.fn(),
    } as unknown as jest.Mocked<RenderModeConfigurationService>;

    mockPackmindConfigService = {
      createRemovalConfigFileModification: jest.fn(),
    } as unknown as jest.Mocked<PackmindConfigService>;

    useCase = new RemovePackageFromTargetsUseCase(
      mockPackageService,
      mockTargetService,
      mockDistributionRepository,
      mockDistributedPackageRepository,
      mockRecipesPort,
      mockStandardsPort,
      mockSkillsPort,
      mockGitPort,
      mockCodingAgentPort,
      mockRenderModeConfigurationService,
      mockPackmindConfigService,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when package does not exist', () => {
    const command: RemovePackageFromTargetsCommand = {
      userId,
      organizationId,
      packageId,
      targetIds,
    };

    beforeEach(() => {
      mockPackageService.findById.mockResolvedValue(null);
    });

    it('throws PackageNotFoundError', async () => {
      await expect(useCase.execute(command)).rejects.toThrow(
        PackageNotFoundError,
      );
    });
  });

  describe('when package exists', () => {
    describe('when a target does not exist', () => {
      const command: RemovePackageFromTargetsCommand = {
        userId,
        organizationId,
        packageId,
        targetIds,
      };

      beforeEach(() => {
        mockPackageService.findById.mockResolvedValue(mockPackage);
        mockTargetService.findById.mockResolvedValue(null);
      });

      it('throws TargetNotFoundError', async () => {
        await expect(useCase.execute(command)).rejects.toThrow(
          TargetNotFoundError,
        );
      });
    });

    describe('when all targets exist', () => {
      const command: RemovePackageFromTargetsCommand = {
        userId,
        organizationId,
        packageId,
        targetIds,
      };

      beforeEach(() => {
        mockPackageService.findById.mockResolvedValue(mockPackage);
        mockTargetService.findById
          .mockResolvedValueOnce(mockTarget)
          .mockResolvedValueOnce(mockTarget2)
          .mockResolvedValueOnce(mockTarget)
          .mockResolvedValueOnce(mockTarget2);
        mockRenderModeConfigurationService.getActiveRenderModes.mockResolvedValue(
          [],
        );
        mockRenderModeConfigurationService.mapRenderModesToCodingAgents.mockReturnValue(
          [],
        );
        mockGitPort.getRepositoryById.mockResolvedValue(mockGitRepo);
        mockGitPort.getFileFromRepo.mockResolvedValue(null);
        mockCodingAgentPort.renderArtifacts.mockResolvedValue({
          createOrUpdate: [],
          delete: [],
        });
        mockPackmindConfigService.createRemovalConfigFileModification.mockReturnValue(
          {
            path: 'packmind.json',
            content: '{\n  "packages": {}\n}\n',
          },
        );
        mockGitPort.commitToGit.mockResolvedValue({
          id: createGitCommitId('commit-123'),
          sha: 'abc123',
          message: '[PACKMIND] Remove package: test-package',
          url: 'https://github.com/test-owner/test-repo/commit/abc123',
          author: 'test-user',
        });
      });

      describe('when no distributions exist for targets', () => {
        beforeEach(() => {
          mockDistributionRepository.listByTargetIds.mockResolvedValue([]);
        });

        it('returns results for all targets', async () => {
          const result = await useCase.execute(command);

          expect(result.results).toHaveLength(2);
        });

        it('returns success for first target', async () => {
          const result = await useCase.execute(command);

          expect(result.results[0].success).toBe(true);
        });

        it('returns success for second target', async () => {
          const result = await useCase.execute(command);

          expect(result.results[1].success).toBe(true);
        });

        it('returns artifact resolutions for all targets', async () => {
          const result = await useCase.execute(command);

          expect(result.artifactResolutions).toHaveLength(2);
        });

        it('returns empty exclusive recipe versions', async () => {
          const result = await useCase.execute(command);

          expect(
            result.artifactResolutions![0].exclusiveArtifacts.recipeVersionIds,
          ).toEqual([]);
        });

        it('returns empty exclusive standard versions', async () => {
          const result = await useCase.execute(command);

          expect(
            result.artifactResolutions![0].exclusiveArtifacts
              .standardVersionIds,
          ).toEqual([]);
        });

        it('returns empty exclusive skill versions', async () => {
          const result = await useCase.execute(command);

          expect(
            result.artifactResolutions![0].exclusiveArtifacts.skillVersionIds,
          ).toEqual([]);
        });

        it('creates distribution records for each target', async () => {
          await useCase.execute(command);

          expect(mockDistributionRepository.add).toHaveBeenCalledTimes(2);
        });

        it('commits changes to git once', async () => {
          await useCase.execute(command);

          expect(mockGitPort.commitToGit).toHaveBeenCalledTimes(1);
        });

        it('commits with correct message', async () => {
          await useCase.execute(command);

          expect(mockGitPort.commitToGit).toHaveBeenCalledWith(
            mockGitRepo,
            expect.any(Array),
            expect.stringContaining('[PACKMIND] Remove package: test-package'),
            expect.any(Array),
          );
        });

        describe('when there are files to delete', () => {
          const deleteFiles = [{ path: '.packmind/recipes/deleted-recipe.md' }];

          beforeEach(() => {
            mockCodingAgentPort.renderArtifacts.mockResolvedValue({
              createOrUpdate: [],
              delete: deleteFiles,
            });
          });

          it('passes delete files to commitToGit with target path prefix', async () => {
            await useCase.execute(command);

            // Note: The paths are prefixed with the target path (/src/) by applyTargetPrefixingToFileUpdates
            expect(mockGitPort.commitToGit).toHaveBeenCalledWith(
              mockGitRepo,
              expect.any(Array),
              expect.any(String),
              [{ path: 'src/.packmind/recipes/deleted-recipe.md' }],
            );
          });
        });

        describe('when there are no files to delete', () => {
          beforeEach(() => {
            mockCodingAgentPort.renderArtifacts.mockResolvedValue({
              createOrUpdate: [],
              delete: [],
            });
          });

          it('passes empty delete array to commitToGit', async () => {
            await useCase.execute(command);

            expect(mockGitPort.commitToGit).toHaveBeenCalledWith(
              mockGitRepo,
              expect.any(Array),
              expect.any(String),
              [],
            );
          });
        });

        it('removes package from packmind.json', async () => {
          await useCase.execute(command);

          expect(
            mockPackmindConfigService.createRemovalConfigFileModification,
          ).toHaveBeenCalledWith('test-package', {}, undefined);
        });
      });

      describe('when no changes are detected', () => {
        beforeEach(() => {
          mockDistributionRepository.listByTargetIds.mockResolvedValue([]);
          mockGitPort.commitToGit.mockRejectedValue(
            new Error('NO_CHANGES_DETECTED'),
          );
        });

        it('returns results for all targets', async () => {
          const result = await useCase.execute(command);

          expect(result.results).toHaveLength(2);
        });

        it('returns success for first target', async () => {
          const result = await useCase.execute(command);

          expect(result.results[0].success).toBe(true);
        });

        it('returns success for second target', async () => {
          const result = await useCase.execute(command);

          expect(result.results[1].success).toBe(true);
        });

        it('creates distribution records for each target', async () => {
          await useCase.execute(command);

          expect(mockDistributionRepository.add).toHaveBeenCalledTimes(2);
        });

        it('creates distribution with no_changes status', async () => {
          await useCase.execute(command);

          expect(mockDistributionRepository.add).toHaveBeenCalledWith(
            expect.objectContaining({
              status: DistributionStatus.no_changes,
            }),
          );
        });

        it('saves distributed package with remove operation', async () => {
          await useCase.execute(command);

          expect(mockDistributedPackageRepository.add).toHaveBeenCalledWith(
            expect.objectContaining({
              operation: 'remove',
              packageId,
            }),
          );
        });
      });

      describe('when git commit fails', () => {
        beforeEach(() => {
          mockDistributionRepository.listByTargetIds.mockResolvedValue([]);
          mockGitPort.commitToGit.mockRejectedValue(
            new Error('Git commit failed'),
          );
        });

        it('returns results for all targets', async () => {
          const result = await useCase.execute(command);

          expect(result.results).toHaveLength(2);
        });

        it('returns failure for first target', async () => {
          const result = await useCase.execute(command);

          expect(result.results[0].success).toBe(false);
        });

        it('returns error message for first target', async () => {
          const result = await useCase.execute(command);

          expect(result.results[0].error).toBe('Git commit failed');
        });

        it('returns failure for second target', async () => {
          const result = await useCase.execute(command);

          expect(result.results[1].success).toBe(false);
        });

        it('returns error message for second target', async () => {
          const result = await useCase.execute(command);

          expect(result.results[1].error).toBe('Git commit failed');
        });

        it('creates distribution records for each target', async () => {
          await useCase.execute(command);

          expect(mockDistributionRepository.add).toHaveBeenCalledTimes(2);
        });

        it('creates distribution with failure status and error message', async () => {
          await useCase.execute(command);

          expect(mockDistributionRepository.add).toHaveBeenCalledWith(
            expect.objectContaining({
              status: DistributionStatus.failure,
              error: 'Git commit failed',
            }),
          );
        });

        it('saves distributed package with remove operation on failure', async () => {
          await useCase.execute(command);

          expect(mockDistributedPackageRepository.add).toHaveBeenCalledWith(
            expect.objectContaining({
              operation: 'remove',
              packageId,
            }),
          );
        });
      });

      describe('artifact resolution', () => {
        const recipeVersionId1 = createRecipeVersionId('rv-1');
        const recipeVersionId2 = createRecipeVersionId('rv-2');
        const standardVersionId1 = createStandardVersionId('sv-1');
        const standardVersionId2 = createStandardVersionId('sv-2');
        const sharedRecipeVersionId = createRecipeVersionId('rv-shared');
        const sharedStandardVersionId = createStandardVersionId('sv-shared');

        describe('when package has exclusive artifacts', () => {
          beforeEach(() => {
            const distributedPackage: DistributedPackage = {
              id: createDistributedPackageId('dp-1'),
              distributionId: createDistributionId('dist-1'),
              packageId: packageId,
              recipeVersions: [
                {
                  id: recipeVersionId1,
                  recipeId: createRecipeId('recipe-1'),
                  name: 'Recipe 1',
                  slug: 'recipe-1',
                  content: 'content',
                  version: 1,
                  userId: null,
                },
              ],
              standardVersions: [
                {
                  id: standardVersionId1,
                  standardId: createStandardId('standard-1'),
                  name: 'Standard 1',
                  slug: 'standard-1',
                  description: 'description',
                  version: 1,
                  scope: null,
                },
              ],
              skillVersions: [],
              operation: 'add',
            };

            const distribution: Distribution = {
              id: createDistributionId('dist-1'),
              distributedPackages: [distributedPackage],
              createdAt: new Date().toISOString(),
              authorId: userId,
              organizationId,
              target: mockTarget,
              status: DistributionStatus.success,
              renderModes: [],
              source: 'app',
            };

            mockDistributionRepository.listByTargetIds.mockResolvedValue([
              distribution,
            ]);

            mockRecipesPort.getRecipeVersionById.mockResolvedValue({
              id: recipeVersionId1,
              recipeId: createRecipeId('recipe-1'),
              name: 'Recipe 1',
              slug: 'recipe-1',
              content: 'content',
              version: 1,
              userId: null,
            });

            mockStandardsPort.getStandardVersionById.mockResolvedValue({
              id: standardVersionId1,
              standardId: createStandardId('standard-1'),
              name: 'Standard 1',
              slug: 'standard-1',
              description: 'description',
              version: 1,
              scope: null,
              rules: [],
            });
          });

          it('includes exclusive recipe versions in exclusiveArtifacts', async () => {
            const result = await useCase.execute(command);

            expect(
              result.artifactResolutions![0].exclusiveArtifacts
                .recipeVersionIds,
            ).toEqual([recipeVersionId1]);
          });

          it('includes exclusive standard versions in exclusiveArtifacts', async () => {
            const result = await useCase.execute(command);

            expect(
              result.artifactResolutions![0].exclusiveArtifacts
                .standardVersionIds,
            ).toEqual([standardVersionId1]);
          });

          it('calls renderArtifacts with exclusive artifacts as removed', async () => {
            await useCase.execute(command);

            expect(mockCodingAgentPort.renderArtifacts).toHaveBeenCalledWith(
              expect.objectContaining({
                removed: {
                  recipeVersions: expect.arrayContaining([
                    expect.objectContaining({ id: recipeVersionId1 }),
                  ]),
                  standardVersions: expect.arrayContaining([
                    expect.objectContaining({ id: standardVersionId1 }),
                  ]),
                  skillVersions: [],
                },
              }),
            );
          });
        });

        describe('when artifacts are shared with another package', () => {
          beforeEach(() => {
            const removedPackageDistribution: DistributedPackage = {
              id: createDistributedPackageId('dp-1'),
              distributionId: createDistributionId('dist-1'),
              packageId: packageId,
              recipeVersions: [
                {
                  id: sharedRecipeVersionId,
                  recipeId: createRecipeId('recipe-shared'),
                  name: 'Shared Recipe',
                  slug: 'shared-recipe',
                  content: 'content',
                  version: 1,
                  userId: null,
                },
                {
                  id: recipeVersionId1,
                  recipeId: createRecipeId('recipe-1'),
                  name: 'Recipe 1',
                  slug: 'recipe-1',
                  content: 'content',
                  version: 1,
                  userId: null,
                },
              ],
              standardVersions: [
                {
                  id: sharedStandardVersionId,
                  standardId: createStandardId('standard-shared'),
                  name: 'Shared Standard',
                  slug: 'shared-standard',
                  description: 'description',
                  version: 1,
                  scope: null,
                },
                {
                  id: standardVersionId1,
                  standardId: createStandardId('standard-1'),
                  name: 'Standard 1',
                  slug: 'standard-1',
                  description: 'description',
                  version: 1,
                  scope: null,
                },
              ],
              skillVersions: [],
              operation: 'add',
            };

            const otherPackageDistribution: DistributedPackage = {
              id: createDistributedPackageId('dp-2'),
              distributionId: createDistributionId('dist-1'),
              packageId: otherPackageId,
              recipeVersions: [
                {
                  id: sharedRecipeVersionId,
                  recipeId: createRecipeId('recipe-shared'),
                  name: 'Shared Recipe',
                  slug: 'shared-recipe',
                  content: 'content',
                  version: 1,
                  userId: null,
                },
                {
                  id: recipeVersionId2,
                  recipeId: createRecipeId('recipe-2'),
                  name: 'Recipe 2',
                  slug: 'recipe-2',
                  content: 'content',
                  version: 1,
                  userId: null,
                },
              ],
              standardVersions: [
                {
                  id: sharedStandardVersionId,
                  standardId: createStandardId('standard-shared'),
                  name: 'Shared Standard',
                  slug: 'shared-standard',
                  description: 'description',
                  version: 1,
                  scope: null,
                },
                {
                  id: standardVersionId2,
                  standardId: createStandardId('standard-2'),
                  name: 'Standard 2',
                  slug: 'standard-2',
                  description: 'description',
                  version: 1,
                  scope: null,
                },
              ],
              skillVersions: [],
              operation: 'add',
            };

            const distribution: Distribution = {
              id: createDistributionId('dist-1'),
              distributedPackages: [
                removedPackageDistribution,
                otherPackageDistribution,
              ],
              createdAt: new Date().toISOString(),
              authorId: userId,
              organizationId,
              target: mockTarget,
              status: DistributionStatus.success,
              renderModes: [],
              source: 'app',
            };

            mockDistributionRepository.listByTargetIds.mockResolvedValue([
              distribution,
            ]);

            mockRecipesPort.getRecipeVersionById.mockImplementation(
              async (id) => {
                if (id === recipeVersionId1) {
                  return {
                    id: recipeVersionId1,
                    recipeId: createRecipeId('recipe-1'),
                    name: 'Recipe 1',
                    slug: 'recipe-1',
                    content: 'content',
                    version: 1,
                    userId: null,
                  };
                }
                if (id === sharedRecipeVersionId) {
                  return {
                    id: sharedRecipeVersionId,
                    recipeId: createRecipeId('recipe-shared'),
                    name: 'Shared Recipe',
                    slug: 'shared-recipe',
                    content: 'content',
                    version: 1,
                    userId: null,
                  };
                }
                if (id === recipeVersionId2) {
                  return {
                    id: recipeVersionId2,
                    recipeId: createRecipeId('recipe-2'),
                    name: 'Recipe 2',
                    slug: 'recipe-2',
                    content: 'content',
                    version: 1,
                    userId: null,
                  };
                }
                return null;
              },
            );

            mockStandardsPort.getStandardVersionById.mockImplementation(
              async (id) => {
                if (id === standardVersionId1) {
                  return {
                    id: standardVersionId1,
                    standardId: createStandardId('standard-1'),
                    name: 'Standard 1',
                    slug: 'standard-1',
                    description: 'description',
                    version: 1,
                    scope: null,
                    rules: [],
                  };
                }
                if (id === sharedStandardVersionId) {
                  return {
                    id: sharedStandardVersionId,
                    standardId: createStandardId('standard-shared'),
                    name: 'Shared Standard',
                    slug: 'shared-standard',
                    description: 'description',
                    version: 1,
                    scope: null,
                    rules: [],
                  };
                }
                if (id === standardVersionId2) {
                  return {
                    id: standardVersionId2,
                    standardId: createStandardId('standard-2'),
                    name: 'Standard 2',
                    slug: 'standard-2',
                    description: 'description',
                    version: 1,
                    scope: null,
                    rules: [],
                  };
                }
                return null;
              },
            );
          });

          it('includes only exclusive recipe versions in exclusiveArtifacts', async () => {
            const result = await useCase.execute(command);

            expect(
              result.artifactResolutions![0].exclusiveArtifacts
                .recipeVersionIds,
            ).toEqual([recipeVersionId1]);
          });

          it('excludes shared recipe versions from exclusiveArtifacts', async () => {
            const result = await useCase.execute(command);

            expect(
              result.artifactResolutions![0].exclusiveArtifacts
                .recipeVersionIds,
            ).not.toContain(sharedRecipeVersionId);
          });

          it('includes only exclusive standard versions in exclusiveArtifacts', async () => {
            const result = await useCase.execute(command);

            expect(
              result.artifactResolutions![0].exclusiveArtifacts
                .standardVersionIds,
            ).toEqual([standardVersionId1]);
          });

          it('excludes shared standard versions from exclusiveArtifacts', async () => {
            const result = await useCase.execute(command);

            expect(
              result.artifactResolutions![0].exclusiveArtifacts
                .standardVersionIds,
            ).not.toContain(sharedStandardVersionId);
          });

          it('includes shared recipes in remainingArtifacts', async () => {
            const result = await useCase.execute(command);

            expect(
              result.artifactResolutions![0].remainingArtifacts
                .recipeVersionIds,
            ).toContain(sharedRecipeVersionId);
          });

          it('includes shared standards in remainingArtifacts', async () => {
            const result = await useCase.execute(command);

            expect(
              result.artifactResolutions![0].remainingArtifacts
                .standardVersionIds,
            ).toContain(sharedStandardVersionId);
          });

          it('includes other package recipes in remainingArtifacts', async () => {
            const result = await useCase.execute(command);

            expect(
              result.artifactResolutions![0].remainingArtifacts
                .recipeVersionIds,
            ).toContain(recipeVersionId2);
          });

          it('includes other package standards in remainingArtifacts', async () => {
            const result = await useCase.execute(command);

            expect(
              result.artifactResolutions![0].remainingArtifacts
                .standardVersionIds,
            ).toContain(standardVersionId2);
          });
        });

        describe('when all artifacts are shared', () => {
          beforeEach(() => {
            const removedPackageDistribution: DistributedPackage = {
              id: createDistributedPackageId('dp-1'),
              distributionId: createDistributionId('dist-1'),
              packageId: packageId,
              recipeVersions: [
                {
                  id: sharedRecipeVersionId,
                  recipeId: createRecipeId('recipe-shared'),
                  name: 'Shared Recipe',
                  slug: 'shared-recipe',
                  content: 'content',
                  version: 1,
                  userId: null,
                },
              ],
              standardVersions: [
                {
                  id: sharedStandardVersionId,
                  standardId: createStandardId('standard-shared'),
                  name: 'Shared Standard',
                  slug: 'shared-standard',
                  description: 'description',
                  version: 1,
                  scope: null,
                },
              ],
              skillVersions: [],
              operation: 'add',
            };

            const otherPackageDistribution: DistributedPackage = {
              id: createDistributedPackageId('dp-2'),
              distributionId: createDistributionId('dist-1'),
              packageId: otherPackageId,
              recipeVersions: [
                {
                  id: sharedRecipeVersionId,
                  recipeId: createRecipeId('recipe-shared'),
                  name: 'Shared Recipe',
                  slug: 'shared-recipe',
                  content: 'content',
                  version: 1,
                  userId: null,
                },
              ],
              standardVersions: [
                {
                  id: sharedStandardVersionId,
                  standardId: createStandardId('standard-shared'),
                  name: 'Shared Standard',
                  slug: 'shared-standard',
                  description: 'description',
                  version: 1,
                  scope: null,
                },
              ],
              skillVersions: [],
              operation: 'add',
            };

            const distribution: Distribution = {
              id: createDistributionId('dist-1'),
              distributedPackages: [
                removedPackageDistribution,
                otherPackageDistribution,
              ],
              createdAt: new Date().toISOString(),
              authorId: userId,
              organizationId,
              target: mockTarget,
              status: DistributionStatus.success,
              renderModes: [],
              source: 'app',
            };

            mockDistributionRepository.listByTargetIds.mockResolvedValue([
              distribution,
            ]);

            mockRecipesPort.getRecipeVersionById.mockResolvedValue({
              id: sharedRecipeVersionId,
              recipeId: createRecipeId('recipe-shared'),
              name: 'Shared Recipe',
              slug: 'shared-recipe',
              content: 'content',
              version: 1,
              userId: null,
            });

            mockStandardsPort.getStandardVersionById.mockResolvedValue({
              id: sharedStandardVersionId,
              standardId: createStandardId('standard-shared'),
              name: 'Shared Standard',
              slug: 'shared-standard',
              description: 'description',
              version: 1,
              scope: null,
              rules: [],
            });
          });

          it('returns empty exclusive recipe versions', async () => {
            const result = await useCase.execute(command);

            expect(
              result.artifactResolutions![0].exclusiveArtifacts
                .recipeVersionIds,
            ).toEqual([]);
          });

          it('returns empty exclusive standard versions', async () => {
            const result = await useCase.execute(command);

            expect(
              result.artifactResolutions![0].exclusiveArtifacts
                .standardVersionIds,
            ).toEqual([]);
          });
        });

        describe('with multiple distributions', () => {
          beforeEach(() => {
            const dist1RemovedPackage: DistributedPackage = {
              id: createDistributedPackageId('dp-1'),
              distributionId: createDistributionId('dist-1'),
              packageId: packageId,
              recipeVersions: [
                {
                  id: recipeVersionId1,
                  recipeId: createRecipeId('recipe-1'),
                  name: 'Recipe 1',
                  slug: 'recipe-1',
                  content: 'content',
                  version: 1,
                  userId: null,
                },
              ],
              standardVersions: [],
              skillVersions: [],
              operation: 'add',
            };

            const dist2OtherPackage: DistributedPackage = {
              id: createDistributedPackageId('dp-2'),
              distributionId: createDistributionId('dist-2'),
              packageId: otherPackageId,
              recipeVersions: [
                {
                  id: recipeVersionId1,
                  recipeId: createRecipeId('recipe-1'),
                  name: 'Recipe 1',
                  slug: 'recipe-1',
                  content: 'content',
                  version: 1,
                  userId: null,
                },
              ],
              standardVersions: [],
              skillVersions: [],
              operation: 'add',
            };

            const distribution1: Distribution = {
              id: createDistributionId('dist-1'),
              distributedPackages: [dist1RemovedPackage],
              createdAt: new Date().toISOString(),
              authorId: userId,
              organizationId,
              target: mockTarget,
              status: DistributionStatus.success,
              renderModes: [],
              source: 'app',
            };

            const distribution2: Distribution = {
              id: createDistributionId('dist-2'),
              distributedPackages: [dist2OtherPackage],
              createdAt: new Date().toISOString(),
              authorId: userId,
              organizationId,
              target: mockTarget,
              status: DistributionStatus.success,
              renderModes: [],
              source: 'app',
            };

            mockDistributionRepository.listByTargetIds.mockResolvedValue([
              distribution1,
              distribution2,
            ]);

            mockRecipesPort.getRecipeVersionById.mockResolvedValue({
              id: recipeVersionId1,
              recipeId: createRecipeId('recipe-1'),
              name: 'Recipe 1',
              slug: 'recipe-1',
              content: 'content',
              version: 1,
              userId: null,
            });
          });

          it('considers artifacts from all distributions for exclusivity computation', async () => {
            const result = await useCase.execute(command);

            expect(
              result.artifactResolutions![0].exclusiveArtifacts
                .recipeVersionIds,
            ).toEqual([]);
          });
        });

        describe('when a package was previously removed', () => {
          const packageBId = createPackageId('package-b');
          const packageBRecipeVersionId = createRecipeVersionId('rv-pkg-b');
          const packageBStandardVersionId = createStandardVersionId('sv-pkg-b');

          beforeEach(() => {
            // Distribution 1: Package B was added
            const packageBAddedDistribution: DistributedPackage = {
              id: createDistributedPackageId('dp-pkg-b-add'),
              distributionId: createDistributionId('dist-add'),
              packageId: packageBId,
              recipeVersions: [
                {
                  id: packageBRecipeVersionId,
                  recipeId: createRecipeId('recipe-pkg-b'),
                  name: 'Package B Recipe',
                  slug: 'package-b-recipe',
                  content: 'content',
                  version: 1,
                  userId: null,
                },
              ],
              standardVersions: [
                {
                  id: packageBStandardVersionId,
                  standardId: createStandardId('standard-pkg-b'),
                  name: 'Package B Standard',
                  slug: 'package-b-standard',
                  description: 'description',
                  version: 1,
                  scope: null,
                },
              ],
              skillVersions: [],
              operation: 'add',
            };

            const addDistribution: Distribution = {
              id: createDistributionId('dist-add'),
              distributedPackages: [packageBAddedDistribution],
              createdAt: new Date('2024-01-01').toISOString(),
              authorId: userId,
              organizationId,
              target: mockTarget,
              status: DistributionStatus.success,
              renderModes: [],
              source: 'app',
            };

            // Distribution 2: Package B was removed (newer distribution)
            // The remove distribution includes the package reference to track which package was removed
            const packageBRemovedDistribution: DistributedPackage = {
              id: createDistributedPackageId('dp-pkg-b-remove'),
              distributionId: createDistributionId('dist-remove'),
              packageId: packageBId,
              recipeVersions: [
                {
                  id: packageBRecipeVersionId,
                  recipeId: createRecipeId('recipe-pkg-b'),
                  name: 'Package B Recipe',
                  slug: 'package-b-recipe',
                  content: 'content',
                  version: 1,
                  userId: null,
                },
              ],
              standardVersions: [
                {
                  id: packageBStandardVersionId,
                  standardId: createStandardId('standard-pkg-b'),
                  name: 'Package B Standard',
                  slug: 'package-b-standard',
                  description: 'description',
                  version: 1,
                  scope: null,
                },
              ],
              skillVersions: [],
              operation: 'remove',
            };

            const removeDistribution: Distribution = {
              id: createDistributionId('dist-remove'),
              distributedPackages: [packageBRemovedDistribution],
              createdAt: new Date('2024-01-02').toISOString(),
              authorId: userId,
              organizationId,
              target: mockTarget,
              status: DistributionStatus.success,
              renderModes: [],
              source: 'app',
            };

            mockDistributionRepository.listByTargetIds.mockResolvedValue([
              addDistribution,
              removeDistribution,
            ]);
          });

          it('excludes removed package artifacts from remainingArtifacts', async () => {
            const result = await useCase.execute(command);

            expect(
              result.artifactResolutions![0].remainingArtifacts
                .recipeVersionIds,
            ).not.toContain(packageBRecipeVersionId);
          });

          it('excludes removed package standard artifacts from remainingArtifacts', async () => {
            const result = await useCase.execute(command);

            expect(
              result.artifactResolutions![0].remainingArtifacts
                .standardVersionIds,
            ).not.toContain(packageBStandardVersionId);
          });
        });

        describe('when package has exclusive skill versions', () => {
          const skillVersionId1 = createSkillVersionId('skv-1');

          beforeEach(() => {
            const distributedPackage: DistributedPackage = {
              id: createDistributedPackageId('dp-1'),
              distributionId: createDistributionId('dist-1'),
              packageId: packageId,
              recipeVersions: [],
              standardVersions: [],
              skillVersions: [
                {
                  id: skillVersionId1,
                  skillId: createSkillId('skill-1'),
                  name: 'Skill 1',
                  slug: 'skill-1',
                  description: 'description',
                  prompt: 'prompt',
                  version: 1,
                  userId: userId,
                },
              ],
              operation: 'add',
            };

            const distribution: Distribution = {
              id: createDistributionId('dist-1'),
              distributedPackages: [distributedPackage],
              createdAt: new Date().toISOString(),
              authorId: userId,
              organizationId,
              target: mockTarget,
              status: DistributionStatus.success,
              renderModes: [],
              source: 'app',
            };

            mockDistributionRepository.listByTargetIds.mockResolvedValue([
              distribution,
            ]);

            mockSkillsPort.getSkillVersion.mockResolvedValue({
              id: skillVersionId1,
              skillId: createSkillId('skill-1'),
              name: 'Skill 1',
              slug: 'skill-1',
              description: 'description',
              prompt: 'prompt',
              version: 1,
              userId: userId,
            });
          });

          it('includes exclusive skill versions in exclusiveArtifacts', async () => {
            const result = await useCase.execute(command);

            expect(
              result.artifactResolutions![0].exclusiveArtifacts.skillVersionIds,
            ).toEqual([skillVersionId1]);
          });

          it('calls renderArtifacts with exclusive skills as removed', async () => {
            await useCase.execute(command);

            expect(mockCodingAgentPort.renderArtifacts).toHaveBeenCalledWith(
              expect.objectContaining({
                removed: expect.objectContaining({
                  skillVersions: expect.arrayContaining([
                    expect.objectContaining({ id: skillVersionId1 }),
                  ]),
                }),
              }),
            );
          });

          it('links skill versions to distributed package via addSkillVersions', async () => {
            await useCase.execute(command);

            expect(
              mockDistributedPackageRepository.addSkillVersions,
            ).toHaveBeenCalledWith(expect.any(String), [skillVersionId1]);
          });
        });
      });
    });
  });

  describe('resolveArtifactsForTargets', () => {
    beforeEach(() => {
      mockDistributionRepository.listByTargetIds.mockResolvedValue([]);
    });

    it('returns resolutions for all targets', async () => {
      const resolutions = await useCase.resolveArtifactsForTargets(
        organizationId,
        targetIds,
        mockPackage,
      );

      expect(resolutions).toHaveLength(2);
    });

    it('returns correct targetId for first resolution', async () => {
      const resolutions = await useCase.resolveArtifactsForTargets(
        organizationId,
        targetIds,
        mockPackage,
      );

      expect(resolutions[0].targetId).toEqual(targetIds[0]);
    });

    it('returns correct targetId for second resolution', async () => {
      const resolutions = await useCase.resolveArtifactsForTargets(
        organizationId,
        targetIds,
        mockPackage,
      );

      expect(resolutions[1].targetId).toEqual(targetIds[1]);
    });

    it('calls distributionRepository for each target', async () => {
      await useCase.resolveArtifactsForTargets(
        organizationId,
        targetIds,
        mockPackage,
      );

      expect(mockDistributionRepository.listByTargetIds).toHaveBeenCalledTimes(
        2,
      );
    });

    it('calls distributionRepository with first targetId', async () => {
      await useCase.resolveArtifactsForTargets(
        organizationId,
        targetIds,
        mockPackage,
      );

      expect(mockDistributionRepository.listByTargetIds).toHaveBeenCalledWith(
        organizationId,
        [targetIds[0]],
      );
    });

    it('calls distributionRepository with second targetId', async () => {
      await useCase.resolveArtifactsForTargets(
        organizationId,
        targetIds,
        mockPackage,
      );

      expect(mockDistributionRepository.listByTargetIds).toHaveBeenCalledWith(
        organizationId,
        [targetIds[1]],
      );
    });
  });
});
