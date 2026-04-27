import { stubLogger } from '@packmind/test-utils';
import { PackmindEventEmitterService } from '@packmind/node-utils';
import {
  IAccountsPort,
  ICodingAgentPort,
  IRecipesPort,
  ISkillsPort,
  ISpacesPort,
  IStandardsPort,
  InstallPackagesCommand,
  Organization,
  OrganizationId,
  PackageWithArtefacts,
  PackmindLockFile,
  Recipe,
  RecipeVersion,
  Space,
  SpaceType,
  Standard,
  StandardVersion,
  User,
  UserOrganizationMembership,
  UserSpaceMembership,
  UserSpaceRole,
  CodingAgents,
  createOrganizationId,
  createPackageId,
  createRecipeId,
  createRecipeVersionId,
  createSpaceId,
  createStandardId,
  createStandardVersionId,
  createUserId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { PackageService } from '../services/PackageService';
import { PackmindConfigService } from '../services/PackmindConfigService';
import { PackmindLockFileService } from '../services/PackmindLockFileService';
import { RenderModeConfigurationService } from '../services/RenderModeConfigurationService';
import { InstallPackagesUseCase } from './InstallPackagesUseCase';
import { PackagesNotFoundError } from '../../domain/errors/PackagesNotFoundError';

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
  trial: false,
});

const createSpaceMembership = (
  userId: string,
  spaceId: string,
): UserSpaceMembership => ({
  userId: createUserId(userId),
  spaceId: createSpaceId(spaceId),
  role: UserSpaceRole.MEMBER,
  createdBy: createUserId(userId),
  updatedBy: createUserId(userId),
});

describe('InstallPackagesUseCase', () => {
  let packageService: jest.Mocked<PackageService>;
  let recipesPort: jest.Mocked<IRecipesPort>;
  let standardsPort: jest.Mocked<IStandardsPort>;
  let skillsPort: jest.Mocked<ISkillsPort>;
  let codingAgentPort: jest.Mocked<ICodingAgentPort>;
  let accountsPort: jest.Mocked<IAccountsPort>;
  let eventEmitterService: jest.Mocked<PackmindEventEmitterService>;
  let renderModeConfigurationService: jest.Mocked<RenderModeConfigurationService>;
  let packmindConfigService: jest.Mocked<PackmindConfigService>;
  let lockFileService: jest.Mocked<PackmindLockFileService>;
  let spacesPort: jest.Mocked<ISpacesPort>;
  let useCase: InstallPackagesUseCase;
  let command: InstallPackagesCommand;
  let organizationId: OrganizationId;
  let organization: Organization;
  let publicSpace: Space;
  let privateSpace: Space;
  let userId: string;
  let emptyLockFile: PackmindLockFile;
  let publicPackage: PackageWithArtefacts;

  beforeEach(() => {
    userId = uuidv4();
    organizationId = createOrganizationId(uuidv4());
    organization = {
      id: organizationId,
      name: 'Test Org',
      slug: 'test-org',
    };

    publicSpace = {
      id: createSpaceId('public-space-id'),
      name: 'Public Space',
      slug: 'public',
      type: SpaceType.open,
      organizationId,
      isDefaultSpace: false,
    };

    privateSpace = {
      id: createSpaceId('private-space-id'),
      name: 'Private Space',
      slug: 'private',
      type: SpaceType.restricted,
      organizationId,
      isDefaultSpace: false,
    };

    publicPackage = {
      id: createPackageId(uuidv4()),
      slug: 'my-package',
      name: 'My Package',
      spaceId: publicSpace.id,
      recipes: [],
      standards: [],
      skills: [],
    } as unknown as PackageWithArtefacts;

    emptyLockFile = {
      lockfileVersion: 1,
      packageSlugs: [],
      agents: [],
      installedAt: new Date().toISOString(),
      artifacts: {},
    };

    packageService = {
      getPackagesBySlugsAndSpaceWithArtefacts: jest
        .fn()
        .mockResolvedValue([publicPackage]),
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

    codingAgentPort = {
      deployArtifactsForAgents: jest.fn().mockResolvedValue({
        createOrUpdate: [],
        delete: [],
      }),
      getSkillsFolderPathForAgents: jest.fn().mockReturnValue(new Map()),
    } as unknown as jest.Mocked<ICodingAgentPort>;

    accountsPort = {
      getUserById: jest.fn(),
      getOrganizationById: jest.fn(),
    } as unknown as jest.Mocked<IAccountsPort>;

    eventEmitterService = {
      emit: jest.fn(),
    } as unknown as jest.Mocked<PackmindEventEmitterService>;

    renderModeConfigurationService = {
      resolveCodingAgents: jest.fn().mockResolvedValue([CodingAgents.packmind]),
    } as unknown as jest.Mocked<RenderModeConfigurationService>;

    packmindConfigService = {
      createConfigFileModification: jest.fn().mockReturnValue({
        path: 'packmind.json',
        content: '{}',
      }),
    } as unknown as jest.Mocked<PackmindConfigService>;

    lockFileService = {
      buildLockFile: jest.fn().mockReturnValue({
        lockfileVersion: 1,
        packageSlugs: [],
        agents: [],
        installedAt: new Date().toISOString(),
        artifacts: {},
      }),
      createLockFileModification: jest.fn().mockReturnValue({
        path: 'packmind-lock.json',
        content: '{}',
      }),
    } as unknown as jest.Mocked<PackmindLockFileService>;

    spacesPort = {
      listSpacesByOrganization: jest
        .fn()
        .mockResolvedValue([publicSpace, privateSpace]),
      getSpaceBySlug: jest.fn().mockImplementation((slug: string) => {
        if (slug === 'public') return Promise.resolve(publicSpace);
        if (slug === 'private') return Promise.resolve(privateSpace);
        return Promise.resolve(null);
      }),
      findMembership: jest.fn().mockResolvedValue(null),
    } as unknown as jest.Mocked<ISpacesPort>;

    command = {
      organizationId: organizationId as unknown as string,
      userId,
      packagesSlugs: ['@public/my-package'],
      packmindLockFile: emptyLockFile,
    };

    accountsPort.getOrganizationById.mockResolvedValue(organization);
    accountsPort.getUserById.mockResolvedValue(
      createUserWithMembership(userId, organization, 'member'),
    );

    useCase = new InstallPackagesUseCase(
      packageService,
      recipesPort,
      standardsPort,
      skillsPort,
      codingAgentPort,
      renderModeConfigurationService,
      accountsPort,
      spacesPort,
      eventEmitterService,
      packmindConfigService,
      lockFileService,
      stubLogger(),
    );
  });

  afterEach(() => jest.clearAllMocks());

  describe('when no package slugs are provided', () => {
    it('throws NoPackageSlugsProvidedError', async () => {
      command.packagesSlugs = [];

      await expect(useCase.execute(command)).rejects.toThrow(
        'No package slugs provided',
      );
    });
  });

  describe('when user has access to all packages', () => {
    beforeEach(() => {
      spacesPort.findMembership.mockResolvedValue(
        createSpaceMembership(userId, 'public-space-id'),
      );
    });

    it('returns empty missingAccess', async () => {
      const result = await useCase.execute(command);

      expect(result.missingAccess).toEqual([]);
    });

    it('deploys artifacts for accessible packages', async () => {
      const standardId = createStandardId(uuidv4());
      const standard: Standard = {
        id: standardId,
        spaceId: publicSpace.id,
        name: 'Public Standard',
        slug: 'public-standard',
      } as Standard;

      publicPackage.standards = [standard];

      const standardVersion: StandardVersion = {
        id: createStandardVersionId(uuidv4()),
        standardId,
        name: 'Public Standard',
        slug: 'public-standard',
        version: 1,
        spaceId: publicSpace.id,
      } as unknown as StandardVersion;

      standardsPort.getLatestStandardVersion.mockResolvedValue(standardVersion);

      await useCase.execute(command);

      expect(codingAgentPort.deployArtifactsForAgents).toHaveBeenCalledWith(
        expect.objectContaining({
          standardVersions: [standardVersion],
        }),
      );
    });

    it('emits ArtifactsPulledEvent', async () => {
      await useCase.execute(command);

      expect(eventEmitterService.emit).toHaveBeenCalledTimes(1);
    });

    describe('when the incoming lock file has installedAt', () => {
      it('includes installedAt in the produced lock file', async () => {
        command.packmindLockFile = {
          ...emptyLockFile,
          installedAt: new Date().toISOString(),
        };

        await useCase.execute(command);

        const builtLockFile =
          lockFileService.buildLockFile.mock.results[0].value;
        expect('installedAt' in builtLockFile).toBe(true);
      });
    });

    describe('when the incoming lock file does not have installedAt', () => {
      it('omits installedAt from the produced lock file', async () => {
        command.packmindLockFile = {
          lockfileVersion: emptyLockFile.lockfileVersion,
          packageSlugs: emptyLockFile.packageSlugs,
          agents: emptyLockFile.agents,
          artifacts: emptyLockFile.artifacts,
        };

        await useCase.execute(command);

        const lockFileModificationCall =
          lockFileService.createLockFileModification.mock.calls[0][0];
        expect('installedAt' in lockFileModificationCall).toBe(false);
      });
    });
  });

  describe('when user has no access to some packages', () => {
    const privateArtifactEntry = {
      name: 'Private Command',
      type: 'command' as const,
      id: 'private-artifact-id',
      version: 1,
      spaceId: 'private-space-id',
      packageIds: ['private-pkg-id'],
      files: [],
    };

    const publicArtifactEntry = {
      name: 'Public Command',
      type: 'command' as const,
      id: 'public-artifact-id',
      version: 1,
      spaceId: 'public-space-id',
      packageIds: ['public-pkg-id'],
      files: [],
    };

    beforeEach(() => {
      command = {
        ...command,
        packagesSlugs: ['@public/my-package', '@private/my-secret-package'],
        packmindLockFile: {
          lockfileVersion: 1,
          packageSlugs: ['@public/my-package', '@private/my-secret-package'],
          agents: [],
          installedAt: new Date().toISOString(),
          artifacts: {
            'command:private-command': privateArtifactEntry,
            'command:public-command': publicArtifactEntry,
          },
        },
      };

      // User has access to public space only
      spacesPort.findMembership.mockImplementation((_uid, spaceId) => {
        if (String(spaceId) === 'public-space-id') {
          return Promise.resolve(
            createSpaceMembership(userId, 'public-space-id'),
          );
        }
        return Promise.resolve(null);
      });
    });

    it('includes inaccessible packages in missingAccess', async () => {
      const result = await useCase.execute(command);

      expect(result.missingAccess).toEqual(['@private/my-secret-package']);
    });

    it('preserves inaccessible artifacts in the built lock file', async () => {
      const builtLockFile: PackmindLockFile = {
        lockfileVersion: 1,
        packageSlugs: ['@public/my-package', '@private/my-secret-package'],
        agents: [CodingAgents.packmind],
        installedAt: new Date().toISOString(),
        artifacts: {},
      };
      lockFileService.buildLockFile.mockReturnValue(builtLockFile);

      await useCase.execute(command);

      const lockFileArg =
        lockFileService.createLockFileModification.mock.calls[0][0];
      expect(lockFileArg.artifacts['command:private-command']).toEqual(
        privateArtifactEntry,
      );
    });

    it('does not add accessible artifacts from old lock file to the built lock file', async () => {
      const builtLockFile: PackmindLockFile = {
        lockfileVersion: 1,
        packageSlugs: ['@public/my-package', '@private/my-secret-package'],
        agents: [CodingAgents.packmind],
        installedAt: new Date().toISOString(),
        artifacts: {},
      };
      lockFileService.buildLockFile.mockReturnValue(builtLockFile);

      await useCase.execute(command);

      const lockFileArg =
        lockFileService.createLockFileModification.mock.calls[0][0];
      expect(lockFileArg.artifacts['command:public-command']).toBeUndefined();
    });

    it('only deploys accessible packages', async () => {
      const recipeId = createRecipeId(uuidv4());
      const recipe: Recipe = {
        id: recipeId,
        spaceId: publicSpace.id,
        name: 'Public Recipe',
        slug: 'public-recipe',
      } as Recipe;

      publicPackage.recipes = [recipe];

      const recipeVersion: RecipeVersion = {
        id: createRecipeVersionId(uuidv4()),
        recipeId,
        name: 'Public Recipe',
        slug: 'public-recipe',
        version: 1,
      } as unknown as RecipeVersion;

      recipesPort.listRecipeVersions.mockResolvedValue([recipeVersion]);

      await useCase.execute(command);

      expect(codingAgentPort.deployArtifactsForAgents).toHaveBeenCalledWith(
        expect.objectContaining({
          recipeVersions: [recipeVersion],
        }),
      );
    });
  });

  describe('when user has no access to any package', () => {
    beforeEach(() => {
      command = {
        ...command,
        packagesSlugs: ['@private/my-secret-package'],
        packmindLockFile: {
          lockfileVersion: 1,
          packageSlugs: ['@private/my-secret-package'],
          agents: [],
          installedAt: new Date().toISOString(),
          artifacts: {
            'command:private-command': {
              name: 'Private Command',
              type: 'command',
              id: 'private-artifact-id',
              version: 1,
              spaceId: 'private-space-id',
              packageIds: ['private-pkg-id'],
              files: [],
            },
          },
        },
      };

      spacesPort.findMembership.mockResolvedValue(null);
    });

    it('returns all packages in missingAccess', async () => {
      const result = await useCase.execute(command);

      expect(result.missingAccess).toEqual(['@private/my-secret-package']);
    });

    it('does not call deployArtifactsForAgents', async () => {
      await useCase.execute(command);

      expect(codingAgentPort.deployArtifactsForAgents).not.toHaveBeenCalled();
    });

    it('preserves all artifacts from lock file in the built lock file', async () => {
      const builtLockFile: PackmindLockFile = {
        lockfileVersion: 1,
        packageSlugs: ['@private/my-secret-package'],
        agents: [CodingAgents.packmind],
        installedAt: new Date().toISOString(),
        artifacts: {},
      };
      lockFileService.buildLockFile.mockReturnValue(builtLockFile);

      await useCase.execute(command);

      const lockFileArg =
        lockFileService.createLockFileModification.mock.calls[0][0];
      expect(lockFileArg.artifacts['command:private-command']).toEqual(
        expect.objectContaining({ name: 'Private Command' }),
      );
    });
  });

  describe('when a package is removed', () => {
    const removedArtifactEntry = {
      name: 'Removed Standard',
      type: 'standard' as const,
      id: 'removed-standard-id',
      version: 1,
      spaceId: 'public-space-id',
      packageIds: ['removed-pkg-id'],
      files: [
        {
          path: '.cursor/rules/removed-standard.mdc',
          agent: CodingAgents.cursor,
        },
      ],
    };

    beforeEach(() => {
      command = {
        ...command,
        packagesSlugs: ['@public/my-package'],
        packmindLockFile: {
          lockfileVersion: 1,
          packageSlugs: ['@public/my-package', '@public/removed-package'],
          agents: [],
          installedAt: new Date().toISOString(),
          artifacts: {
            'standard:removed-standard': removedArtifactEntry,
          },
        },
      };

      spacesPort.findMembership.mockResolvedValue(
        createSpaceMembership(userId, 'public-space-id'),
      );
    });

    it('adds artifact files to the delete section', async () => {
      const result = await useCase.execute(command);

      expect(result.fileUpdates.delete).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: '.cursor/rules/removed-standard.mdc',
          }),
        ]),
      );
    });

    describe('when user has no access to the removed package space', () => {
      const inaccessibleRemovedArtifact = {
        name: 'Inaccessible Removed Standard',
        type: 'standard' as const,
        id: 'inaccessible-removed-standard-id',
        version: 1,
        spaceId: 'private-space-id',
        packageIds: ['inaccessible-removed-pkg-id'],
        files: [
          {
            path: '.cursor/rules/inaccessible-removed-standard.mdc',
            agent: CodingAgents.cursor,
          },
        ],
      };

      beforeEach(() => {
        command = {
          ...command,
          packagesSlugs: ['@public/my-package'],
          packmindLockFile: {
            lockfileVersion: 1,
            packageSlugs: ['@public/my-package', '@private/removed-package'],
            agents: [],
            installedAt: new Date().toISOString(),
            artifacts: {
              'standard:inaccessible-removed-standard':
                inaccessibleRemovedArtifact,
            },
          },
        };
      });

      it('adds artifact files to the delete section without error', async () => {
        const result = await useCase.execute(command);

        expect(result.fileUpdates.delete).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: '.cursor/rules/inaccessible-removed-standard.mdc',
            }),
          ]),
        );
      });
    });
  });

  describe('when a package is not found in an accessible space', () => {
    beforeEach(() => {
      spacesPort.findMembership.mockResolvedValue(
        createSpaceMembership(userId, 'public-space-id'),
      );
      packageService.getPackagesBySlugsAndSpaceWithArtefacts.mockResolvedValue(
        [],
      );
    });

    it('throws PackagesNotFoundError', async () => {
      await expect(useCase.execute(command)).rejects.toThrow(
        PackagesNotFoundError,
      );
    });
  });
});
