import { PackmindEventEmitterService } from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import {
  Distribution,
  DistributionStatus,
  IAccountsPort,
  IRecipesPort,
  ISkillsPort,
  ISpacesPort,
  IStandardsPort,
  Organization,
  OrganizationId,
  PackageWithArtefacts,
  PluginRenderedEvent,
  Recipe,
  RecipeVersion,
  RenderMode,
  RenderPackageAsPluginCommand,
  Skill,
  SkillVersion,
  Space,
  SpaceType,
  Standard,
  StandardVersion,
  Target,
  User,
  UserOrganizationMembership,
  createGitRepoId,
  createOrganizationId,
  createPackageId,
  createRecipeId,
  createRecipeVersionId,
  createSkillId,
  createSkillVersionId,
  createSpaceId,
  createStandardId,
  createStandardVersionId,
  createTargetId,
  createUserId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { PackageService } from '../../services/PackageService';
import { TargetResolutionService } from '../../services/TargetResolutionService';
import { IDistributionRepository } from '../../../domain/repositories/IDistributionRepository';
import { IDistributedPackageRepository } from '../../../domain/repositories/IDistributedPackageRepository';
import { PackagesNotFoundError } from '../../../domain/errors/PackagesNotFoundError';
import { RenderPackageAsPluginUseCase } from './RenderPackageAsPluginUseCase';

const createUserWithMembership = (
  userId: string,
  organization: Organization,
  role: UserOrganizationMembership['role'],
): User => ({
  id: createUserId(userId),
  email: `${userId}@packmind.test`,
  passwordHash: null,
  active: true,
  memberships: [
    {
      userId: createUserId(userId),
      organizationId: organization.id,
      role,
    },
  ],
});

describe('RenderPackageAsPluginUseCase', () => {
  let packageService: jest.Mocked<PackageService>;
  let recipesPort: jest.Mocked<IRecipesPort>;
  let standardsPort: jest.Mocked<IStandardsPort>;
  let skillsPort: jest.Mocked<ISkillsPort>;
  let spacesPort: jest.Mocked<ISpacesPort>;
  let accountsPort: jest.Mocked<IAccountsPort>;
  let targetResolutionService: jest.Mocked<TargetResolutionService>;
  let distributionRepository: jest.Mocked<IDistributionRepository>;
  let distributedPackageRepository: jest.Mocked<IDistributedPackageRepository>;
  let eventEmitterService: jest.Mocked<PackmindEventEmitterService>;
  let useCase: RenderPackageAsPluginUseCase;
  let organizationId: OrganizationId;
  let organization: Organization;
  let defaultSpace: Space;
  let userId: string;

  const buildTarget = (): Target => ({
    id: createTargetId(uuidv4()),
    name: 'plugins/security',
    path: 'plugins/security/',
    gitRepoId: createGitRepoId(uuidv4()),
  });

  const buildCommand = (
    overrides: Partial<RenderPackageAsPluginCommand> = {},
  ): RenderPackageAsPluginCommand => ({
    userId,
    organizationId: organizationId as unknown as string,
    packageSlug: 'security',
    mode: 'marketplace',
    pluginRoot: 'plugins/security/',
    pluginName: 'security',
    ...overrides,
  });

  const buildRecipe = (id: string, slug: string): Recipe =>
    ({
      id: createRecipeId(id),
      name: slug,
      slug,
      spaceId: defaultSpace.id,
    }) as Recipe;

  const buildRecipeVersion = (
    recipeId: string,
    slug: string,
    content: string,
  ): RecipeVersion => ({
    id: createRecipeVersionId(uuidv4()),
    recipeId: createRecipeId(recipeId),
    name: slug,
    slug,
    content,
    version: 1,
    userId: null,
  });

  const buildStandard = (id: string, slug: string): Standard =>
    ({
      id: createStandardId(id),
      name: slug,
      slug,
      spaceId: defaultSpace.id,
    }) as Standard;

  const buildStandardVersion = (
    standardId: string,
    slug: string,
  ): StandardVersion =>
    ({
      id: createStandardVersionId(uuidv4()),
      standardId: createStandardId(standardId),
      name: slug,
      slug,
      version: 1,
    }) as StandardVersion;

  const buildSkill = (id: string, slug: string): Skill =>
    ({
      id: createSkillId(id),
      name: slug,
      slug,
      spaceId: defaultSpace.id,
    }) as Skill;

  const buildSkillVersion = (
    skillId: string,
    slug: string,
    prompt: string,
  ): SkillVersion =>
    ({
      id: createSkillVersionId(uuidv4()),
      skillId: createSkillId(skillId),
      name: slug,
      slug,
      prompt,
      version: 1,
    }) as SkillVersion;

  const buildPackage = (
    overrides: Partial<PackageWithArtefacts> = {},
  ): PackageWithArtefacts =>
    ({
      id: createPackageId(uuidv4()),
      name: 'Security',
      slug: 'security',
      description: 'Security helpers',
      spaceId: defaultSpace.id,
      createdBy: createUserId(userId),
      recipes: [],
      standards: [],
      skills: [],
      ...overrides,
    }) as PackageWithArtefacts;

  beforeEach(() => {
    userId = uuidv4();
    organizationId = createOrganizationId(uuidv4());
    organization = {
      id: organizationId,
      name: 'Test Org',
      slug: 'test-org',
    };
    defaultSpace = {
      id: createSpaceId('default-space-id'),
      name: 'Default Space',
      slug: 'default',
      type: SpaceType.open,
      organizationId,
      isDefaultSpace: true,
    };

    packageService = {
      getPackagesBySlugsAndSpaceWithArtefacts: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<PackageService>;

    recipesPort = {
      listRecipeVersions: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<IRecipesPort>;

    standardsPort = {
      getLatestStandardVersion: jest.fn().mockResolvedValue(null),
    } as unknown as jest.Mocked<IStandardsPort>;

    skillsPort = {
      getLatestSkillVersion: jest.fn().mockResolvedValue(null),
      getSkillFiles: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<ISkillsPort>;

    spacesPort = {
      listSpacesByOrganization: jest.fn().mockResolvedValue([defaultSpace]),
      getSpaceBySlug: jest.fn().mockResolvedValue(defaultSpace),
    } as unknown as jest.Mocked<ISpacesPort>;

    accountsPort = {
      getUserById: jest
        .fn()
        .mockResolvedValue(
          createUserWithMembership(userId, organization, 'admin'),
        ),
      getOrganizationById: jest.fn().mockResolvedValue(organization),
    } as unknown as jest.Mocked<IAccountsPort>;

    targetResolutionService = {
      findOrCreateTargetFromGitInfo: jest.fn().mockResolvedValue(buildTarget()),
    } as unknown as jest.Mocked<TargetResolutionService>;

    distributionRepository = {
      add: jest
        .fn()
        .mockImplementation((d: Distribution) => Promise.resolve(d)),
    } as unknown as jest.Mocked<IDistributionRepository>;

    distributedPackageRepository = {
      add: jest.fn().mockResolvedValue(undefined),
      addStandardVersions: jest.fn().mockResolvedValue(undefined),
      addRecipeVersions: jest.fn().mockResolvedValue(undefined),
      addSkillVersions: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<IDistributedPackageRepository>;

    eventEmitterService = {
      emit: jest.fn(),
    } as unknown as jest.Mocked<PackmindEventEmitterService>;

    useCase = new RenderPackageAsPluginUseCase(
      packageService,
      recipesPort,
      standardsPort,
      skillsPort,
      spacesPort,
      accountsPort,
      targetResolutionService,
      distributionRepository,
      distributedPackageRepository,
      eventEmitterService,
      stubLogger(),
    );
  });

  describe('when the package does not exist', () => {
    it('throws PackagesNotFoundError', async () => {
      packageService.getPackagesBySlugsAndSpaceWithArtefacts.mockResolvedValue(
        [],
      );

      await expect(useCase.execute(buildCommand())).rejects.toBeInstanceOf(
        PackagesNotFoundError,
      );
    });
  });

  describe('when the package has only standards', () => {
    let result: Awaited<ReturnType<typeof useCase.execute>>;

    beforeEach(async () => {
      const standards = [
        buildStandard('s1', 'std-one'),
        buildStandard('s2', 'std-two'),
        buildStandard('s3', 'std-three'),
      ];
      packageService.getPackagesBySlugsAndSpaceWithArtefacts.mockResolvedValue([
        buildPackage({ standards }),
      ]);
      standardsPort.getLatestStandardVersion.mockImplementation((id) =>
        Promise.resolve(buildStandardVersion(id as string, 'std')),
      );

      result = await useCase.execute(buildCommand());
    });

    it('returns the skipped standards count', () => {
      expect(result.skippedStandardsCount).toBe(3);
    });

    it('returns only the manifest file', () => {
      expect(result.files).toHaveLength(1);
    });

    it('returns the manifest at the expected path', () => {
      expect(result.files[0].path).toBe(
        'plugins/security/.claude-plugin/plugin.json',
      );
    });
  });

  describe('install tracking hook files', () => {
    const installTracking: RenderPackageAsPluginCommand['installTracking'] = {
      apiBaseUrl: 'https://app.packmind.io/api',
      marketplaceName: 'acme-marketplace',
      pluginSlug: 'security',
      trackingToken: 'tok_abc123',
    };

    beforeEach(() => {
      packageService.getPackagesBySlugsAndSpaceWithArtefacts.mockResolvedValue([
        buildPackage(),
      ]);
    });

    describe('when installTracking is absent', () => {
      it('emits no hook files', async () => {
        const result = await useCase.execute(
          buildCommand({ installTracking: undefined }),
        );
        const hookPaths = result.files.filter((f) => f.path.includes('hooks/'));
        expect(hookPaths).toEqual([]);
      });
    });

    describe('when mode is standalone and installTracking is present', () => {
      it('emits no hook files', async () => {
        const result = await useCase.execute(
          buildCommand({ mode: 'standalone', installTracking }),
        );
        const hookPaths = result.files.filter((f) => f.path.includes('hooks/'));
        expect(hookPaths).toEqual([]);
      });
    });

    describe('when mode is marketplace and installTracking is present', () => {
      let result: Awaited<ReturnType<typeof useCase.execute>>;

      beforeEach(async () => {
        result = await useCase.execute(buildCommand({ installTracking }));
      });

      it('emits exactly four hook files', () => {
        const hookPaths = result.files.filter((f) => f.path.includes('hooks/'));
        expect(hookPaths).toHaveLength(4);
      });

      it('emits hooks/hooks.json', () => {
        expect(
          result.files.some((f) => f.path.endsWith('hooks/hooks.json')),
        ).toBe(true);
      });

      it('emits hooks/track-install.sh', () => {
        expect(
          result.files.some((f) => f.path.endsWith('hooks/track-install.sh')),
        ).toBe(true);
      });

      it('emits hooks/track-install.ps1', () => {
        expect(
          result.files.some((f) => f.path.endsWith('hooks/track-install.ps1')),
        ).toBe(true);
      });

      it('emits hooks/packmind-tracking.env', () => {
        expect(
          result.files.some((f) =>
            f.path.endsWith('hooks/packmind-tracking.env'),
          ),
        ).toBe(true);
      });

      it('injects the tracking token into the sidecar', () => {
        const env = result.files.find((f) =>
          f.path.endsWith('hooks/packmind-tracking.env'),
        );
        expect(env?.content).toContain('PACKMIND_TRACKING_TOKEN=tok_abc123');
      });

      it('injects the marketplace name into the sidecar', () => {
        const env = result.files.find((f) =>
          f.path.endsWith('hooks/packmind-tracking.env'),
        );
        expect(env?.content).toContain(
          'PACKMIND_MARKETPLACE_NAME=acme-marketplace',
        );
      });
    });
  });

  describe('when the package has skills and commands', () => {
    beforeEach(() => {
      const recipes = [buildRecipe('r1', 'audit'), buildRecipe('r2', 'review')];
      const skills = [buildSkill('sk1', 'threat-model')];
      const standards = [
        buildStandard('s1', 'std-one'),
        buildStandard('s2', 'std-two'),
        buildStandard('s3', 'std-three'),
        buildStandard('s4', 'std-four'),
        buildStandard('s5', 'std-five'),
      ];
      packageService.getPackagesBySlugsAndSpaceWithArtefacts.mockResolvedValue([
        buildPackage({ recipes, skills, standards }),
      ]);
      recipesPort.listRecipeVersions.mockImplementation((id) =>
        Promise.resolve([
          buildRecipeVersion(
            id as string,
            id === recipes[0].id ? 'audit' : 'review',
            `# ${id}`,
          ),
        ]),
      );
      skillsPort.getLatestSkillVersion.mockImplementation((id) =>
        Promise.resolve(
          buildSkillVersion(id as string, 'threat-model', '# tm'),
        ),
      );
      skillsPort.getSkillFiles.mockResolvedValue([]);
      standardsPort.getLatestStandardVersion.mockImplementation((id) =>
        Promise.resolve(buildStandardVersion(id as string, 'std')),
      );
    });

    it('returns the manifest plus command and skill files', async () => {
      const result = await useCase.execute(buildCommand());
      const paths = result.files.map((f) => f.path).sort();

      expect(paths).toEqual([
        'plugins/security/.claude-plugin/plugin.json',
        'plugins/security/commands/audit.md',
        'plugins/security/commands/review.md',
        'plugins/security/skills/threat-model/SKILL.md',
      ]);
    });

    it('reports skippedStandardsCount equal to the package standards count', async () => {
      const result = await useCase.execute(buildCommand());
      expect(result.skippedStandardsCount).toBe(5);
    });

    it('uses pluginRoot as a prefix on all file paths', async () => {
      const result = await useCase.execute(
        buildCommand({ pluginRoot: 'custom/root/' }),
      );
      expect(result.files.every((f) => f.path.startsWith('custom/root/'))).toBe(
        true,
      );
    });

    describe('returns plugin metadata', () => {
      let result: Awaited<ReturnType<typeof useCase.execute>>;

      beforeEach(async () => {
        result = await useCase.execute(buildCommand());
      });

      it('returns pluginName from the command', () => {
        expect(result.pluginName).toBe('security');
      });

      it('returns pluginDescription from the package', () => {
        expect(result.pluginDescription).toBe('Security helpers');
      });

      it('returns pluginVersion as the initial version', () => {
        expect(result.pluginVersion).toBe('0.1.0');
      });
    });
  });

  describe('tracking', () => {
    let pkg: PackageWithArtefacts;
    let recipeVersionId: ReturnType<typeof createRecipeVersionId>;
    let skillVersionId: ReturnType<typeof createSkillVersionId>;
    let standardVersionId: ReturnType<typeof createStandardVersionId>;

    beforeEach(() => {
      const recipes = [buildRecipe('r1', 'audit')];
      const skills = [buildSkill('sk1', 'threat-model')];
      const standards = [buildStandard('s1', 'std-one')];
      pkg = buildPackage({ recipes, skills, standards });
      packageService.getPackagesBySlugsAndSpaceWithArtefacts.mockResolvedValue([
        pkg,
      ]);

      const recipeVersion = buildRecipeVersion('r1', 'audit', '# audit');
      recipeVersionId = recipeVersion.id;
      recipesPort.listRecipeVersions.mockResolvedValue([recipeVersion]);

      const skillVersion = buildSkillVersion('sk1', 'threat-model', '# tm');
      skillVersionId = skillVersion.id;
      skillsPort.getLatestSkillVersion.mockResolvedValue(skillVersion);
      skillsPort.getSkillFiles.mockResolvedValue([]);

      const standardVersion = buildStandardVersion('s1', 'std-one');
      standardVersionId = standardVersion.id;
      standardsPort.getLatestStandardVersion.mockResolvedValue(standardVersion);
    });

    describe('when a git remote url is provided', () => {
      it('resolves a target from git info with the command path', async () => {
        await useCase.execute(
          buildCommand({
            gitRemoteUrl: 'https://github.com/acme/marketplace.git',
            gitBranch: 'develop',
          }),
        );

        expect(
          targetResolutionService.findOrCreateTargetFromGitInfo,
        ).toHaveBeenCalledWith(
          organizationId,
          userId,
          'https://github.com/acme/marketplace.git',
          'develop',
          'plugins/security/',
        );
      });

      describe('when git branch is omitted', () => {
        it('defaults the git branch to main', async () => {
          await useCase.execute(
            buildCommand({
              gitRemoteUrl: 'https://github.com/acme/marketplace.git',
            }),
          );

          expect(
            targetResolutionService.findOrCreateTargetFromGitInfo,
          ).toHaveBeenCalledWith(
            organizationId,
            userId,
            'https://github.com/acme/marketplace.git',
            'main',
            'plugins/security/',
          );
        });
      });

      describe('writes a distribution', () => {
        let distribution: Distribution;

        beforeEach(async () => {
          await useCase.execute(
            buildCommand({
              gitRemoteUrl: 'https://github.com/acme/marketplace.git',
            }),
          );
          distribution = distributionRepository.add.mock
            .calls[0][0] as Distribution;
        });

        it('writes a single distribution', () => {
          expect(distributionRepository.add).toHaveBeenCalledTimes(1);
        });

        it('sets renderModes to CLAUDE_PLUGIN', () => {
          expect(distribution.renderModes).toEqual([RenderMode.CLAUDE_PLUGIN]);
        });

        it('sets source to cli', () => {
          expect(distribution.source).toBe('cli');
        });

        it('sets status to success', () => {
          expect(distribution.status).toBe(DistributionStatus.success);
        });

        it('includes one distributed package', () => {
          expect(distribution.distributedPackages).toHaveLength(1);
        });

        it('sets the distributed package operation to add', () => {
          expect(distribution.distributedPackages[0].operation).toBe('add');
        });

        it('sets the distributed package id to the package id', () => {
          expect(distribution.distributedPackages[0].packageId).toBe(pkg.id);
        });
      });

      describe('persists the distributed package', () => {
        let distributedPackageId: string;

        beforeEach(async () => {
          await useCase.execute(
            buildCommand({
              gitRemoteUrl: 'https://github.com/acme/marketplace.git',
            }),
          );
          distributedPackageId =
            distributedPackageRepository.add.mock.calls[0][0].id;
        });

        it('calls add once', () => {
          expect(distributedPackageRepository.add).toHaveBeenCalledTimes(1);
        });

        it('persists the recipe version ids', () => {
          expect(
            distributedPackageRepository.addRecipeVersions,
          ).toHaveBeenCalledWith(distributedPackageId, [recipeVersionId]);
        });

        it('persists the skill version ids', () => {
          expect(
            distributedPackageRepository.addSkillVersions,
          ).toHaveBeenCalledWith(distributedPackageId, [skillVersionId]);
        });

        it('persists the standard version ids', () => {
          expect(
            distributedPackageRepository.addStandardVersions,
          ).toHaveBeenCalledWith(distributedPackageId, [standardVersionId]);
        });
      });

      describe('emits PluginRenderedEvent', () => {
        let emitted: PluginRenderedEvent;

        beforeEach(async () => {
          await useCase.execute(
            buildCommand({
              gitRemoteUrl: 'https://github.com/acme/marketplace.git',
            }),
          );
          emitted = eventEmitterService.emit.mock
            .calls[0][0] as PluginRenderedEvent;
        });

        it('emits exactly one event', () => {
          expect(eventEmitterService.emit).toHaveBeenCalledTimes(1);
        });

        it('emits a PluginRenderedEvent instance', () => {
          expect(emitted).toBeInstanceOf(PluginRenderedEvent);
        });

        it('emits the correct marketplace metadata payload', () => {
          expect(emitted.payload).toEqual({
            userId: createUserId(userId),
            organizationId,
            source: 'cli',
            packageId: pkg.id,
            packageSlug: pkg.slug,
            mode: 'marketplace',
            pluginRoot: 'plugins/security/',
            marketplaceRepo: 'https://github.com/acme/marketplace.git',
          });
        });
      });

      describe('returns the result', () => {
        let result: Awaited<ReturnType<typeof useCase.execute>>;

        beforeEach(async () => {
          result = await useCase.execute(
            buildCommand({
              gitRemoteUrl: 'https://github.com/acme/marketplace.git',
            }),
          );
        });

        it('returns rendered files', () => {
          expect(result.files.length).toBeGreaterThan(0);
        });

        it('returns the distribution id', () => {
          const distribution = distributionRepository.add.mock
            .calls[0][0] as Distribution;
          expect(result.distributionId).toBe(distribution.id);
        });
      });
    });

    describe('when no git remote url is provided', () => {
      it('does not write a distribution', async () => {
        await useCase.execute(buildCommand({ gitRemoteUrl: '   ' }));

        expect(distributionRepository.add).not.toHaveBeenCalled();
      });

      it('does not resolve a target', async () => {
        await useCase.execute(buildCommand({ gitRemoteUrl: '   ' }));

        expect(
          targetResolutionService.findOrCreateTargetFromGitInfo,
        ).not.toHaveBeenCalled();
      });

      describe('still emits the event without the marketplace repo', () => {
        let emitted: PluginRenderedEvent;

        beforeEach(async () => {
          await useCase.execute(buildCommand({ gitRemoteUrl: undefined }));
          emitted = eventEmitterService.emit.mock
            .calls[0][0] as PluginRenderedEvent;
        });

        it('emits exactly one event', () => {
          expect(eventEmitterService.emit).toHaveBeenCalledTimes(1);
        });

        it('emits the correct payload without marketplaceRepo', () => {
          expect(emitted.payload).toEqual({
            userId: createUserId(userId),
            organizationId,
            source: 'cli',
            packageId: pkg.id,
            packageSlug: pkg.slug,
            mode: 'marketplace',
            pluginRoot: 'plugins/security/',
          });
        });

        it('does not include marketplaceRepo in the payload', () => {
          expect(emitted.payload).not.toHaveProperty('marketplaceRepo');
        });
      });

      describe('returns the result', () => {
        let result: Awaited<ReturnType<typeof useCase.execute>>;

        beforeEach(async () => {
          result = await useCase.execute(
            buildCommand({ gitRemoteUrl: undefined }),
          );
        });

        it('returns rendered files', () => {
          expect(result.files.length).toBeGreaterThan(0);
        });

        it('returns no distribution id', () => {
          expect(result.distributionId).toBeUndefined();
        });
      });
    });

    describe('when tracking fails', () => {
      let result: Awaited<ReturnType<typeof useCase.execute>>;

      beforeEach(async () => {
        targetResolutionService.findOrCreateTargetFromGitInfo.mockRejectedValue(
          new Error('git resolution failed'),
        );

        result = await useCase.execute(
          buildCommand({
            gitRemoteUrl: 'https://github.com/acme/marketplace.git',
          }),
        );
      });

      it('does not reject', () => {
        expect(result.files.length).toBeGreaterThan(0);
      });

      it('returns no distribution id', () => {
        expect(result.distributionId).toBeUndefined();
      });
    });
  });
});
