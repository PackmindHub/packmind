import { PackmindLogger } from '@packmind/logger';
import { SpaceMembershipRequiredError } from '@packmind/node-utils';
import { mockInterface, stubLogger } from '@packmind/test-utils';
import {
  createGitRepoId,
  createOrganizationId,
  createPackageId,
  createCommandId,
  createSkillId,
  createSpaceId,
  createStandardId,
  createTargetId,
  createUserId,
  DistributionStatus,
  GitRepo,
  IAccountsPort,
  IGitPort,
  ICommandsPort,
  ISkillsPort,
  ISpacesPort,
  IStandardsPort,
  ListActiveDistributedPackagesBySpaceCommand,
  Package,
  PackageId,
  Command,
  Skill,
  Standard,
  StandardId,
  Target,
  TargetId,
  UserSpaceRole,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import {
  ActivePackageOperationRow,
  IDistributionRepository,
} from '../../domain/repositories/IDistributionRepository';
import { IPackageRepository } from '../../domain/repositories/IPackageRepository';
import { ITargetRepository } from '../../domain/repositories/ITargetRepository';
import { PackageReleaseService } from '../services/PackageReleaseService';
import { ListActiveDistributedPackagesBySpaceUseCase } from './ListActiveDistributedPackagesBySpaceUseCase';

describe('ListActiveDistributedPackagesBySpaceUseCase', () => {
  let useCase: ListActiveDistributedPackagesBySpaceUseCase;
  let mockAccountsPort: jest.Mocked<IAccountsPort>;
  let mockSpacesPort: jest.Mocked<ISpacesPort>;
  let distributionRepository: jest.Mocked<
    Pick<
      IDistributionRepository,
      'findActivePackageOperationsBySpace' | 'findOutdatedDeploymentsBySpace'
    >
  >;
  let packageRepository: jest.Mocked<Pick<IPackageRepository, 'findBySpaceId'>>;
  let targetRepository: jest.Mocked<
    Pick<ITargetRepository, 'findActiveInSpace'>
  >;
  let standardsPort: jest.Mocked<
    Pick<IStandardsPort, 'listStandardsBySpace' | 'getLatestStandardVersions'>
  >;
  let commandsPort: jest.Mocked<
    Pick<ICommandsPort, 'listCommandsBySpace' | 'getLatestCommandVersions'>
  >;
  let skillsPort: jest.Mocked<
    Pick<ISkillsPort, 'listSkillsBySpace' | 'getLatestSkillVersions'>
  >;
  let gitPort: jest.Mocked<Pick<IGitPort, 'getOrganizationRepositories'>>;
  let packageReleaseService: jest.Mocked<
    Pick<PackageReleaseService, 'findLatestByPackageIds'>
  >;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  const userId = createUserId(uuidv4());
  const organizationId = createOrganizationId(uuidv4());
  const spaceId = createSpaceId(uuidv4());
  const gitRepoId = createGitRepoId(uuidv4());

  const buildUser = () => ({
    id: userId,
    email: 'test@example.com',
    displayName: null,
    passwordHash: 'hash',
    active: true,
    memberships: [
      {
        userId,
        organizationId,
        role: 'member' as const,
      },
    ],
  });

  const buildOrganization = () => ({
    id: organizationId,
    name: 'Test Organization',
    slug: 'test-org',
  });

  const command: ListActiveDistributedPackagesBySpaceCommand = {
    userId,
    organizationId,
    spaceId,
  };

  const lastDistributedAt = '2026-04-30T10:00:00.000Z';

  const activeRow = (
    targetId: TargetId,
    packageId: PackageId,
    status: DistributionStatus,
    lastDistributionError: string | null = null,
    versionSpec: string | null = null,
  ): ActivePackageOperationRow => ({
    targetId,
    packageId,
    lastDistributionStatus: status,
    lastDistributedAt,
    lastDistributionError,
    versionSpec,
  });

  const buildTarget = (id: TargetId): Target => ({
    id,
    name: `target-${id}`,
    path: '',
    gitRepoId,
  });

  const buildPackage = (overrides?: Partial<Package>): Package => ({
    id: createPackageId(uuidv4()),
    name: 'pkg',
    slug: 'pkg',
    description: '',
    spaceId,
    createdBy: userId,
    recipes: [],
    standards: [],
    skills: [],
    ...overrides,
  });

  const gitRepo: GitRepo = {
    id: gitRepoId,
    owner: 'org',
    repo: 'repo',
    branch: 'main',
    organizationId,
    providerId: createGitRepoId(uuidv4()) as unknown as never,
  } as unknown as GitRepo;

  beforeEach(() => {
    mockAccountsPort = mockInterface<IAccountsPort>();
    mockAccountsPort.getUserById.mockResolvedValue(buildUser());
    mockAccountsPort.getOrganizationById.mockResolvedValue(buildOrganization());

    mockSpacesPort = mockInterface<ISpacesPort>();
    mockSpacesPort.findMembership.mockResolvedValue({
      userId,
      spaceId,
      role: UserSpaceRole.MEMBER,
      pinned: false,
      createdBy: userId,
      updatedBy: userId,
    });

    distributionRepository = {
      findActivePackageOperationsBySpace: jest.fn().mockResolvedValue([]),
      findOutdatedDeploymentsBySpace: jest.fn().mockResolvedValue([]),
    };

    packageRepository = {
      findBySpaceId: jest.fn().mockResolvedValue([]),
    };

    targetRepository = {
      findActiveInSpace: jest.fn().mockResolvedValue([]),
    };

    standardsPort = {
      listStandardsBySpace: jest.fn().mockResolvedValue([]),
      getLatestStandardVersions: jest.fn().mockResolvedValue([]),
    };

    commandsPort = {
      listCommandsBySpace: jest.fn().mockResolvedValue([]),
      getLatestCommandVersions: jest.fn().mockResolvedValue([]),
    };

    skillsPort = {
      listSkillsBySpace: jest.fn().mockResolvedValue([]),
      getLatestSkillVersions: jest.fn().mockResolvedValue([]),
    };

    gitPort = {
      getOrganizationRepositories: jest.fn().mockResolvedValue([gitRepo]),
    };

    packageReleaseService = {
      findLatestByPackageIds: jest.fn().mockResolvedValue(new Map()),
    };

    stubbedLogger = stubLogger();

    useCase = new ListActiveDistributedPackagesBySpaceUseCase(
      mockSpacesPort,
      mockAccountsPort,
      distributionRepository as unknown as IDistributionRepository,
      packageRepository as unknown as IPackageRepository,
      targetRepository as unknown as ITargetRepository,
      standardsPort as unknown as IStandardsPort,
      commandsPort as unknown as ICommandsPort,
      skillsPort as unknown as ISkillsPort,
      gitPort as unknown as IGitPort,
      packageReleaseService as unknown as PackageReleaseService,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    describe('when the user is not a member of the space', () => {
      it('throws a SpaceMembershipRequiredError', async () => {
        mockSpacesPort.findMembership.mockResolvedValue(null);

        await expect(useCase.execute(command)).rejects.toThrow(
          SpaceMembershipRequiredError,
        );
      });
    });

    it('returns an active package with empty deployed and pending lists', async () => {
      const targetId = createTargetId(uuidv4());
      const pkg = buildPackage();

      distributionRepository.findActivePackageOperationsBySpace.mockResolvedValue(
        [activeRow(targetId, pkg.id, DistributionStatus.success)],
      );
      targetRepository.findActiveInSpace.mockResolvedValue([
        buildTarget(targetId),
      ]);
      packageRepository.findBySpaceId.mockResolvedValue([pkg]);

      const result = await useCase.execute(command);

      expect(result).toEqual([
        {
          targetId,
          target: buildTarget(targetId),
          gitRepo,
          packages: [
            {
              packageId: pkg.id,
              package: pkg,
              lastDistributionStatus: DistributionStatus.success,
              lastDistributedAt,
              lastDistributionError: null,
              versionSpec: null,
              latestReleaseVersion: null,
              hasUnreleasedChanges: false,
              deployedRecipes: [],
              deployedCommands: [],
              deployedStandards: [],
              deployedSkills: [],
              pendingRecipes: [],
              pendingCommands: [],
              pendingStandards: [],
              pendingSkills: [],
            },
          ],
        },
      ]);
    });

    describe('surfaces failed-but-active distributions returned by the repository', () => {
      let result: Awaited<ReturnType<typeof useCase.execute>>;
      let targetId: TargetId;
      let pkg: Package;

      beforeEach(async () => {
        targetId = createTargetId(uuidv4());
        pkg = buildPackage();

        distributionRepository.findActivePackageOperationsBySpace.mockResolvedValue(
          [activeRow(targetId, pkg.id, DistributionStatus.failure)],
        );
        targetRepository.findActiveInSpace.mockResolvedValue([
          buildTarget(targetId),
        ]);
        packageRepository.findBySpaceId.mockResolvedValue([pkg]);

        result = await useCase.execute(command);
      });

      it('returns one target entry', () => {
        expect(result).toHaveLength(1);
      });

      it('returns one package entry for that target', () => {
        expect(result[0].packages).toHaveLength(1);
      });

      it('marks the package distribution status as failure', () => {
        expect(result[0].packages[0].lastDistributionStatus).toBe(
          DistributionStatus.failure,
        );
      });
    });

    describe('the message behind a failed distribution', () => {
      let result: Awaited<ReturnType<typeof useCase.execute>>;

      beforeEach(async () => {
        const targetId = createTargetId(uuidv4());
        const pkg = buildPackage();

        distributionRepository.findActivePackageOperationsBySpace.mockResolvedValue(
          [
            activeRow(
              targetId,
              pkg.id,
              DistributionStatus.failure,
              'Push rejected: branch protection requires a pull request',
            ),
          ],
        );
        targetRepository.findActiveInSpace.mockResolvedValue([
          buildTarget(targetId),
        ]);
        packageRepository.findBySpaceId.mockResolvedValue([pkg]);

        result = await useCase.execute(command);
      });

      it('reaches the caller beside the status it explains', () => {
        expect(result[0].packages[0].lastDistributionError).toBe(
          'Push rejected: branch protection requires a pull request',
        );
      });
    });

    describe('the version spec a destination was left on', () => {
      let result: Awaited<ReturnType<typeof useCase.execute>>;

      const listWithSpec = async (versionSpec: string | null) => {
        const targetId = createTargetId(uuidv4());
        const pkg = buildPackage();

        distributionRepository.findActivePackageOperationsBySpace.mockResolvedValue(
          [
            activeRow(
              targetId,
              pkg.id,
              DistributionStatus.success,
              null,
              versionSpec,
            ),
          ],
        );
        targetRepository.findActiveInSpace.mockResolvedValue([
          buildTarget(targetId),
        ]);
        packageRepository.findBySpaceId.mockResolvedValue([pkg]);

        return useCase.execute(command);
      };

      describe('when the destination is pinned to a release', () => {
        beforeEach(async () => {
          result = await listWithSpec('0.1.0');
        });

        it('reports the release it is pinned to', () => {
          expect(result[0].packages[0].versionSpec).toBe('0.1.0');
        });
      });

      describe('when the destination tracks the live package', () => {
        beforeEach(async () => {
          result = await listWithSpec('*');
        });

        it('reports the wildcard', () => {
          expect(result[0].packages[0].versionSpec).toBe('*');
        });
      });

      describe('when the distribution recorded no spec', () => {
        beforeEach(async () => {
          result = await listWithSpec(null);
        });

        it('reports none, rather than inventing the wildcard', () => {
          expect(result[0].packages[0].versionSpec).toBeNull();
        });
      });
    });

    describe('where a package stands against its own newest release', () => {
      const standardId = createStandardId(uuidv4());
      const LIVE_STANDARD_VERSION = 2;

      let pkg: Package;

      const buildStandard = (id: StandardId, version: number): Standard =>
        ({
          id,
          name: 'std',
          slug: 'std',
          description: '',
          version,
          userId,
          scope: null,
          spaceId,
        }) as Standard;

      const releaseOf = (version: string, pinnedStandardVersion: number) => ({
        id: 'release-1',
        packageId: pkg.id,
        version,
        name: pkg.name,
        description: pkg.description,
        recipeVersions: [],
        standardVersions: [
          {
            id: `sv-${pinnedStandardVersion}`,
            standardId,
            name: 'std',
            version: pinnedStandardVersion,
          },
        ],
        skillVersions: [],
      });

      /** Pinned, since release state is read for pinned destinations only. */
      const list = async () => {
        const targetId = createTargetId(uuidv4());

        distributionRepository.findActivePackageOperationsBySpace.mockResolvedValue(
          [
            activeRow(
              targetId,
              pkg.id,
              DistributionStatus.success,
              null,
              '0.1.0',
            ),
          ],
        );
        targetRepository.findActiveInSpace.mockResolvedValue([
          buildTarget(targetId),
        ]);
        packageRepository.findBySpaceId.mockResolvedValue([pkg]);

        const result = await useCase.execute(command);
        return result[0].packages[0];
      };

      /*
       * The live version comes off the space read, not from a second lookup by
       * id: that read already carries every component's version number, which
       * is the whole reason the gate compares numbers.
       */
      beforeEach(() => {
        pkg = buildPackage({ standards: [standardId] });

        standardsPort.listStandardsBySpace.mockResolvedValue([
          buildStandard(standardId, LIVE_STANDARD_VERSION),
        ] as never);
      });

      describe('when the package matches its newest release', () => {
        beforeEach(() => {
          packageReleaseService.findLatestByPackageIds.mockResolvedValue(
            new Map([
              [pkg.id, releaseOf('0.2.0', LIVE_STANDARD_VERSION)],
            ]) as never,
          );
        });

        it('names the release it is on', async () => {
          expect((await list()).latestReleaseVersion).toBe('0.2.0');
        });

        it('reports nothing unreleased', async () => {
          expect((await list()).hasUnreleasedChanges).toBe(false);
        });
      });

      describe('when a component has moved on since the newest release', () => {
        beforeEach(() => {
          packageReleaseService.findLatestByPackageIds.mockResolvedValue(
            new Map([
              [pkg.id, releaseOf('0.2.0', LIVE_STANDARD_VERSION - 1)],
            ]) as never,
          );
        });

        it('reports unreleased changes', async () => {
          expect((await list()).hasUnreleasedChanges).toBe(true);
        });
      });

      describe('when the package has never been released', () => {
        beforeEach(() => {
          packageReleaseService.findLatestByPackageIds.mockResolvedValue(
            new Map(),
          );
        });

        it('names no release', async () => {
          expect((await list()).latestReleaseVersion).toBeNull();
        });

        it('reports its whole content as unreleased', async () => {
          expect((await list()).hasUnreleasedChanges).toBe(true);
        });
      });

      describe('when the package holds no component at all', () => {
        beforeEach(() => {
          pkg = buildPackage();
          packageReleaseService.findLatestByPackageIds.mockResolvedValue(
            new Map(),
          );
        });

        it('reports nothing to release', async () => {
          expect((await list()).hasUnreleasedChanges).toBe(false);
        });
      });

      describe('and no destination is pinned', () => {
        const unpinnedList = async (versionSpec: string | null) => {
          const targetId = createTargetId(uuidv4());

          distributionRepository.findActivePackageOperationsBySpace.mockResolvedValue(
            [
              activeRow(
                targetId,
                pkg.id,
                DistributionStatus.success,
                null,
                versionSpec,
              ),
            ],
          );
          targetRepository.findActiveInSpace.mockResolvedValue([
            buildTarget(targetId),
          ]);
          packageRepository.findBySpaceId.mockResolvedValue([pkg]);

          await useCase.execute(command);
        };

        it('reads no release state for a wildcard destination', async () => {
          await unpinnedList('*');

          expect(
            packageReleaseService.findLatestByPackageIds,
          ).not.toHaveBeenCalled();
        });

        it('reads no release state for a destination that recorded no spec', async () => {
          await unpinnedList(null);

          expect(
            packageReleaseService.findLatestByPackageIds,
          ).not.toHaveBeenCalled();
        });
      });

      describe('and the space holds packages nobody pins', () => {
        it('reads the release state of only the pinned ones', async () => {
          const undistributed = buildPackage();
          const targetId = createTargetId(uuidv4());

          packageReleaseService.findLatestByPackageIds.mockResolvedValue(
            new Map(),
          );
          distributionRepository.findActivePackageOperationsBySpace.mockResolvedValue(
            [
              activeRow(
                targetId,
                pkg.id,
                DistributionStatus.success,
                null,
                '0.1.0',
              ),
            ],
          );
          targetRepository.findActiveInSpace.mockResolvedValue([
            buildTarget(targetId),
          ]);
          packageRepository.findBySpaceId.mockResolvedValue([
            pkg,
            undistributed,
          ]);

          await useCase.execute(command);

          expect(
            packageReleaseService.findLatestByPackageIds,
          ).toHaveBeenCalledWith([pkg.id]);
        });
      });
    });

    describe('issues all reads against the requested space and organization', () => {
      beforeEach(async () => {
        await useCase.execute(command);
      });

      it('queries active package operations by space', () => {
        expect(
          distributionRepository.findActivePackageOperationsBySpace,
        ).toHaveBeenCalledWith(spaceId);
      });

      it('queries outdated deployments by organization and space', () => {
        expect(
          distributionRepository.findOutdatedDeploymentsBySpace,
        ).toHaveBeenCalledWith(organizationId, spaceId);
      });

      it('queries active targets by organization and space', () => {
        expect(targetRepository.findActiveInSpace).toHaveBeenCalledWith(
          organizationId,
          spaceId,
        );
      });

      it('queries packages by space', () => {
        expect(packageRepository.findBySpaceId).toHaveBeenCalledWith(spaceId);
      });
    });

    describe('when no active operation exists', () => {
      it('returns the target with empty packages', async () => {
        const targetId = createTargetId(uuidv4());

        targetRepository.findActiveInSpace.mockResolvedValue([
          buildTarget(targetId),
        ]);
        distributionRepository.findOutdatedDeploymentsBySpace.mockResolvedValue(
          [
            {
              targetId,
              targetName: `target-${targetId}`,
              gitRepoId,
              standards: [],
              recipes: [],
              skills: [],
            },
          ],
        );

        const result = await useCase.execute(command);

        expect(result).toEqual([
          {
            targetId,
            target: buildTarget(targetId),
            gitRepo,
            packages: [],
          },
        ]);
      });
    });

    describe('when no targets have any activity in the space', () => {
      it('returns an empty array', async () => {
        targetRepository.findActiveInSpace.mockResolvedValue([]);

        const result = await useCase.execute(command);

        expect(result).toEqual([]);
      });
    });

    it('drops active rows whose package is no longer present in the space', async () => {
      const targetId = createTargetId(uuidv4());
      const orphanPackageId = createPackageId(uuidv4());

      distributionRepository.findActivePackageOperationsBySpace.mockResolvedValue(
        [activeRow(targetId, orphanPackageId, DistributionStatus.success)],
      );
      targetRepository.findActiveInSpace.mockResolvedValue([
        buildTarget(targetId),
      ]);
      packageRepository.findBySpaceId.mockResolvedValue([]);

      const result = await useCase.execute(command);

      expect(result).toEqual([
        {
          targetId,
          target: buildTarget(targetId),
          gitRepo,
          packages: [],
        },
      ]);
    });

    describe('deployment status flags', () => {
      const targetId = createTargetId(uuidv4());
      const recipeId = createCommandId(uuidv4());
      const standardId = createStandardId(uuidv4());
      const skillId = createSkillId(uuidv4());
      const deploymentDate = '2026-04-01T10:00:00.000Z';
      let pkg: Package;

      const buildLiveCommand = (version: number): Command =>
        ({
          id: recipeId,
          name: 'recipe-name',
          slug: 'recipe-slug',
          content: 'recipe-content',
          version,
          userId,
          spaceId,
          movedTo: null,
        }) as Command;

      const buildLiveStandard = (version: number): Standard =>
        ({
          id: standardId,
          name: 'standard-name',
          slug: 'standard-slug',
          description: 'standard-description',
          version,
          userId,
          scope: null,
          spaceId,
          movedTo: null,
        }) as Standard;

      const buildLiveSkill = (version: number): Skill =>
        ({
          id: skillId,
          name: 'skill-name',
          slug: 'skill-slug',
          description: 'skill-description',
          prompt: 'skill-prompt',
          version,
          userId,
          spaceId,
          movedTo: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }) as Skill;

      const seedDeployment = (deployedVersion: number) => {
        pkg = buildPackage({
          recipes: [recipeId],
          standards: [standardId],
          skills: [skillId],
        });
        targetRepository.findActiveInSpace.mockResolvedValue([
          buildTarget(targetId),
        ]);
        distributionRepository.findActivePackageOperationsBySpace.mockResolvedValue(
          [activeRow(targetId, pkg.id, DistributionStatus.success)],
        );
        packageRepository.findBySpaceId.mockResolvedValue([pkg]);
        distributionRepository.findOutdatedDeploymentsBySpace.mockResolvedValue(
          [
            {
              targetId,
              targetName: `target-${targetId}`,
              gitRepoId,
              standards: [
                {
                  artifactId: standardId,
                  artifactName: 'standard-name',
                  artifactSlug: 'standard-slug',
                  deployedVersion,
                  deploymentDate,
                  isDeleted: false,
                },
              ],
              recipes: [
                {
                  artifactId: recipeId,
                  artifactName: 'recipe-name',
                  artifactSlug: 'recipe-slug',
                  deployedVersion,
                  deploymentDate,
                  isDeleted: false,
                },
              ],
              skills: [
                {
                  artifactId: skillId,
                  artifactName: 'skill-name',
                  artifactSlug: 'skill-slug',
                  deployedVersion,
                  deploymentDate,
                  isDeleted: false,
                },
              ],
            },
          ],
        );
      };

      describe('when deployed version equals latest', () => {
        let activePkg: ReturnType<typeof Array.prototype.find> & {
          deployedRecipes: Array<{ isUpToDate: boolean; isDeleted?: boolean }>;
          deployedStandards: Array<{
            isUpToDate: boolean;
            isDeleted?: boolean;
          }>;
          deployedSkills: Array<{ isUpToDate: boolean; isDeleted?: boolean }>;
          pendingRecipes: unknown[];
          pendingStandards: unknown[];
          pendingSkills: unknown[];
        };

        beforeEach(async () => {
          seedDeployment(3);
          commandsPort.listCommandsBySpace.mockResolvedValue([
            buildLiveCommand(3),
          ]);
          standardsPort.listStandardsBySpace.mockResolvedValue([
            buildLiveStandard(3),
          ]);
          skillsPort.listSkillsBySpace.mockResolvedValue([buildLiveSkill(3)]);

          const [entry] = await useCase.execute(command);
          [activePkg] = entry.packages as (typeof activePkg)[];
        });

        it('marks deployed recipe as up-to-date', () => {
          expect(activePkg.deployedRecipes[0].isUpToDate).toBe(true);
        });

        it('does not mark deployed recipe as deleted', () => {
          expect(activePkg.deployedRecipes[0].isDeleted).toBeUndefined();
        });

        it('marks deployed standard as up-to-date', () => {
          expect(activePkg.deployedStandards[0].isUpToDate).toBe(true);
        });

        it('does not mark deployed standard as deleted', () => {
          expect(activePkg.deployedStandards[0].isDeleted).toBeUndefined();
        });

        it('marks deployed skill as up-to-date', () => {
          expect(activePkg.deployedSkills[0].isUpToDate).toBe(true);
        });

        it('does not mark deployed skill as deleted', () => {
          expect(activePkg.deployedSkills[0].isDeleted).toBeUndefined();
        });

        it('returns empty pending recipes', () => {
          expect(activePkg.pendingRecipes).toEqual([]);
        });

        it('returns empty pending standards', () => {
          expect(activePkg.pendingStandards).toEqual([]);
        });

        it('returns empty pending skills', () => {
          expect(activePkg.pendingSkills).toEqual([]);
        });
      });

      describe('when deployed version trails latest', () => {
        let activePkg: ReturnType<typeof Array.prototype.find> & {
          deployedRecipes: Array<{
            isUpToDate: boolean;
            latestVersion: { version: number };
          }>;
          deployedStandards: Array<{
            isUpToDate: boolean;
            latestVersion: { version: number };
          }>;
          deployedSkills: Array<{
            isUpToDate: boolean;
            latestVersion: { version: number };
          }>;
        };

        beforeEach(async () => {
          seedDeployment(2);
          commandsPort.listCommandsBySpace.mockResolvedValue([
            buildLiveCommand(5),
          ]);
          standardsPort.listStandardsBySpace.mockResolvedValue([
            buildLiveStandard(5),
          ]);
          skillsPort.listSkillsBySpace.mockResolvedValue([buildLiveSkill(5)]);

          const [entry] = await useCase.execute(command);
          [activePkg] = entry.packages as (typeof activePkg)[];
        });

        it('marks deployed recipe as not up-to-date', () => {
          expect(activePkg.deployedRecipes[0].isUpToDate).toBe(false);
        });

        it('reports the latest recipe version', () => {
          expect(activePkg.deployedRecipes[0].latestVersion.version).toBe(5);
        });

        it('marks deployed standard as not up-to-date', () => {
          expect(activePkg.deployedStandards[0].isUpToDate).toBe(false);
        });

        it('reports the latest standard version', () => {
          expect(activePkg.deployedStandards[0].latestVersion.version).toBe(5);
        });

        it('marks deployed skill as not up-to-date', () => {
          expect(activePkg.deployedSkills[0].isUpToDate).toBe(false);
        });

        it('reports the latest skill version', () => {
          expect(activePkg.deployedSkills[0].latestVersion.version).toBe(5);
        });
      });

      describe('when the live entity is missing', () => {
        let activePkg: ReturnType<typeof Array.prototype.find> & {
          deployedRecipes: Array<{ isDeleted: boolean; isUpToDate: boolean }>;
          deployedStandards: Array<{ isDeleted: boolean; isUpToDate: boolean }>;
          deployedSkills: Array<{ isDeleted: boolean; isUpToDate: boolean }>;
        };

        beforeEach(async () => {
          seedDeployment(2);
          commandsPort.listCommandsBySpace.mockResolvedValue([]);
          standardsPort.listStandardsBySpace.mockResolvedValue([]);
          skillsPort.listSkillsBySpace.mockResolvedValue([]);

          const [entry] = await useCase.execute(command);
          [activePkg] = entry.packages as (typeof activePkg)[];
        });

        it('flags deleted recipe as deleted', () => {
          expect(activePkg.deployedRecipes[0].isDeleted).toBe(true);
        });

        it('marks deleted recipe as not up-to-date', () => {
          expect(activePkg.deployedRecipes[0].isUpToDate).toBe(false);
        });

        it('flags deleted standard as deleted', () => {
          expect(activePkg.deployedStandards[0].isDeleted).toBe(true);
        });

        it('marks deleted standard as not up-to-date', () => {
          expect(activePkg.deployedStandards[0].isUpToDate).toBe(false);
        });

        it('flags deleted skill as deleted', () => {
          expect(activePkg.deployedSkills[0].isDeleted).toBe(true);
        });

        it('marks deleted skill as not up-to-date', () => {
          expect(activePkg.deployedSkills[0].isUpToDate).toBe(false);
        });
      });
    });

    describe('per-package partitioning and pending', () => {
      describe('splits deployed artifacts across the packages that own them and emits pending for never-deployed ones', () => {
        let entry: Awaited<ReturnType<typeof useCase.execute>>[0];
        let commandsEntry: (typeof entry.packages)[0] | undefined;
        let mixedEntry: (typeof entry.packages)[0] | undefined;
        let targetId: TargetId;
        let commandAId: ReturnType<typeof createCommandId>;
        let commandBId: ReturnType<typeof createCommandId>;
        let standardId: ReturnType<typeof createStandardId>;
        let skillId: ReturnType<typeof createSkillId>;
        let pkgCommands: Package;
        let pkgMixed: Package;

        beforeEach(async () => {
          targetId = createTargetId(uuidv4());
          commandAId = createCommandId(uuidv4());
          commandBId = createCommandId(uuidv4());
          standardId = createStandardId(uuidv4());
          skillId = createSkillId(uuidv4());

          pkgCommands = buildPackage({
            name: 'pkg-recipes',
            recipes: [commandAId, commandBId],
          });
          pkgMixed = buildPackage({
            name: 'pkg-mixed',
            standards: [standardId],
            skills: [skillId],
          });

          targetRepository.findActiveInSpace.mockResolvedValue([
            buildTarget(targetId),
          ]);
          distributionRepository.findActivePackageOperationsBySpace.mockResolvedValue(
            [
              activeRow(targetId, pkgCommands.id, DistributionStatus.success),
              activeRow(targetId, pkgMixed.id, DistributionStatus.success),
            ],
          );
          packageRepository.findBySpaceId.mockResolvedValue([
            pkgCommands,
            pkgMixed,
          ]);
          commandsPort.listCommandsBySpace.mockResolvedValue([
            {
              id: commandAId,
              name: 'recipe-a',
              slug: 'recipe-a',
              content: 'a',
              version: 1,
              userId,
            } as Command,
            {
              id: commandBId,
              name: 'recipe-b',
              slug: 'recipe-b',
              content: 'b',
              version: 1,
              userId,
            } as Command,
          ]);
          standardsPort.listStandardsBySpace.mockResolvedValue([
            {
              id: standardId,
              name: 'std',
              slug: 'std',
              description: '',
              version: 1,
              userId,
              scope: null,
            } as Standard,
          ]);
          skillsPort.listSkillsBySpace.mockResolvedValue([
            {
              id: skillId,
              name: 'skill',
              slug: 'skill',
              description: '',
              prompt: '',
              version: 1,
              userId,
            } as Skill,
          ]);
          distributionRepository.findOutdatedDeploymentsBySpace.mockResolvedValue(
            [
              {
                targetId,
                targetName: `target-${targetId}`,
                gitRepoId,
                standards: [
                  {
                    artifactId: standardId,
                    artifactName: 'std',
                    artifactSlug: 'std',
                    deployedVersion: 1,
                    deploymentDate: '2026-04-01T10:00:00.000Z',
                    isDeleted: false,
                  },
                ],
                recipes: [
                  {
                    artifactId: commandAId,
                    artifactName: 'recipe-a',
                    artifactSlug: 'recipe-a',
                    deployedVersion: 1,
                    deploymentDate: '2026-04-01T10:00:00.000Z',
                    isDeleted: false,
                  },
                ],
                skills: [],
              },
            ],
          );

          [entry] = await useCase.execute(command);
          commandsEntry = entry.packages.find(
            (p) => p.packageId === pkgCommands.id,
          );
          mixedEntry = entry.packages.find((p) => p.packageId === pkgMixed.id);
        });

        it('includes the recipes package entry', () => {
          expect(commandsEntry).toBeDefined();
        });

        it('includes one deployed recipe for the recipes package', () => {
          expect(commandsEntry?.deployedRecipes).toHaveLength(1);
        });

        it('assigns the deployed recipe to the correct package', () => {
          expect(commandsEntry?.deployedRecipes[0].recipe.id).toBe(commandAId);
        });

        it('lists the non-deployed recipe as pending', () => {
          expect(commandsEntry?.pendingRecipes.map((r) => r.id)).toEqual([
            commandBId,
          ]);
        });

        it('includes the mixed package entry', () => {
          expect(mixedEntry).toBeDefined();
        });

        it('includes one deployed standard for the mixed package', () => {
          expect(mixedEntry?.deployedStandards).toHaveLength(1);
        });

        it('assigns the deployed standard to the correct package', () => {
          expect(mixedEntry?.deployedStandards[0].standard.id).toBe(standardId);
        });

        it('lists the non-deployed skill as pending', () => {
          expect(mixedEntry?.pendingSkills.map((s) => s.id)).toEqual([skillId]);
        });
      });
    });
  });
});
