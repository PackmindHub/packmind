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
  RenderMode,
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
  createTargetId,
  createUserId,
  CodingAgents,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { PackageService } from '../services/PackageService';
import { PackmindConfigService } from '../services/PackmindConfigService';
import { RenderModeConfigurationService } from '../services/RenderModeConfigurationService';
import { PullContentUseCase } from './PullContentUseCase';
import { IDistributionRepository } from '../../domain/repositories/IDistributionRepository';
import { TargetResolutionService } from '../services/TargetResolutionService';

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
  let distributionRepository: jest.Mocked<IDistributionRepository>;
  let targetResolutionService: jest.Mocked<TargetResolutionService>;
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
      getSkillFiles: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<ISkillsPort>;

    const mockDeployer = {
      generateFileUpdatesForRecipes: jest.fn(),
      generateFileUpdatesForStandards: jest.fn(),
      generateFileUpdatesForSkills: jest.fn(),
      deployArtifacts: jest.fn(),
      generateRemovalFileUpdates: jest.fn(),
    };

    const mockRegistry = {
      getDeployer: jest.fn().mockReturnValue(mockDeployer),
    };

    codingAgentPort = {
      prepareRecipesDeployment: jest.fn(),
      prepareStandardsDeployment: jest.fn(),
      getDeployerRegistry: jest.fn().mockReturnValue(mockRegistry),
      deployArtifactsForAgents: jest.fn().mockResolvedValue({
        createOrUpdate: [],
        delete: [],
      }),
      generateRemovalUpdatesForAgents: jest.fn().mockResolvedValue({
        createOrUpdate: [],
        delete: [],
      }),
      generateAgentCleanupUpdatesForAgents: jest.fn().mockResolvedValue({
        createOrUpdate: [],
        delete: [],
      }),
      getAgentFilePath: jest.fn(),
      getAgentSkillPath: jest.fn(),
      getSupportedAgents: jest.fn(),
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
      resolveActiveCodingAgents: jest.fn(),
      mapRenderModesToCodingAgents: jest.fn(),
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
    renderModeConfigurationService.mapRenderModesToCodingAgents.mockReturnValue(
      [],
    );

    distributionRepository = {
      findActiveSkillVersionsByTargetAndPackages: jest
        .fn()
        .mockResolvedValue([]),
      findActiveStandardVersionsByTargetAndPackages: jest
        .fn()
        .mockResolvedValue([]),
      findActiveRecipeVersionsByTargetAndPackages: jest
        .fn()
        .mockResolvedValue([]),
      findActiveRenderModesByTarget: jest.fn().mockResolvedValue([]),
      findActiveRecipeVersionsByTarget: jest.fn().mockResolvedValue([]),
      findActiveStandardVersionsByTarget: jest.fn().mockResolvedValue([]),
      findActiveSkillVersionsByTarget: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<IDistributionRepository>;

    targetResolutionService = {
      findTargetFromGitInfo: jest.fn().mockResolvedValue(null),
      findPreviouslyDeployedVersions: jest.fn().mockResolvedValue({
        standardVersions: [],
        recipeVersions: [],
        skillVersions: [],
      }),
    } as unknown as jest.Mocked<TargetResolutionService>;

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
      distributionRepository,
      targetResolutionService,
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
          distributionRepository,
          targetResolutionService,
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
      generateFileUpdatesForSkills: jest.Mock;
      deployArtifacts: jest.Mock;
      generateRemovalFileUpdates: jest.Mock;
    };
    let mockRegistry: {
      getDeployer: jest.Mock;
    };

    beforeEach(() => {
      mockDeployer = {
        generateFileUpdatesForRecipes: jest.fn(),
        generateFileUpdatesForStandards: jest.fn(),
        generateFileUpdatesForSkills: jest.fn(),
        deployArtifacts: jest.fn(),
        generateRemovalFileUpdates: jest.fn(),
      };

      mockRegistry = {
        getDeployer: jest.fn().mockReturnValue(mockDeployer),
      };

      (codingAgentPort.getDeployerRegistry as jest.Mock).mockReturnValue(
        mockRegistry,
      );
    });

    describe('when deployer returns file updates', () => {
      let result: Awaited<ReturnType<PullContentUseCase['execute']>>;

      beforeEach(async () => {
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

        result = await useCase.execute(command);
      });

      it('returns a defined result', () => {
        expect(result).toBeDefined();
      });

      it('returns fileUpdates object', () => {
        expect(result.fileUpdates).toBeDefined();
      });

      it('returns createOrUpdate as an array', () => {
        expect(result.fileUpdates.createOrUpdate).toBeInstanceOf(Array);
      });

      it('returns delete as an array', () => {
        expect(result.fileUpdates.delete).toBeInstanceOf(Array);
      });
    });

    describe('when merging file updates from recipes and standards', () => {
      let result: Awaited<ReturnType<PullContentUseCase['execute']>>;

      beforeEach(async () => {
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

        result = await useCase.execute(command);
      });

      it('returns createOrUpdate as an array', () => {
        expect(result.fileUpdates.createOrUpdate).toBeInstanceOf(Array);
      });

      it('returns delete as an array', () => {
        expect(result.fileUpdates.delete).toBeInstanceOf(Array);
      });
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
        skillsPort.listSkillVersions.mockResolvedValue([]);

        codingAgentPort.deployArtifactsForAgents.mockResolvedValue({
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

      codingAgentPort.deployArtifactsForAgents.mockResolvedValue({
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

        codingAgentPort.deployArtifactsForAgents.mockResolvedValue({
          createOrUpdate: [],
          delete: [],
        } as FileUpdates);
      });

      it('fetches skill versions from skillsPort', async () => {
        await useCase.execute(command);

        expect(skillsPort.listSkillVersions).toHaveBeenCalledWith(skill.id);
      });

      it('passes skill versions to deployArtifactsForAgents', async () => {
        await useCase.execute(command);

        expect(codingAgentPort.deployArtifactsForAgents).toHaveBeenCalledWith({
          recipeVersions: [],
          standardVersions: [],
          skillVersions: [{ ...skillVersion, files: [] }],
          codingAgents: [CodingAgents.packmind, CodingAgents.agents_md],
        });
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

      describe('when skill is shared across multiple packages', () => {
        beforeEach(async () => {
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
        });

        it('fetches skill versions only once', () => {
          expect(skillsPort.listSkillVersions).toHaveBeenCalledTimes(1);
        });

        it('fetches skill versions with the skill id', () => {
          expect(skillsPort.listSkillVersions).toHaveBeenCalledWith(skill.id);
        });
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

        expect(codingAgentPort.deployArtifactsForAgents).toHaveBeenCalledWith({
          recipeVersions: [],
          standardVersions: [],
          skillVersions: [{ ...newerVersion, files: [] }],
          codingAgents: [CodingAgents.packmind, CodingAgents.agents_md],
        });
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
        skillsPort.listSkillVersions.mockResolvedValue([]);

        codingAgentPort.deployArtifactsForAgents.mockResolvedValue({
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

      it('calls PackmindConfigService with package slugs and undefined agents', async () => {
        await useCase.execute(command);

        expect(
          packmindConfigService.createConfigFileModification,
        ).toHaveBeenCalledWith(['test-package'], undefined, undefined);
      });

      describe('when agents are provided in command', () => {
        beforeEach(() => {
          command = {
            ...command,
            agents: [CodingAgents.claude, CodingAgents.cursor],
          };
        });

        it('passes agents to PackmindConfigService', async () => {
          await useCase.execute(command);

          expect(
            packmindConfigService.createConfigFileModification,
          ).toHaveBeenCalledWith(['test-package'], undefined, [
            CodingAgents.claude,
            CodingAgents.cursor,
          ]);
        });
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
        skillsPort.listSkillVersions.mockResolvedValue([]);

        codingAgentPort.deployArtifactsForAgents.mockResolvedValue({
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

    describe('skillFolders generation', () => {
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
          skills: [],
        };

        packageService.getPackagesBySlugsWithArtefacts.mockResolvedValue([
          testPackage,
        ]);

        recipesPort.listRecipeVersions.mockResolvedValue([]);
        standardsPort.listStandardVersions.mockResolvedValue([]);
        skillsPort.listSkillVersions.mockResolvedValue([]);

        codingAgentPort.deployArtifactsForAgents.mockResolvedValue({
          createOrUpdate: [],
          delete: [],
        } as FileUpdates);
      });

      describe('when package has no skills', () => {
        beforeEach(() => {
          codingAgentPort.getSkillsFolderPathForAgents.mockReturnValue(
            new Map([
              ['packmind', undefined],
              ['agents_md', undefined],
            ]),
          );
        });

        it('returns empty skillFolders array', async () => {
          const result = await useCase.execute(command);

          expect(result.skillFolders).toEqual([]);
        });
      });

      describe('when agents support skills', () => {
        beforeEach(() => {
          testPackage.skills = [skill];
          packageService.getPackagesBySlugsWithArtefacts.mockResolvedValue([
            testPackage,
          ]);
          skillsPort.listSkillVersions.mockResolvedValue([skillVersion]);

          renderModeConfigurationService.resolveActiveCodingAgents.mockResolvedValue(
            [CodingAgents.claude],
          );
          codingAgentPort.getSkillsFolderPathForAgents.mockReturnValue(
            new Map([['claude', '.claude/skills/']]),
          );
        });

        it('returns skillFolders for the agent', async () => {
          const result = await useCase.execute(command);

          expect(result.skillFolders).toEqual(['.claude/skills/test-skill']);
        });
      });

      describe('when agents do not support skills', () => {
        beforeEach(() => {
          testPackage.skills = [skill];
          packageService.getPackagesBySlugsWithArtefacts.mockResolvedValue([
            testPackage,
          ]);
          skillsPort.listSkillVersions.mockResolvedValue([skillVersion]);

          codingAgentPort.getSkillsFolderPathForAgents.mockReturnValue(
            new Map([
              ['packmind', undefined],
              ['agents_md', undefined],
            ]),
          );
        });

        it('returns empty skillFolders array', async () => {
          const result = await useCase.execute(command);

          expect(result.skillFolders).toEqual([]);
        });
      });

      describe('when multiple skills and agents are present', () => {
        let skillA: Skill;
        let skillB: Skill;
        let skillVersionA: SkillVersion;
        let skillVersionB: SkillVersion;

        beforeEach(() => {
          skillA = {
            id: createSkillId('skill-a'),
            name: 'Skill A',
            slug: 'skill-a',
            description: 'Skill A description',
            prompt: 'Skill A prompt',
            version: 1,
            userId: createUserId('user-1'),
            spaceId: createSpaceId('space-1'),
          };

          skillB = {
            id: createSkillId('skill-b'),
            name: 'Skill B',
            slug: 'skill-b',
            description: 'Skill B description',
            prompt: 'Skill B prompt',
            version: 1,
            userId: createUserId('user-1'),
            spaceId: createSpaceId('space-1'),
          };

          skillVersionA = {
            id: createSkillVersionId('skill-version-a'),
            skillId: skillA.id,
            name: 'Skill A',
            slug: 'skill-a',
            description: 'Skill A description',
            prompt: 'Skill A prompt',
            version: 1,
            userId: createUserId('user-1'),
          };

          skillVersionB = {
            id: createSkillVersionId('skill-version-b'),
            skillId: skillB.id,
            name: 'Skill B',
            slug: 'skill-b',
            description: 'Skill B description',
            prompt: 'Skill B prompt',
            version: 1,
            userId: createUserId('user-1'),
          };

          testPackage.skills = [skillA, skillB];
          packageService.getPackagesBySlugsWithArtefacts.mockResolvedValue([
            testPackage,
          ]);
          skillsPort.listSkillVersions
            .mockResolvedValueOnce([skillVersionA])
            .mockResolvedValueOnce([skillVersionB]);

          renderModeConfigurationService.resolveActiveCodingAgents.mockResolvedValue(
            [CodingAgents.claude, CodingAgents.copilot],
          );
          codingAgentPort.getSkillsFolderPathForAgents.mockReturnValue(
            new Map([
              ['claude', '.claude/skills/'],
              ['copilot', '.github/skills/'],
            ]),
          );
        });

        it('returns skillFolders for all skill-agent combinations', async () => {
          const result = await useCase.execute(command);

          expect(result.skillFolders).toEqual([
            '.claude/skills/skill-a',
            '.claude/skills/skill-b',
            '.github/skills/skill-a',
            '.github/skills/skill-b',
          ]);
        });
      });

      describe('when skills are removed from packages', () => {
        let installedSkill: Skill;
        let removedSkill: Skill;
        let installedSkillVersion: SkillVersion;
        let removedSkillVersion: SkillVersion;
        let currentPackage: PackageWithArtefacts;
        let previousPackage: PackageWithArtefacts;

        beforeEach(() => {
          installedSkill = {
            id: createSkillId('installed-skill'),
            name: 'Installed Skill',
            slug: 'installed-skill',
            description: 'Installed skill description',
            prompt: 'Installed prompt',
            version: 1,
            userId: createUserId('user-1'),
            spaceId: createSpaceId('space-1'),
          };

          removedSkill = {
            id: createSkillId('removed-skill'),
            name: 'Removed Skill',
            slug: 'removed-skill',
            description: 'Removed skill description',
            prompt: 'Removed prompt',
            version: 1,
            userId: createUserId('user-1'),
            spaceId: createSpaceId('space-1'),
          };

          installedSkillVersion = {
            id: createSkillVersionId('installed-skill-version'),
            skillId: installedSkill.id,
            name: 'Installed Skill',
            slug: 'installed-skill',
            description: 'Installed skill description',
            prompt: 'Installed prompt',
            version: 1,
            userId: createUserId('user-1'),
          };

          removedSkillVersion = {
            id: createSkillVersionId('removed-skill-version'),
            skillId: removedSkill.id,
            name: 'Removed Skill',
            slug: 'removed-skill',
            description: 'Removed skill description',
            prompt: 'Removed prompt',
            version: 1,
            userId: createUserId('user-1'),
          };

          currentPackage = {
            id: createPackageId('test-package-id'),
            slug: 'test-package',
            name: 'Test Package',
            description: 'Test package description',
            spaceId: createSpaceId('space-1'),
            createdBy: createUserId('user-1'),
            recipes: [],
            standards: [],
            skills: [installedSkill],
          };

          previousPackage = {
            id: createPackageId('test-package-id'),
            slug: 'test-package',
            name: 'Test Package',
            description: 'Test package description',
            spaceId: createSpaceId('space-1'),
            createdBy: createUserId('user-1'),
            recipes: [],
            standards: [],
            skills: [installedSkill, removedSkill],
          };

          command = {
            ...command,
            packagesSlugs: ['test-package'],
            previousPackagesSlugs: ['test-package'],
          };

          packageService.getPackagesBySlugsWithArtefacts
            .mockResolvedValueOnce([currentPackage])
            .mockResolvedValueOnce([previousPackage]);

          recipesPort.listRecipeVersions.mockResolvedValue([]);
          standardsPort.listStandardVersions.mockResolvedValue([]);
          skillsPort.listSkillVersions
            .mockResolvedValueOnce([installedSkillVersion])
            .mockResolvedValueOnce([installedSkillVersion])
            .mockResolvedValueOnce([removedSkillVersion]);

          renderModeConfigurationService.resolveActiveCodingAgents.mockResolvedValue(
            [CodingAgents.claude],
          );
          codingAgentPort.getSkillsFolderPathForAgents.mockReturnValue(
            new Map([['claude', '.claude/skills/']]),
          );

          codingAgentPort.generateRemovalUpdatesForAgents.mockResolvedValue({
            createOrUpdate: [],
            delete: [{ path: '.claude/skills/removed-skill/SKILL.md' }],
          });
        });

        it('includes installed skill folder in skillFolders', async () => {
          const result = await useCase.execute(command);

          expect(result.skillFolders).toContain(
            '.claude/skills/installed-skill',
          );
        });

        it('includes removed skill folder in skillFolders for cleanup', async () => {
          const result = await useCase.execute(command);

          expect(result.skillFolders).toContain('.claude/skills/removed-skill');
        });
      });

      describe('when git info is provided for distribution history lookup', () => {
        let testPackage: PackageWithArtefacts;
        let currentSkill: Skill;
        let previouslyDeployedSkill: Skill;
        let currentSkillVersion: SkillVersion;
        let previouslyDeployedSkillVersion: SkillVersion;

        beforeEach(() => {
          currentSkill = {
            id: createSkillId('current-skill'),
            name: 'Current Skill',
            slug: 'current-skill',
            description: 'Current skill description',
            prompt: 'Current prompt',
            version: 1,
            userId: createUserId('user-1'),
            spaceId: createSpaceId('space-1'),
          };

          previouslyDeployedSkill = {
            id: createSkillId('previously-deployed-skill'),
            name: 'Previously Deployed Skill',
            slug: 'previously-deployed-skill',
            description: 'Previously deployed skill description',
            prompt: 'Previously deployed prompt',
            version: 1,
            userId: createUserId('user-1'),
            spaceId: createSpaceId('space-1'),
          };

          currentSkillVersion = {
            id: createSkillVersionId('current-skill-version'),
            skillId: currentSkill.id,
            name: 'Current Skill',
            slug: 'current-skill',
            description: 'Current skill description',
            prompt: 'Current prompt',
            version: 1,
            userId: createUserId('user-1'),
          };

          previouslyDeployedSkillVersion = {
            id: createSkillVersionId('previously-deployed-skill-version'),
            skillId: previouslyDeployedSkill.id,
            name: 'Previously Deployed Skill',
            slug: 'previously-deployed-skill',
            description: 'Previously deployed skill description',
            prompt: 'Previously deployed prompt',
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
            skills: [currentSkill],
          };

          command = {
            ...command,
            packagesSlugs: ['test-package'],
            gitRemoteUrl: 'https://github.com/owner/repo.git',
            gitBranch: 'main',
            relativePath: '/',
          };

          packageService.getPackagesBySlugsWithArtefacts.mockResolvedValue([
            testPackage,
          ]);

          recipesPort.listRecipeVersions.mockResolvedValue([]);
          standardsPort.listStandardVersions.mockResolvedValue([]);
          skillsPort.listSkillVersions.mockResolvedValue([currentSkillVersion]);

          renderModeConfigurationService.resolveActiveCodingAgents.mockResolvedValue(
            [CodingAgents.claude],
          );
          codingAgentPort.getSkillsFolderPathForAgents.mockReturnValue(
            new Map([['claude', '.claude/skills/']]),
          );
        });

        describe('when previously deployed skills exist in distribution history', () => {
          beforeEach(() => {
            // TargetResolutionService returns previously deployed skill
            targetResolutionService.findPreviouslyDeployedVersions.mockResolvedValue(
              {
                standardVersions: [],
                recipeVersions: [],
                skillVersions: [previouslyDeployedSkillVersion],
              },
            );

            codingAgentPort.generateRemovalUpdatesForAgents.mockResolvedValue({
              createOrUpdate: [],
              delete: [
                { path: '.claude/skills/previously-deployed-skill/SKILL.md' },
              ],
            });
          });

          it('calls targetResolutionService for previously deployed versions', async () => {
            await useCase.execute(command);

            expect(
              targetResolutionService.findPreviouslyDeployedVersions,
            ).toHaveBeenCalled();
          });

          it('includes previously deployed skill folder in skillFolders for cleanup', async () => {
            const result = await useCase.execute(command);

            expect(result.skillFolders).toContain(
              '.claude/skills/previously-deployed-skill',
            );
          });

          it('includes current skill folder in skillFolders', async () => {
            const result = await useCase.execute(command);

            expect(result.skillFolders).toContain(
              '.claude/skills/current-skill',
            );
          });
        });

        describe('when no previously deployed skills exist', () => {
          beforeEach(() => {
            targetResolutionService.findPreviouslyDeployedVersions.mockResolvedValue(
              {
                standardVersions: [],
                recipeVersions: [],
                skillVersions: [],
              },
            );
          });

          it('returns only current skill folders', async () => {
            const result = await useCase.execute(command);

            expect(result.skillFolders).toEqual([
              '.claude/skills/current-skill',
            ]);
          });

          it('does not call generateRemovalUpdatesForAgents', async () => {
            await useCase.execute(command);

            expect(
              codingAgentPort.generateRemovalUpdatesForAgents,
            ).not.toHaveBeenCalled();
          });
        });

        describe('when target resolution returns empty results', () => {
          beforeEach(() => {
            targetResolutionService.findPreviouslyDeployedVersions.mockResolvedValue(
              {
                standardVersions: [],
                recipeVersions: [],
                skillVersions: [],
              },
            );
          });

          it('does not call generateRemovalUpdatesForAgents', async () => {
            await useCase.execute(command);

            expect(
              codingAgentPort.generateRemovalUpdatesForAgents,
            ).not.toHaveBeenCalled();
          });
        });
      });
    });

    describe('when git info is provided for standard distribution history lookup', () => {
      let testPackage: PackageWithArtefacts;
      let currentStandard: Standard;
      let previouslyDeployedStandard: Standard;
      let currentStandardVersion: StandardVersion;
      let previouslyDeployedStandardVersion: StandardVersion;

      beforeEach(() => {
        currentStandard = {
          id: createStandardId('current-standard'),
          name: 'Current Standard',
          slug: 'current-standard',
          description: 'Current standard description',
          version: 1,
          userId: createUserId('user-1'),
          spaceId: createSpaceId('space-1'),
          scope: null,
        };

        previouslyDeployedStandard = {
          id: createStandardId('previously-deployed-standard'),
          name: 'Previously Deployed Standard',
          slug: 'previously-deployed-standard',
          description: 'Previously deployed standard description',
          version: 1,
          userId: createUserId('user-1'),
          spaceId: createSpaceId('space-1'),
          scope: null,
        };

        currentStandardVersion = {
          id: createStandardVersionId('current-standard-version'),
          standardId: currentStandard.id,
          name: 'Current Standard',
          slug: 'current-standard',
          description: 'Current standard description',
          version: 1,
          scope: null,
        };

        previouslyDeployedStandardVersion = {
          id: createStandardVersionId('previously-deployed-standard-version'),
          standardId: previouslyDeployedStandard.id,
          name: 'Previously Deployed Standard',
          slug: 'previously-deployed-standard',
          description: 'Previously deployed standard description',
          version: 1,
          scope: null,
        };

        testPackage = {
          id: createPackageId('test-package-id'),
          slug: 'test-package',
          name: 'Test Package',
          description: 'Test package description',
          spaceId: createSpaceId('space-1'),
          createdBy: createUserId('user-1'),
          recipes: [],
          standards: [currentStandard],
          skills: [],
        };

        command = {
          ...command,
          packagesSlugs: ['test-package'],
          gitRemoteUrl: 'https://github.com/owner/repo.git',
          gitBranch: 'main',
          relativePath: '/',
        };

        packageService.getPackagesBySlugsWithArtefacts.mockResolvedValue([
          testPackage,
        ]);

        recipesPort.listRecipeVersions.mockResolvedValue([]);
        standardsPort.listStandardVersions.mockResolvedValue([
          currentStandardVersion,
        ]);
        skillsPort.listSkillVersions.mockResolvedValue([]);

        renderModeConfigurationService.resolveActiveCodingAgents.mockResolvedValue(
          [CodingAgents.packmind],
        );
        codingAgentPort.getSkillsFolderPathForAgents.mockReturnValue(new Map());
      });

      describe('when previously deployed standards exist in distribution history', () => {
        beforeEach(() => {
          targetResolutionService.findPreviouslyDeployedVersions.mockResolvedValue(
            {
              standardVersions: [previouslyDeployedStandardVersion],
              recipeVersions: [],
              skillVersions: [],
            },
          );

          codingAgentPort.generateRemovalUpdatesForAgents.mockResolvedValue({
            createOrUpdate: [],
            delete: [
              { path: '.packmind/standards/previously-deployed-standard.md' },
            ],
          });
        });

        it('calls targetResolutionService for previously deployed versions', async () => {
          await useCase.execute(command);

          expect(
            targetResolutionService.findPreviouslyDeployedVersions,
          ).toHaveBeenCalled();
        });

        it('calls generateRemovalUpdatesForAgents with previously deployed standards', async () => {
          await useCase.execute(command);

          expect(
            codingAgentPort.generateRemovalUpdatesForAgents,
          ).toHaveBeenCalledWith(
            expect.objectContaining({
              removed: expect.objectContaining({
                standardVersions: expect.arrayContaining([
                  previouslyDeployedStandardVersion,
                ]),
              }),
            }),
          );
        });

        it('includes deletion paths for previously deployed standards', async () => {
          const result = await useCase.execute(command);

          const deletedPaths = result.fileUpdates.delete.map((f) => f.path);
          expect(deletedPaths).toContain(
            '.packmind/standards/previously-deployed-standard.md',
          );
        });
      });

      describe('when no previously deployed standards exist', () => {
        it('does not call generateRemovalUpdatesForAgents', async () => {
          await useCase.execute(command);

          expect(
            codingAgentPort.generateRemovalUpdatesForAgents,
          ).not.toHaveBeenCalled();
        });
      });
    });

    describe('when git info is provided for recipe distribution history lookup', () => {
      let testPackage: PackageWithArtefacts;
      let currentRecipe: Recipe;
      let previouslyDeployedRecipe: Recipe;
      let currentRecipeVersion: RecipeVersion;
      let previouslyDeployedRecipeVersion: RecipeVersion;

      beforeEach(() => {
        currentRecipe = {
          id: createRecipeId('current-recipe'),
          name: 'Current Recipe',
          slug: 'current-recipe',
          content: 'Current recipe content',
          version: 1,
          userId: createUserId('user-1'),
          spaceId: createSpaceId('space-1'),
        };

        previouslyDeployedRecipe = {
          id: createRecipeId('previously-deployed-recipe'),
          name: 'Previously Deployed Recipe',
          slug: 'previously-deployed-recipe',
          content: 'Previously deployed recipe content',
          version: 1,
          userId: createUserId('user-1'),
          spaceId: createSpaceId('space-1'),
        };

        currentRecipeVersion = {
          id: createRecipeVersionId('current-recipe-version'),
          recipeId: currentRecipe.id,
          name: 'Current Recipe',
          slug: 'current-recipe',
          content: 'Current recipe content',
          version: 1,
          userId: null,
        };

        previouslyDeployedRecipeVersion = {
          id: createRecipeVersionId('previously-deployed-recipe-version'),
          recipeId: previouslyDeployedRecipe.id,
          name: 'Previously Deployed Recipe',
          slug: 'previously-deployed-recipe',
          content: 'Previously deployed recipe content',
          version: 1,
          userId: null,
        };

        testPackage = {
          id: createPackageId('test-package-id'),
          slug: 'test-package',
          name: 'Test Package',
          description: 'Test package description',
          spaceId: createSpaceId('space-1'),
          createdBy: createUserId('user-1'),
          recipes: [currentRecipe],
          standards: [],
          skills: [],
        };

        command = {
          ...command,
          packagesSlugs: ['test-package'],
          gitRemoteUrl: 'https://github.com/owner/repo.git',
          gitBranch: 'main',
          relativePath: '/',
        };

        packageService.getPackagesBySlugsWithArtefacts.mockResolvedValue([
          testPackage,
        ]);

        recipesPort.listRecipeVersions.mockResolvedValue([
          currentRecipeVersion,
        ]);
        standardsPort.listStandardVersions.mockResolvedValue([]);
        skillsPort.listSkillVersions.mockResolvedValue([]);

        renderModeConfigurationService.resolveActiveCodingAgents.mockResolvedValue(
          [CodingAgents.packmind],
        );
        codingAgentPort.getSkillsFolderPathForAgents.mockReturnValue(new Map());
      });

      describe('when previously deployed recipes exist in distribution history', () => {
        beforeEach(() => {
          targetResolutionService.findPreviouslyDeployedVersions.mockResolvedValue(
            {
              standardVersions: [],
              recipeVersions: [previouslyDeployedRecipeVersion],
              skillVersions: [],
            },
          );

          codingAgentPort.generateRemovalUpdatesForAgents.mockResolvedValue({
            createOrUpdate: [],
            delete: [
              { path: '.packmind/commands/previously-deployed-recipe.md' },
            ],
          });
        });

        it('calls targetResolutionService for previously deployed versions', async () => {
          await useCase.execute(command);

          expect(
            targetResolutionService.findPreviouslyDeployedVersions,
          ).toHaveBeenCalled();
        });

        it('calls generateRemovalUpdatesForAgents with previously deployed recipes', async () => {
          await useCase.execute(command);

          expect(
            codingAgentPort.generateRemovalUpdatesForAgents,
          ).toHaveBeenCalledWith(
            expect.objectContaining({
              removed: expect.objectContaining({
                recipeVersions: expect.arrayContaining([
                  previouslyDeployedRecipeVersion,
                ]),
              }),
            }),
          );
        });

        it('includes deletion paths for previously deployed recipes', async () => {
          const result = await useCase.execute(command);

          const deletedPaths = result.fileUpdates.delete.map((f) => f.path);
          expect(deletedPaths).toContain(
            '.packmind/commands/previously-deployed-recipe.md',
          );
        });
      });

      describe('when no previously deployed recipes exist', () => {
        it('does not call generateRemovalUpdatesForAgents', async () => {
          await useCase.execute(command);

          expect(
            codingAgentPort.generateRemovalUpdatesForAgents,
          ).not.toHaveBeenCalled();
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
        generateFileUpdatesForSkills: jest.fn(),
        deployArtifacts: jest.fn(),
        generateRemovalFileUpdates: jest.fn(),
      };

      mockRegistry = {
        getDeployer: jest.fn().mockReturnValue(mockDeployer),
      };

      (codingAgentPort.getDeployerRegistry as jest.Mock).mockReturnValue(
        mockRegistry,
      );

      codingAgentPort.deployArtifactsForAgents.mockResolvedValue({
        createOrUpdate: [],
        delete: [],
      });

      codingAgentPort.generateRemovalUpdatesForAgents.mockResolvedValue({
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
          .mockResolvedValueOnce([packageA])
          .mockResolvedValueOnce([packageA]);

        recipesPort.listRecipeVersions
          .mockResolvedValueOnce([sharedRecipeVersion])
          .mockResolvedValueOnce([sharedRecipeVersion])
          .mockResolvedValueOnce([uniqueRecipeVersion])
          .mockResolvedValueOnce([sharedRecipeVersion])
          .mockResolvedValueOnce([uniqueRecipeVersion]);

        standardsPort.listStandardVersions
          .mockResolvedValueOnce([sharedStandardVersion])
          .mockResolvedValueOnce([sharedStandardVersion])
          .mockResolvedValueOnce([uniqueStandardVersion])
          .mockResolvedValueOnce([sharedStandardVersion])
          .mockResolvedValueOnce([uniqueStandardVersion]);

        skillsPort.listSkillVersions
          .mockResolvedValueOnce([sharedSkillVersion])
          .mockResolvedValueOnce([sharedSkillVersion])
          .mockResolvedValueOnce([uniqueSkillVersion])
          .mockResolvedValueOnce([sharedSkillVersion])
          .mockResolvedValueOnce([uniqueSkillVersion]);

        codingAgentPort.generateRemovalUpdatesForAgents.mockResolvedValue({
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
          .mockResolvedValueOnce([packageAOnlyShared])
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

      it('does not call generateRemovalUpdatesForAgents', async () => {
        await useCase.execute(command);

        expect(
          codingAgentPort.generateRemovalUpdatesForAgents,
        ).not.toHaveBeenCalled();
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
          .mockResolvedValueOnce([packageAUniqueOnly])
          .mockResolvedValueOnce([packageAUniqueOnly]);

        recipesPort.listRecipeVersions.mockResolvedValue([uniqueRecipeVersion]);
        standardsPort.listStandardVersions.mockResolvedValue([
          uniqueStandardVersion,
        ]);
        skillsPort.listSkillVersions.mockResolvedValue([uniqueSkillVersion]);

        codingAgentPort.generateRemovalUpdatesForAgents.mockResolvedValue({
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

        codingAgentPort.generateRemovalUpdatesForAgents.mockResolvedValue({
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

      it('calls generateRemovalUpdatesForAgents with all artifacts from removed package', async () => {
        await useCase.execute(command);

        expect(
          codingAgentPort.generateRemovalUpdatesForAgents,
        ).toHaveBeenCalledWith({
          removed: {
            recipeVersions: [sharedRecipeVersion, uniqueRecipeVersion],
            standardVersions: [sharedStandardVersion, uniqueStandardVersion],
            skillVersions: [sharedSkillVersion, uniqueSkillVersion],
          },
          installed: {
            recipeVersions: [],
            standardVersions: [],
            skillVersions: [],
          },
          codingAgents: [CodingAgents.packmind, CodingAgents.agents_md],
        });
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
        ).toHaveBeenCalledWith([], undefined, undefined);
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

  describe('when agents are provided in command', () => {
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
    });

    describe('with valid agents array', () => {
      beforeEach(() => {
        command = {
          ...command,
          agents: [CodingAgents.claude, CodingAgents.cursor],
        };
      });

      it('uses agents from command instead of org-level config', async () => {
        await useCase.execute(command);

        expect(
          renderModeConfigurationService.resolveActiveCodingAgents,
        ).not.toHaveBeenCalled();
      });

      it('passes normalized agents with packmind to deployArtifactsForAgents', async () => {
        await useCase.execute(command);

        expect(codingAgentPort.deployArtifactsForAgents).toHaveBeenCalledWith(
          expect.objectContaining({
            codingAgents: [
              CodingAgents.packmind,
              CodingAgents.claude,
              CodingAgents.cursor,
            ],
          }),
        );
      });
    });

    describe('with empty agents array', () => {
      beforeEach(() => {
        command = {
          ...command,
          agents: [],
        };
      });

      it('uses agents from command instead of org-level config', async () => {
        await useCase.execute(command);

        expect(
          renderModeConfigurationService.resolveActiveCodingAgents,
        ).not.toHaveBeenCalled();
      });

      it('passes packmind agent to deployArtifactsForAgents', async () => {
        await useCase.execute(command);

        expect(codingAgentPort.deployArtifactsForAgents).toHaveBeenCalledWith(
          expect.objectContaining({
            codingAgents: [CodingAgents.packmind],
          }),
        );
      });
    });

    describe('when agents do not include packmind', () => {
      beforeEach(() => {
        command = {
          ...command,
          agents: [CodingAgents.cursor],
        };
      });

      it('automatically includes packmind agent', async () => {
        await useCase.execute(command);

        expect(codingAgentPort.deployArtifactsForAgents).toHaveBeenCalledWith(
          expect.objectContaining({
            codingAgents: [CodingAgents.packmind, CodingAgents.cursor],
          }),
        );
      });
    });

    describe('when agents is undefined', () => {
      beforeEach(() => {
        command = {
          ...command,
          agents: undefined,
        };
      });

      it('falls back to org-level config', async () => {
        await useCase.execute(command);

        expect(
          renderModeConfigurationService.resolveActiveCodingAgents,
        ).toHaveBeenCalledWith(organization.id);
      });
    });
  });

  describe('when enriching file modifications with artifact metadata', () => {
    let recipe: Recipe;
    let standard: Standard;
    let skill: Skill;
    let recipeVersion: RecipeVersion;
    let standardVersion: StandardVersion;
    let skillVersion: SkillVersion;

    beforeEach(() => {
      const spaceId = createSpaceId('space-enrichment');
      const userId = createUserId('user-1');

      recipe = {
        id: createRecipeId('recipe-enrich'),
        name: 'Enriched Recipe',
        slug: 'enriched-recipe',
        content: 'recipe content',
        version: 1,
        userId,
        spaceId,
      };

      standard = {
        id: createStandardId('standard-enrich'),
        name: 'Enriched Standard',
        slug: 'enriched-standard',
        description: 'standard description',
        version: 1,
        userId,
        spaceId,
        scope: null,
      };

      skill = {
        id: createSkillId('skill-enrich'),
        name: 'Enriched Skill',
        slug: 'enriched-skill',
        description: 'skill description',
        prompt: 'skill prompt',
        version: 1,
        userId,
        spaceId,
      };

      recipeVersion = {
        id: createRecipeVersionId('rv-enrich'),
        recipeId: recipe.id,
        name: 'Enriched Recipe',
        slug: 'enriched-recipe',
        content: 'recipe content',
        version: 1,
        userId: null,
      };

      standardVersion = {
        id: createStandardVersionId('sv-enrich'),
        standardId: standard.id,
        name: 'Enriched Standard',
        slug: 'enriched-standard',
        description: 'standard description',
        version: 1,
        scope: null,
      };

      skillVersion = {
        id: createSkillVersionId('skv-enrich'),
        skillId: skill.id,
        name: 'Enriched Skill',
        slug: 'enriched-skill',
        description: 'skill description',
        prompt: 'skill prompt',
        version: 1,
        userId,
      };

      const testPackage: PackageWithArtefacts = {
        id: createPackageId('package-enrich'),
        slug: 'test-package',
        name: 'Test Package',
        description: 'Test package description',
        spaceId,
        createdBy: userId,
        recipes: [recipe],
        standards: [standard],
        skills: [skill],
      };

      packageService.getPackagesBySlugsWithArtefacts.mockResolvedValue([
        testPackage,
      ]);

      recipesPort.listRecipeVersions.mockResolvedValue([recipeVersion]);
      standardsPort.listStandardVersions.mockResolvedValue([standardVersion]);
      skillsPort.listSkillVersions.mockResolvedValue([skillVersion]);
    });

    describe('when deployed files have artifactType and artifactName', () => {
      beforeEach(() => {
        codingAgentPort.deployArtifactsForAgents.mockResolvedValue({
          createOrUpdate: [
            {
              path: '.packmind/commands/enriched-recipe.md',
              content: 'recipe content',
              artifactType: 'command',
              artifactName: 'Enriched Recipe',
            },
            {
              path: '.packmind/standards/enriched-standard.md',
              content: 'standard content',
              artifactType: 'standard',
              artifactName: 'Enriched Standard',
            },
            {
              path: '.claude/skills/enriched-skill/SKILL.md',
              content: 'skill content',
              artifactType: 'skill',
              artifactName: 'Enriched Skill',
            },
          ],
          delete: [],
        } as FileUpdates);
      });

      it('sets artifactId on recipe file modifications', async () => {
        const result = await useCase.execute(command);

        const recipeFile = result.fileUpdates.createOrUpdate.find(
          (f) => f.path === '.packmind/commands/enriched-recipe.md',
        );
        expect(recipeFile?.artifactId).toBe(recipe.id as string);
      });

      it('sets spaceId on recipe file modifications', async () => {
        const result = await useCase.execute(command);

        const recipeFile = result.fileUpdates.createOrUpdate.find(
          (f) => f.path === '.packmind/commands/enriched-recipe.md',
        );
        expect(recipeFile?.spaceId).toBe(recipe.spaceId as string);
      });

      it('sets artifactId on standard file modifications', async () => {
        const result = await useCase.execute(command);

        const standardFile = result.fileUpdates.createOrUpdate.find(
          (f) => f.path === '.packmind/standards/enriched-standard.md',
        );
        expect(standardFile?.artifactId).toBe(standard.id as string);
      });

      it('sets spaceId on standard file modifications', async () => {
        const result = await useCase.execute(command);

        const standardFile = result.fileUpdates.createOrUpdate.find(
          (f) => f.path === '.packmind/standards/enriched-standard.md',
        );
        expect(standardFile?.spaceId).toBe(standard.spaceId as string);
      });

      it('sets artifactId on skill file modifications', async () => {
        const result = await useCase.execute(command);

        const skillFile = result.fileUpdates.createOrUpdate.find(
          (f) => f.path === '.claude/skills/enriched-skill/SKILL.md',
        );
        expect(skillFile?.artifactId).toBe(skill.id as string);
      });

      it('sets spaceId on skill file modifications', async () => {
        const result = await useCase.execute(command);

        const skillFile = result.fileUpdates.createOrUpdate.find(
          (f) => f.path === '.claude/skills/enriched-skill/SKILL.md',
        );
        expect(skillFile?.spaceId).toBe(skill.spaceId as string);
      });
    });

    describe('when deployed files do not have artifactType', () => {
      beforeEach(() => {
        codingAgentPort.deployArtifactsForAgents.mockResolvedValue({
          createOrUpdate: [
            {
              path: '.packmind/commands/enriched-recipe.md',
              content: 'recipe content',
            },
          ],
          delete: [],
        } as FileUpdates);
      });

      it('does not set artifactId on files without artifactType', async () => {
        const result = await useCase.execute(command);

        const recipeFile = result.fileUpdates.createOrUpdate.find(
          (f) => f.path === '.packmind/commands/enriched-recipe.md',
        );
        expect(recipeFile?.artifactId).toBeUndefined();
      });

      it('does not set spaceId on files without artifactType', async () => {
        const result = await useCase.execute(command);

        const recipeFile = result.fileUpdates.createOrUpdate.find(
          (f) => f.path === '.packmind/commands/enriched-recipe.md',
        );
        expect(recipeFile?.spaceId).toBeUndefined();
      });
    });
  });

  describe('render mode cleanup', () => {
    const gitRemoteUrl = 'https://github.com/packmind/packmind.git';
    const gitBranch = 'main';
    const relativePath = '/';
    const targetId = createTargetId('target-1');

    beforeEach(() => {
      command = {
        ...command,
        gitRemoteUrl,
        gitBranch,
        relativePath,
      };

      packageService.getPackagesBySlugsWithArtefacts.mockResolvedValue([
        {
          id: createPackageId('test-package-id'),
          slug: 'test-package',
          name: 'Test Package',
          description: 'Test package description',
          spaceId: createSpaceId('space-1'),
          createdBy: createUserId('user-1'),
          recipes: [],
          standards: [],
          skills: [],
        },
      ]);

      targetResolutionService.findTargetFromGitInfo.mockResolvedValue({
        id: targetId,
        name: 'default',
        path: '/',
        gitRepoId: 'repo-1' as never,
      });
    });

    describe('when render modes drop an agent', () => {
      beforeEach(() => {
        distributionRepository.findActiveRenderModesByTarget.mockResolvedValue([
          RenderMode.CLAUDE,
        ]);
        renderModeConfigurationService.mapRenderModesToCodingAgents.mockReturnValue(
          [CodingAgents.claude],
        );
        distributionRepository.findActiveRecipeVersionsByTarget.mockResolvedValue(
          [],
        );
        distributionRepository.findActiveStandardVersionsByTarget.mockResolvedValue(
          [],
        );
        distributionRepository.findActiveSkillVersionsByTarget.mockResolvedValue(
          [],
        );
        codingAgentPort.generateAgentCleanupUpdatesForAgents.mockResolvedValue({
          createOrUpdate: [],
          delete: [
            {
              path: '.claude/commands/packmind/',
              type: 'directory',
            },
          ],
        });
      });

      it('merges cleanup updates into file updates', async () => {
        const result = await useCase.execute(command);

        expect(result.fileUpdates.delete).toContainEqual({
          path: '.claude/commands/packmind/',
          type: 'directory',
        });
      });

      it('calls cleanup generation for removed agents', async () => {
        await useCase.execute(command);

        expect(
          codingAgentPort.generateAgentCleanupUpdatesForAgents,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            agents: [CodingAgents.claude],
          }),
        );
      });
    });

    describe('when target is not found', () => {
      beforeEach(() => {
        targetResolutionService.findTargetFromGitInfo.mockResolvedValue(null);
      });

      it('skips agent cleanup', async () => {
        await useCase.execute(command);

        expect(
          codingAgentPort.generateAgentCleanupUpdatesForAgents,
        ).not.toHaveBeenCalled();
      });
    });

    describe('when command agents are empty', () => {
      beforeEach(() => {
        command = {
          ...command,
          agents: [],
        };
        distributionRepository.findActiveRenderModesByTarget.mockResolvedValue([
          RenderMode.CLAUDE,
          RenderMode.CURSOR,
        ]);
        renderModeConfigurationService.mapRenderModesToCodingAgents.mockReturnValue(
          [CodingAgents.claude, CodingAgents.cursor],
        );
      });

      it('treats all previous agents as removed', async () => {
        await useCase.execute(command);

        expect(
          codingAgentPort.generateAgentCleanupUpdatesForAgents,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            agents: [CodingAgents.claude, CodingAgents.cursor],
          }),
        );
      });
    });
  });
});
