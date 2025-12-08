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
  User,
  UserOrganizationMembership,
  createOrganizationId,
  createPackageId,
  createSpaceId,
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
  });
});
