import { stubLogger } from '@packmind/test-utils';
import { PackmindEventEmitterService } from '@packmind/node-utils';
import {
  FileUpdates,
  IAccountsPort,
  ICodingAgentPort,
  IRecipesPort,
  ISkillsPort,
  IStandardsPort,
  Organization,
  OrganizationId,
  PackageWithArtefacts,
  PullContentCommand,
  Recipe,
  RecipeVersion,
  Skill,
  SkillVersion,
  Standard,
  StandardVersion,
  User,
  UserOrganizationMembership,
  createOrganizationId,
  createPackageId,
  createRecipeId,
  createRecipeVersionId,
  createSkillId,
  createSkillVersionId,
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
  let skillsPort: jest.Mocked<ISkillsPort>;
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

    skillsPort = {
      listSkillVersions: jest.fn(),
    } as unknown as jest.Mocked<ISkillsPort>;

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
      skillsPort,
      codingAgentPort,
      renderModeConfigurationService,
      accountsPort,
      eventEmitterService,
      packmindConfigService,
      stubLogger(),
    );
  });

  afterEach(() => jest.clearAllMocks());

  describe('constructor', () => {
    it('accepts ISkillsPort as a dependency', () => {
      expect(() => {
        new PullContentUseCase(
          packageService,
          recipesPort,
          standardsPort,
          skillsPort,
          codingAgentPort,
          renderModeConfigurationService,
          accountsPort,
          eventEmitterService,
          packmindConfigService,
          stubLogger(),
        );
      }).not.toThrow();
    });
  });

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
        skills: [],
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
        skills: [],
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
          skills: [],
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
        skills: [],
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

    describe('when package contains skills', () => {
      let testPackage: PackageWithArtefacts;
      let skill: Skill;
      let skillVersion: SkillVersion;

      beforeEach(() => {
        skill = {
          id: createSkillId('skill-1'),
          name: 'Test Skill',
          slug: 'test-skill',
          description: 'Test skill description',
          prompt: 'Test prompt',
          version: 1,
          userId: createUserId('user-1'),
          spaceId: createSpaceId('space-1'),
        };

        skillVersion = {
          id: createSkillVersionId('skill-version-1'),
          skillId: skill.id,
          name: 'Test Skill',
          slug: 'test-skill',
          description: 'Test skill description',
          prompt: 'Test prompt',
          version: 1,
          userId: createUserId('user-1'),
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
          skills: [skill],
        };

        packageService.getPackagesBySlugsWithArtefacts.mockResolvedValue([
          testPackage,
        ]);

        recipesPort.listRecipeVersions.mockResolvedValue([]);
        standardsPort.listStandardVersions.mockResolvedValue([]);
        skillsPort.listSkillVersions.mockResolvedValue([skillVersion]);

        mockDeployer.deployArtifacts.mockResolvedValue({
          createOrUpdate: [],
          delete: [],
        } as FileUpdates);
      });

      it('fetches skill versions from skillsPort', async () => {
        await useCase.execute(command);

        expect(skillsPort.listSkillVersions).toHaveBeenCalledWith(skill.id);
      });

      it('passes skill versions to deployArtifacts', async () => {
        await useCase.execute(command);

        expect(mockDeployer.deployArtifacts).toHaveBeenCalledWith(
          [],
          [],
          [skillVersion],
        );
      });

      it('emits ArtifactsPulledEvent with skillCount', async () => {
        await useCase.execute(command);

        expect(eventEmitterService.emit).toHaveBeenCalledWith(
          expect.objectContaining({
            payload: expect.objectContaining({
              skillCount: 1,
            }),
          }),
        );
      });

      it('deduplicates skills shared across multiple packages', async () => {
        const secondPackage: PackageWithArtefacts = {
          id: createPackageId('test-package-2-id'),
          slug: 'test-package-2',
          name: 'Test Package 2',
          description: 'Test package 2 description',
          spaceId: createSpaceId('space-1'),
          createdBy: createUserId('user-1'),
          recipes: [],
          standards: [],
          skills: [skill],
        };

        packageService.getPackagesBySlugsWithArtefacts.mockResolvedValue([
          testPackage,
          secondPackage,
        ]);

        command.packagesSlugs = ['test-package', 'test-package-2'];

        await useCase.execute(command);

        expect(skillsPort.listSkillVersions).toHaveBeenCalledTimes(1);
        expect(skillsPort.listSkillVersions).toHaveBeenCalledWith(skill.id);
      });

      it('fetches latest version from multiple versions', async () => {
        const olderVersion: SkillVersion = {
          ...skillVersion,
          id: createSkillVersionId('skill-version-0'),
          version: 1,
        };

        const newerVersion: SkillVersion = {
          ...skillVersion,
          id: createSkillVersionId('skill-version-2'),
          version: 2,
        };

        skillsPort.listSkillVersions.mockResolvedValue([
          newerVersion,
          olderVersion,
        ]);

        await useCase.execute(command);

        expect(mockDeployer.deployArtifacts).toHaveBeenCalledWith(
          [],
          [],
          [newerVersion],
        );
      });
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
          skills: [],
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
          skills: [],
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

    describe('when package belongs to a different organization', () => {
      beforeEach(() => {
        // Package exists but belongs to a different organization
        // Repository filters by organization, so it returns empty array
        packageService.getPackagesBySlugsWithArtefacts.mockResolvedValue([]);
      });

      it('throws PackagesNotFoundError', async () => {
        await expect(useCase.execute(command)).rejects.toThrow(
          'Package "test-package" was not found',
        );
      });

      it('passes the organization ID to packageService', async () => {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        await useCase.execute(command).catch(() => {});

        expect(
          packageService.getPackagesBySlugsWithArtefacts,
        ).toHaveBeenCalledWith(['test-package'], organization.id);
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
          skills: [],
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
          skills: [],
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
    let sharedSkill: Skill;
    let uniqueSkill: Skill;
    let sharedRecipeVersion: RecipeVersion;
    let uniqueRecipeVersion: RecipeVersion;
    let sharedStandardVersion: StandardVersion;
    let uniqueStandardVersion: StandardVersion;
    let sharedSkillVersion: SkillVersion;
    let uniqueSkillVersion: SkillVersion;
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

      sharedSkill = {
        id: createSkillId('shared-skill-id'),
        name: 'Shared Skill',
        slug: 'shared-skill',
        description: 'shared skill description',
        prompt: 'shared prompt',
        version: 1,
        userId,
        spaceId,
      };

      uniqueSkill = {
        id: createSkillId('unique-skill-id'),
        name: 'Unique Skill',
        slug: 'unique-skill',
        description: 'unique skill description',
        prompt: 'unique prompt',
        version: 1,
        userId,
        spaceId,
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

      sharedSkillVersion = {
        id: createSkillVersionId('skv-shared'),
        skillId: sharedSkill.id,
        name: 'Shared Skill',
        slug: 'shared-skill',
        description: 'shared skill description',
        prompt: 'shared prompt',
        version: 1,
        userId,
      };

      uniqueSkillVersion = {
        id: createSkillVersionId('skv-unique'),
        skillId: uniqueSkill.id,
        name: 'Unique Skill',
        slug: 'unique-skill',
        description: 'unique skill description',
        prompt: 'unique prompt',
        version: 1,
        userId,
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
        skills: [sharedSkill, uniqueSkill],
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
        skills: [sharedSkill],
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

        skillsPort.listSkillVersions
          .mockResolvedValueOnce([sharedSkillVersion])
          .mockResolvedValueOnce([sharedSkillVersion])
          .mockResolvedValueOnce([uniqueSkillVersion]);

        mockDeployer.generateRemovalFileUpdates.mockResolvedValue({
          createOrUpdate: [],
          delete: [
            { path: '.packmind/commands/unique-recipe.md' },
            { path: '.packmind/standards/unique-standard.md' },
            { path: '.packmind/skills/unique-skill.md' },
          ],
        });
      });

      it('does not delete shared recipe files', async () => {
        const result = await useCase.execute(command);

        const deletedPaths = result.fileUpdates.delete.map((f) => f.path);
        expect(deletedPaths).not.toContain(
          '.packmind/commands/shared-recipe.md',
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
        expect(deletedPaths).toContain('.packmind/commands/unique-recipe.md');
      });

      it('deletes unique standard files from removed package', async () => {
        const result = await useCase.execute(command);

        const deletedPaths = result.fileUpdates.delete.map((f) => f.path);
        expect(deletedPaths).toContain(
          '.packmind/standards/unique-standard.md',
        );
      });

      it('does not delete shared skill files', async () => {
        const result = await useCase.execute(command);

        const deletedPaths = result.fileUpdates.delete.map((f) => f.path);
        expect(deletedPaths).not.toContain('.packmind/skills/shared-skill.md');
      });

      it('deletes unique skill files from removed package', async () => {
        const result = await useCase.execute(command);

        const deletedPaths = result.fileUpdates.delete.map((f) => f.path);
        expect(deletedPaths).toContain('.packmind/skills/unique-skill.md');
      });
    });

    describe('when all artifacts are shared with remaining packages', () => {
      beforeEach(() => {
        const packageAOnlyShared: PackageWithArtefacts = {
          ...packageA,
          recipes: [sharedRecipe],
          standards: [sharedStandard],
          skills: [sharedSkill],
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
        skillsPort.listSkillVersions.mockResolvedValue([sharedSkillVersion]);
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
          skills: [uniqueSkill],
        };

        const packageBDifferent: PackageWithArtefacts = {
          ...packageB,
          recipes: [],
          standards: [],
          skills: [],
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
        skillsPort.listSkillVersions.mockResolvedValue([uniqueSkillVersion]);

        mockDeployer.generateRemovalFileUpdates.mockResolvedValue({
          createOrUpdate: [],
          delete: [
            { path: '.packmind/commands/unique-recipe.md' },
            { path: '.packmind/standards/unique-standard.md' },
            { path: '.packmind/skills/unique-skill.md' },
          ],
        });
      });

      it('deletes unique recipe from removed package', async () => {
        const result = await useCase.execute(command);

        const deletedPaths = result.fileUpdates.delete.map((f) => f.path);
        expect(deletedPaths).toContain('.packmind/commands/unique-recipe.md');
      });

      it('deletes unique standard from removed package', async () => {
        const result = await useCase.execute(command);

        const deletedPaths = result.fileUpdates.delete.map((f) => f.path);
        expect(deletedPaths).toContain(
          '.packmind/standards/unique-standard.md',
        );
      });

      it('deletes unique skill from removed package', async () => {
        const result = await useCase.execute(command);

        const deletedPaths = result.fileUpdates.delete.map((f) => f.path);
        expect(deletedPaths).toContain('.packmind/skills/unique-skill.md');
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

        skillsPort.listSkillVersions
          .mockResolvedValueOnce([sharedSkillVersion])
          .mockResolvedValueOnce([uniqueSkillVersion]);

        mockDeployer.generateRemovalFileUpdates.mockResolvedValue({
          createOrUpdate: [],
          delete: [
            { path: '.packmind/commands/shared-recipe.md' },
            { path: '.packmind/commands/unique-recipe.md' },
            { path: '.packmind/standards/shared-standard.md' },
            { path: '.packmind/standards/unique-standard.md' },
            { path: '.packmind/skills/shared-skill.md' },
            { path: '.packmind/skills/unique-skill.md' },
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
        ).toHaveBeenCalledWith(['package-a'], organization.id);
      });

      it('calls generateRemovalFileUpdates with all artifacts from removed package', async () => {
        await useCase.execute(command);

        expect(mockDeployer.generateRemovalFileUpdates).toHaveBeenCalledWith(
          {
            recipeVersions: [sharedRecipeVersion, uniqueRecipeVersion],
            standardVersions: [sharedStandardVersion, uniqueStandardVersion],
            skillVersions: [sharedSkillVersion, uniqueSkillVersion],
          },
          {
            recipeVersions: [],
            standardVersions: [],
            skillVersions: [],
          },
        );
      });

      it('marks shared recipe for deletion', async () => {
        const result = await useCase.execute(command);

        const deletedPaths = result.fileUpdates.delete.map((f) => f.path);
        expect(deletedPaths).toContain('.packmind/commands/shared-recipe.md');
      });

      it('marks unique recipe for deletion', async () => {
        const result = await useCase.execute(command);

        const deletedPaths = result.fileUpdates.delete.map((f) => f.path);
        expect(deletedPaths).toContain('.packmind/commands/unique-recipe.md');
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

      it('marks shared skill for deletion', async () => {
        const result = await useCase.execute(command);

        const deletedPaths = result.fileUpdates.delete.map((f) => f.path);
        expect(deletedPaths).toContain('.packmind/skills/shared-skill.md');
      });

      it('marks unique skill for deletion', async () => {
        const result = await useCase.execute(command);

        const deletedPaths = result.fileUpdates.delete.map((f) => f.path);
        expect(deletedPaths).toContain('.packmind/skills/unique-skill.md');
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
