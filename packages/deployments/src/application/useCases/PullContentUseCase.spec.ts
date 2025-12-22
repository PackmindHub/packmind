import { stubLogger } from '@packmind/test-utils';
import { PackmindEventEmitterService } from '@packmind/node-utils';
import {
  FileUpdates,
  IAccountsPort,
  ICodingAgentPort,
  IRecipesPort,
  IStandardsPort,
  Organization,
  OrganizationId,
  PackageWithArtefacts,
  PullContentCommand,
  Recipe,
  RecipeVersion,
  Standard,
  StandardVersion,
  User,
  UserOrganizationMembership,
  createOrganizationId,
  createPackageId,
  createRecipeId,
  createRecipeVersionId,
  createSpaceId,
  createStandardId,
  createStandardVersionId,
  createUserId,
} from '@packmind/types';
import { CodingAgents } from '@packmind/coding-agent';
import { v4 as uuidv4 } from 'uuid';
import { PackageService } from '../services/PackageService';
import { PackmindConfigService } from '../services/PackmindConfigService';
import { RenderModeConfigurationService } from '../services/RenderModeConfigurationService';
import { PullContentUseCase } from './PullContentUseCase';

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

describe('PullContentUseCase', () => {
  let packageService: jest.Mocked<PackageService>;
  let recipesPort: jest.Mocked<IRecipesPort>;
  let standardsPort: jest.Mocked<IStandardsPort>;
  let codingAgentPort: jest.Mocked<ICodingAgentPort>;
  let accountsPort: jest.Mocked<IAccountsPort>;
  let eventEmitterService: jest.Mocked<PackmindEventEmitterService>;
  let renderModeConfigurationService: jest.Mocked<RenderModeConfigurationService>;
  let packmindConfigService: jest.Mocked<PackmindConfigService>;
  let useCase: PullContentUseCase;
  let command: PullContentCommand;
  let organizationId: OrganizationId;
  let organization: Organization;

  beforeEach(() => {
    packageService = {
      getPackagesBySlugsWithArtefacts: jest.fn(),
    } as unknown as jest.Mocked<PackageService>;

    recipesPort = {
      listRecipeVersions: jest.fn(),
    } as unknown as jest.Mocked<IRecipesPort>;

    standardsPort = {
      listStandardVersions: jest.fn(),
    } as unknown as jest.Mocked<IStandardsPort>;

    const mockDeployer = {
      generateFileUpdatesForRecipes: jest.fn(),
      generateFileUpdatesForStandards: jest.fn(),
      deployArtifacts: jest.fn(),
    };

    const mockRegistry = {
      getDeployer: jest.fn().mockReturnValue(mockDeployer),
    };

    codingAgentPort = {
      prepareRecipesDeployment: jest.fn(),
      prepareStandardsDeployment: jest.fn(),
      getDeployerRegistry: jest.fn().mockReturnValue(mockRegistry),
    } as unknown as jest.Mocked<ICodingAgentPort>;

    accountsPort = {
      getUserById: jest.fn(),
      getOrganizationById: jest.fn(),
    } as unknown as jest.Mocked<IAccountsPort>;

    eventEmitterService = {
      emit: jest.fn(),
    } as unknown as jest.Mocked<PackmindEventEmitterService>;

    renderModeConfigurationService = {
      resolveActiveCodingAgents: jest.fn(),
    } as unknown as jest.Mocked<RenderModeConfigurationService>;

    packmindConfigService = {
      createConfigFileModification: jest.fn(),
      generateConfigContent: jest.fn(),
    } as unknown as jest.Mocked<PackmindConfigService>;

    packmindConfigService.createConfigFileModification.mockReturnValue({
      path: 'packmind.json',
      content: '{\n  "packages": {\n    "test-package": "*"\n  }\n}\n',
    });

    renderModeConfigurationService.resolveActiveCodingAgents.mockResolvedValue([
      CodingAgents.packmind,
      CodingAgents.agents_md,
    ]);

    organizationId = createOrganizationId(uuidv4());
    organization = {
      id: organizationId,
      name: 'Packmind',
      slug: 'packmind',
    };

    command = {
      organizationId: organizationId as unknown as string,
      userId: uuidv4(),
      packagesSlugs: ['test-package'],
    };

    accountsPort.getOrganizationById.mockResolvedValue(organization);
    accountsPort.getUserById.mockResolvedValue(
      createUserWithMembership(command.userId, organization, 'member'),
    );

    useCase = new PullContentUseCase(
      packageService,
      recipesPort,
      standardsPort,
      codingAgentPort,
      renderModeConfigurationService,
      accountsPort,
      eventEmitterService,
      packmindConfigService,
      stubLogger(),
    );
  });

  afterEach(() => jest.clearAllMocks());

  describe('when pulling all content', () => {
    let mockDeployer: {
      generateFileUpdatesForRecipes: jest.Mock;
      generateFileUpdatesForStandards: jest.Mock;
      deployArtifacts: jest.Mock;
    };
    let mockRegistry: {
      getDeployer: jest.Mock;
    };

    beforeEach(() => {
      mockDeployer = {
        generateFileUpdatesForRecipes: jest.fn(),
        generateFileUpdatesForStandards: jest.fn(),
        deployArtifacts: jest.fn(),
      };

      mockRegistry = {
        getDeployer: jest.fn().mockReturnValue(mockDeployer),
      };

      (codingAgentPort.getDeployerRegistry as jest.Mock).mockReturnValue(
        mockRegistry,
      );
    });

    it('returns file updates from deployers', async () => {
      const testPackage: PackageWithArtefacts = {
        id: createPackageId('test-package-id'),
        slug: 'test-package',
        name: 'Test Package',
        description: 'Test package description',
        spaceId: createSpaceId('space-1'),
        createdBy: createUserId('user-1'),
        recipes: [],
        standards: [],
      };

      packageService.getPackagesBySlugsWithArtefacts.mockResolvedValue([
        testPackage,
      ]);

      recipesPort.listRecipeVersions.mockResolvedValue([]);
      standardsPort.listStandardVersions.mockResolvedValue([]);

      mockDeployer.deployArtifacts.mockResolvedValue({
        createOrUpdate: [{ path: 'test.md', content: 'test content' }],
        delete: [],
      } as FileUpdates);

      const result = await useCase.execute(command);

      expect(result).toBeDefined();
      expect(result.fileUpdates).toBeDefined();
      expect(result.fileUpdates.createOrUpdate).toBeInstanceOf(Array);
      expect(result.fileUpdates.delete).toBeInstanceOf(Array);
    });

    it('merges file updates from recipes and standards', async () => {
      const testPackage: PackageWithArtefacts = {
        id: createPackageId('test-package-id'),
        slug: 'test-package',
        name: 'Test Package',
        description: 'Test package description',
        spaceId: createSpaceId('space-1'),
        createdBy: createUserId('user-1'),
        recipes: [],
        standards: [],
      };

      packageService.getPackagesBySlugsWithArtefacts.mockResolvedValue([
        testPackage,
      ]);

      recipesPort.listRecipeVersions.mockResolvedValue([]);
      standardsPort.listStandardVersions.mockResolvedValue([]);

      mockDeployer.deployArtifacts.mockResolvedValue({
        createOrUpdate: [
          { path: 'recipe.md', content: 'recipe content' },
          { path: 'standard.md', content: 'standard content' },
        ],
        delete: [],
      } as FileUpdates);

      const result = await useCase.execute(command);

      expect(result.fileUpdates.createOrUpdate).toBeInstanceOf(Array);
      expect(result.fileUpdates.delete).toBeInstanceOf(Array);
    });

    describe('when recipe and standard lists are empty', () => {
      beforeEach(() => {
        const testPackage: PackageWithArtefacts = {
          id: createPackageId('test-package-id'),
          slug: 'test-package',
          name: 'Test Package',
          description: 'Test package description',
          spaceId: createSpaceId('space-1'),
          createdBy: createUserId('user-1'),
          recipes: [],
          standards: [],
        };

        packageService.getPackagesBySlugsWithArtefacts.mockResolvedValue([
          testPackage,
        ]);

        recipesPort.listRecipeVersions.mockResolvedValue([]);
        standardsPort.listStandardVersions.mockResolvedValue([]);

        mockDeployer.deployArtifacts.mockResolvedValue({
          createOrUpdate: [],
          delete: [],
        } as FileUpdates);
      });

      it('includes only packmind.json in createOrUpdate', async () => {
        const result = await useCase.execute(command);

        expect(result.fileUpdates.createOrUpdate).toHaveLength(1);
      });

      it('sets packmind.json as the file path', async () => {
        const result = await useCase.execute(command);

        expect(result.fileUpdates.createOrUpdate[0].path).toBe('packmind.json');
      });

      it('returns empty delete array', async () => {
        const result = await useCase.execute(command);

        expect(result.fileUpdates.delete).toEqual([]);
      });
    });

    it('emits ArtifactsPulledEvent domain event', async () => {
      const testPackage: PackageWithArtefacts = {
        id: createPackageId('test-package-id'),
        slug: 'test-package',
        name: 'Test Package',
        description: 'Test package description',
        spaceId: createSpaceId('space-1'),
        createdBy: createUserId('user-1'),
        recipes: [],
        standards: [],
      };

      packageService.getPackagesBySlugsWithArtefacts.mockResolvedValue([
        testPackage,
      ]);

      recipesPort.listRecipeVersions.mockResolvedValue([]);
      standardsPort.listStandardVersions.mockResolvedValue([]);

      mockDeployer.deployArtifacts.mockResolvedValue({
        createOrUpdate: [],
        delete: [],
      } as FileUpdates);

      await useCase.execute(command);

      expect(eventEmitterService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            userId: createUserId(command.userId),
            organizationId: createOrganizationId(command.organizationId),
            source: 'cli',
          }),
        }),
      );
    });

    describe('when package slugs do not match', () => {
      let commandWithMultipleSlugs: PullContentCommand;
      let testPackage: PackageWithArtefacts;

      beforeEach(() => {
        commandWithMultipleSlugs = {
          ...command,
          packagesSlugs: ['test-package', 'unknown-package'],
        };

        testPackage = {
          id: createPackageId('test-package-id'),
          slug: 'test-package',
          name: 'Test Package',
          description: 'Test package description',
          spaceId: createSpaceId('space-1'),
          createdBy: createUserId('user-1'),
          recipes: [],
          standards: [],
        };

        packageService.getPackagesBySlugsWithArtefacts.mockResolvedValue([
          testPackage,
        ]);
      });

      it('throws PackagesNotFoundError', async () => {
        await expect(useCase.execute(commandWithMultipleSlugs)).rejects.toThrow(
          'Package "unknown-package" was not found',
        );
      });
    });

    describe('when multiple package slugs do not match', () => {
      let commandWithMultipleSlugs: PullContentCommand;
      let testPackage: PackageWithArtefacts;

      beforeEach(() => {
        commandWithMultipleSlugs = {
          ...command,
          packagesSlugs: ['test-package', 'unknown-1', 'unknown-2'],
        };

        testPackage = {
          id: createPackageId('test-package-id'),
          slug: 'test-package',
          name: 'Test Package',
          description: 'Test package description',
          spaceId: createSpaceId('space-1'),
          createdBy: createUserId('user-1'),
          recipes: [],
          standards: [],
        };

        packageService.getPackagesBySlugsWithArtefacts.mockResolvedValue([
          testPackage,
        ]);
      });

      it('throws PackagesNotFoundError', async () => {
        await expect(useCase.execute(commandWithMultipleSlugs)).rejects.toThrow(
          'Packages "unknown-1", "unknown-2" were not found',
        );
      });
    });

    describe('when generating packmind.json config file', () => {
      let testPackage: PackageWithArtefacts;

      beforeEach(() => {
        testPackage = {
          id: createPackageId('test-package-id'),
          slug: 'test-package',
          name: 'Test Package',
          description: 'Test package description',
          spaceId: createSpaceId('space-1'),
          createdBy: createUserId('user-1'),
          recipes: [],
          standards: [],
        };

        packageService.getPackagesBySlugsWithArtefacts.mockResolvedValue([
          testPackage,
        ]);

        recipesPort.listRecipeVersions.mockResolvedValue([]);
        standardsPort.listStandardVersions.mockResolvedValue([]);

        mockDeployer.deployArtifacts.mockResolvedValue({
          createOrUpdate: [],
          delete: [],
        } as FileUpdates);
      });

      it('includes packmind.json in file updates', async () => {
        const result = await useCase.execute(command);

        const packmindJsonFile = result.fileUpdates.createOrUpdate.find(
          (file) => file.path === 'packmind.json',
        );
        expect(packmindJsonFile).toBeDefined();
      });

      it('calls PackmindConfigService with package slugs', async () => {
        await useCase.execute(command);

        expect(
          packmindConfigService.createConfigFileModification,
        ).toHaveBeenCalledWith(['test-package']);
      });

      it('includes correct content in packmind.json', async () => {
        const result = await useCase.execute(command);

        const packmindJsonFile = result.fileUpdates.createOrUpdate.find(
          (file) => file.path === 'packmind.json',
        );
        expect(packmindJsonFile?.content).toBe(
          '{\n  "packages": {\n    "test-package": "*"\n  }\n}\n',
        );
      });
    });

    describe('handling README.md for trial users', () => {
      let testPackage: PackageWithArtefacts;

      beforeEach(() => {
        testPackage = {
          id: createPackageId('test-package-id'),
          slug: 'test-package',
          name: 'Test Package',
          description: 'Test package description',
          spaceId: createSpaceId('space-1'),
          createdBy: createUserId('user-1'),
          recipes: [],
          standards: [],
        };

        packageService.getPackagesBySlugsWithArtefacts.mockResolvedValue([
          testPackage,
        ]);

        recipesPort.listRecipeVersions.mockResolvedValue([]);
        standardsPort.listStandardVersions.mockResolvedValue([]);

        mockDeployer.deployArtifacts.mockResolvedValue({
          createOrUpdate: [],
          delete: [],
        } as FileUpdates);
      });

      describe('when user is a trial user', () => {
        beforeEach(() => {
          const trialUser: User = {
            id: createUserId(command.userId),
            email: `${command.userId}@packmind.test`,
            passwordHash: null,
            active: true,
            memberships: [
              {
                userId: createUserId(command.userId),
                organizationId: organization.id,
                role: 'member',
              },
            ],
            trial: true,
          };
          accountsPort.getUserById.mockResolvedValue(trialUser);
        });

        it('includes README.md with playbook content in file updates', async () => {
          const result = await useCase.execute(command);

          const readmeFile = result.fileUpdates.createOrUpdate.find(
            (file) => file.path === '.packmind/README.md',
          );
          expect(readmeFile?.content?.split('\n')).toEqual(
            expect.arrayContaining([
              '# Packmind playbook',
              '## How to contribute?',
            ]),
          );
        });
      });

      describe('when user is not a trial user', () => {
        beforeEach(() => {
          accountsPort.getUserById.mockResolvedValue(
            createUserWithMembership(command.userId, organization, 'member'),
          );
        });

        it('does not include README.md in file updates', async () => {
          const result = await useCase.execute(command);

          const readmeFile = result.fileUpdates.createOrUpdate.find(
            (file) => file.path === '.packmind/README.md',
          );
          expect(readmeFile).toBeUndefined();
        });
      });
    });
  });

  describe('when removing packages with shared artifacts', () => {
    let packageA: PackageWithArtefacts;
    let packageB: PackageWithArtefacts;
    let sharedRecipe: Recipe;
    let uniqueRecipe: Recipe;
    let sharedStandard: Standard;
    let uniqueStandard: Standard;
    let sharedRecipeVersion: RecipeVersion;
    let uniqueRecipeVersion: RecipeVersion;
    let sharedStandardVersion: StandardVersion;
    let uniqueStandardVersion: StandardVersion;
    let mockDeployer: {
      generateFileUpdatesForRecipes: jest.Mock;
      generateFileUpdatesForStandards: jest.Mock;
      deployArtifacts: jest.Mock;
      generateRemovalFileUpdates: jest.Mock;
    };
    let mockRegistry: { getDeployer: jest.Mock };

    beforeEach(() => {
      const spaceId = createSpaceId('space-1');
      const userId = createUserId('user-1');

      sharedRecipe = {
        id: createRecipeId('shared-recipe-id'),
        name: 'Shared Recipe',
        slug: 'shared-recipe',
        content: 'shared content',
        version: 1,
        userId,
        spaceId,
      };

      uniqueRecipe = {
        id: createRecipeId('unique-recipe-id'),
        name: 'Unique Recipe',
        slug: 'unique-recipe',
        content: 'unique content',
        version: 1,
        userId,
        spaceId,
      };

      sharedStandard = {
        id: createStandardId('shared-standard-id'),
        name: 'Shared Standard',
        slug: 'shared-standard',
        description: 'shared description',
        version: 1,
        userId,
        spaceId,
        scope: null,
      };

      uniqueStandard = {
        id: createStandardId('unique-standard-id'),
        name: 'Unique Standard',
        slug: 'unique-standard',
        description: 'unique description',
        version: 1,
        userId,
        spaceId,
        scope: null,
      };

      sharedRecipeVersion = {
        id: createRecipeVersionId('rv-shared'),
        recipeId: sharedRecipe.id,
        name: 'Shared Recipe',
        slug: 'shared-recipe',
        content: 'shared content',
        version: 1,
        userId: null,
      };

      uniqueRecipeVersion = {
        id: createRecipeVersionId('rv-unique'),
        recipeId: uniqueRecipe.id,
        name: 'Unique Recipe',
        slug: 'unique-recipe',
        content: 'unique content',
        version: 1,
        userId: null,
      };

      sharedStandardVersion = {
        id: createStandardVersionId('sv-shared'),
        standardId: sharedStandard.id,
        name: 'Shared Standard',
        slug: 'shared-standard',
        description: 'shared description',
        version: 1,
        scope: null,
      };

      uniqueStandardVersion = {
        id: createStandardVersionId('sv-unique'),
        standardId: uniqueStandard.id,
        name: 'Unique Standard',
        slug: 'unique-standard',
        description: 'unique description',
        version: 1,
        scope: null,
      };

      packageA = {
        id: createPackageId('package-a-id'),
        slug: 'package-a',
        name: 'Package A',
        description: 'Package A description',
        spaceId,
        createdBy: userId,
        recipes: [sharedRecipe, uniqueRecipe],
        standards: [sharedStandard, uniqueStandard],
      };

      packageB = {
        id: createPackageId('package-b-id'),
        slug: 'package-b',
        name: 'Package B',
        description: 'Package B description',
        spaceId,
        createdBy: userId,
        recipes: [sharedRecipe],
        standards: [sharedStandard],
      };

      mockDeployer = {
        generateFileUpdatesForRecipes: jest.fn(),
        generateFileUpdatesForStandards: jest.fn(),
        deployArtifacts: jest.fn(),
        generateRemovalFileUpdates: jest.fn(),
      };

      mockRegistry = {
        getDeployer: jest.fn().mockReturnValue(mockDeployer),
      };

      (codingAgentPort.getDeployerRegistry as jest.Mock).mockReturnValue(
        mockRegistry,
      );

      mockDeployer.deployArtifacts.mockResolvedValue({
        createOrUpdate: [],
        delete: [],
      });

      mockDeployer.generateRemovalFileUpdates.mockResolvedValue({
        createOrUpdate: [],
        delete: [],
      });
    });

    describe('when Package A is removed but Package B remains', () => {
      beforeEach(() => {
        command = {
          ...command,
          packagesSlugs: ['package-b'],
          previousPackagesSlugs: ['package-a', 'package-b'],
        };

        packageService.getPackagesBySlugsWithArtefacts
          .mockResolvedValueOnce([packageB])
          .mockResolvedValueOnce([packageA]);

        recipesPort.listRecipeVersions
          .mockResolvedValueOnce([sharedRecipeVersion])
          .mockResolvedValueOnce([sharedRecipeVersion])
          .mockResolvedValueOnce([uniqueRecipeVersion]);

        standardsPort.listStandardVersions
          .mockResolvedValueOnce([sharedStandardVersion])
          .mockResolvedValueOnce([sharedStandardVersion])
          .mockResolvedValueOnce([uniqueStandardVersion]);

        mockDeployer.generateRemovalFileUpdates.mockResolvedValue({
          createOrUpdate: [],
          delete: [
            { path: '.packmind/recipes/unique-recipe.md' },
            { path: '.packmind/standards/unique-standard.md' },
          ],
        });
      });

      it('does not delete shared recipe files', async () => {
        const result = await useCase.execute(command);

        const deletedPaths = result.fileUpdates.delete.map((f) => f.path);
        expect(deletedPaths).not.toContain(
          '.packmind/recipes/shared-recipe.md',
        );
      });

      it('does not delete shared standard files', async () => {
        const result = await useCase.execute(command);

        const deletedPaths = result.fileUpdates.delete.map((f) => f.path);
        expect(deletedPaths).not.toContain(
          '.packmind/standards/shared-standard.md',
        );
      });

      it('deletes unique recipe files from removed package', async () => {
        const result = await useCase.execute(command);

        const deletedPaths = result.fileUpdates.delete.map((f) => f.path);
        expect(deletedPaths).toContain('.packmind/recipes/unique-recipe.md');
      });

      it('deletes unique standard files from removed package', async () => {
        const result = await useCase.execute(command);

        const deletedPaths = result.fileUpdates.delete.map((f) => f.path);
        expect(deletedPaths).toContain(
          '.packmind/standards/unique-standard.md',
        );
      });
    });

    describe('when all artifacts are shared with remaining packages', () => {
      beforeEach(() => {
        const packageAOnlyShared: PackageWithArtefacts = {
          ...packageA,
          recipes: [sharedRecipe],
          standards: [sharedStandard],
        };

        command = {
          ...command,
          packagesSlugs: ['package-b'],
          previousPackagesSlugs: ['package-a', 'package-b'],
        };

        packageService.getPackagesBySlugsWithArtefacts
          .mockResolvedValueOnce([packageB])
          .mockResolvedValueOnce([packageAOnlyShared]);

        recipesPort.listRecipeVersions.mockResolvedValue([sharedRecipeVersion]);
        standardsPort.listStandardVersions.mockResolvedValue([
          sharedStandardVersion,
        ]);
      });

      it('does not generate any deletion paths', async () => {
        const result = await useCase.execute(command);

        expect(result.fileUpdates.delete).toEqual([]);
      });

      it('does not call generateRemovalFileUpdates', async () => {
        await useCase.execute(command);

        expect(mockDeployer.generateRemovalFileUpdates).not.toHaveBeenCalled();
      });
    });

    describe('when no artifacts are shared', () => {
      beforeEach(() => {
        const packageAUniqueOnly: PackageWithArtefacts = {
          ...packageA,
          recipes: [uniqueRecipe],
          standards: [uniqueStandard],
        };

        const packageBDifferent: PackageWithArtefacts = {
          ...packageB,
          recipes: [],
          standards: [],
        };

        command = {
          ...command,
          packagesSlugs: ['package-b'],
          previousPackagesSlugs: ['package-a', 'package-b'],
        };

        packageService.getPackagesBySlugsWithArtefacts
          .mockResolvedValueOnce([packageBDifferent])
          .mockResolvedValueOnce([packageAUniqueOnly]);

        recipesPort.listRecipeVersions.mockResolvedValue([uniqueRecipeVersion]);
        standardsPort.listStandardVersions.mockResolvedValue([
          uniqueStandardVersion,
        ]);

        mockDeployer.generateRemovalFileUpdates.mockResolvedValue({
          createOrUpdate: [],
          delete: [
            { path: '.packmind/recipes/unique-recipe.md' },
            { path: '.packmind/standards/unique-standard.md' },
          ],
        });
      });

      it('deletes unique recipe from removed package', async () => {
        const result = await useCase.execute(command);

        const deletedPaths = result.fileUpdates.delete.map((f) => f.path);
        expect(deletedPaths).toContain('.packmind/recipes/unique-recipe.md');
      });

      it('deletes unique standard from removed package', async () => {
        const result = await useCase.execute(command);

        const deletedPaths = result.fileUpdates.delete.map((f) => f.path);
        expect(deletedPaths).toContain(
          '.packmind/standards/unique-standard.md',
        );
      });
    });

    describe('when removing the last package', () => {
      beforeEach(() => {
        command = {
          ...command,
          packagesSlugs: [],
          previousPackagesSlugs: ['package-a'],
        };

        packageService.getPackagesBySlugsWithArtefacts.mockResolvedValueOnce([
          packageA,
        ]);

        recipesPort.listRecipeVersions
          .mockResolvedValueOnce([sharedRecipeVersion])
          .mockResolvedValueOnce([uniqueRecipeVersion]);

        standardsPort.listStandardVersions
          .mockResolvedValueOnce([sharedStandardVersion])
          .mockResolvedValueOnce([uniqueStandardVersion]);

        mockDeployer.generateRemovalFileUpdates.mockResolvedValue({
          createOrUpdate: [],
          delete: [
            { path: '.packmind/recipes/shared-recipe.md' },
            { path: '.packmind/recipes/unique-recipe.md' },
            { path: '.packmind/standards/shared-standard.md' },
            { path: '.packmind/standards/unique-standard.md' },
          ],
        });
      });

      it('does not throw NoPackageSlugsProvidedError', async () => {
        await expect(useCase.execute(command)).resolves.not.toThrow();
      });

      it('fetches packages only once', async () => {
        await useCase.execute(command);

        expect(
          packageService.getPackagesBySlugsWithArtefacts,
        ).toHaveBeenCalledTimes(1);
      });

      it('fetches only previous packages', async () => {
        await useCase.execute(command);

        expect(
          packageService.getPackagesBySlugsWithArtefacts,
        ).toHaveBeenCalledWith(['package-a']);
      });

      it('calls generateRemovalFileUpdates with all artifacts from removed package', async () => {
        await useCase.execute(command);

        expect(mockDeployer.generateRemovalFileUpdates).toHaveBeenCalledWith(
          {
            recipeVersions: [sharedRecipeVersion, uniqueRecipeVersion],
            standardVersions: [sharedStandardVersion, uniqueStandardVersion],
          },
          {
            recipeVersions: [],
            standardVersions: [],
          },
        );
      });

      it('marks shared recipe for deletion', async () => {
        const result = await useCase.execute(command);

        const deletedPaths = result.fileUpdates.delete.map((f) => f.path);
        expect(deletedPaths).toContain('.packmind/recipes/shared-recipe.md');
      });

      it('marks unique recipe for deletion', async () => {
        const result = await useCase.execute(command);

        const deletedPaths = result.fileUpdates.delete.map((f) => f.path);
        expect(deletedPaths).toContain('.packmind/recipes/unique-recipe.md');
      });

      it('marks shared standard for deletion', async () => {
        const result = await useCase.execute(command);

        const deletedPaths = result.fileUpdates.delete.map((f) => f.path);
        expect(deletedPaths).toContain(
          '.packmind/standards/shared-standard.md',
        );
      });

      it('marks unique standard for deletion', async () => {
        const result = await useCase.execute(command);

        const deletedPaths = result.fileUpdates.delete.map((f) => f.path);
        expect(deletedPaths).toContain(
          '.packmind/standards/unique-standard.md',
        );
      });

      it('calls config service with empty package list', async () => {
        packmindConfigService.createConfigFileModification.mockReturnValue({
          path: 'packmind.json',
          content: '{\n  "packages": {}\n}\n',
        });

        await useCase.execute(command);

        expect(
          packmindConfigService.createConfigFileModification,
        ).toHaveBeenCalledWith([]);
      });

      it('includes packmind.json in createOrUpdate', async () => {
        packmindConfigService.createConfigFileModification.mockReturnValue({
          path: 'packmind.json',
          content: '{\n  "packages": {}\n}\n',
        });

        const result = await useCase.execute(command);

        const packmindJsonFile = result.fileUpdates.createOrUpdate.find(
          (file) => file.path === 'packmind.json',
        );
        expect(packmindJsonFile).toBeDefined();
      });
    });
  });
});
