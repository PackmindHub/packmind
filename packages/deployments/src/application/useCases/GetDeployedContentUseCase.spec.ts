import { stubLogger } from '@packmind/test-utils';
import {
  CodingAgents,
  FileUpdates,
  GetDeployedContentCommand,
  IAccountsPort,
  ICodingAgentPort,
  ISkillsPort,
  IStandardsPort,
  Organization,
  OrganizationId,
  PackageWithArtefacts,
  Recipe,
  RecipeVersion,
  Skill,
  SkillVersion,
  Standard,
  StandardVersion,
  Target,
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
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { PackageService } from '../services/PackageService';
import { RenderModeConfigurationService } from '../services/RenderModeConfigurationService';
import { TargetResolutionService } from '../services/TargetResolutionService';
import { IDistributionRepository } from '../../domain/repositories/IDistributionRepository';
import { GetDeployedContentUseCase } from './GetDeployedContentUseCase';

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

describe('GetDeployedContentUseCase', () => {
  let targetResolutionService: jest.Mocked<TargetResolutionService>;
  let distributionRepository: jest.Mocked<IDistributionRepository>;
  let codingAgentPort: jest.Mocked<ICodingAgentPort>;
  let renderModeConfigurationService: jest.Mocked<RenderModeConfigurationService>;
  let packageService: jest.Mocked<PackageService>;
  let skillsPort: jest.Mocked<ISkillsPort>;
  let standardsPort: jest.Mocked<IStandardsPort>;
  let accountsPort: jest.Mocked<IAccountsPort>;
  let useCase: GetDeployedContentUseCase;
  let command: GetDeployedContentCommand;
  let organizationId: OrganizationId;
  let organization: Organization;

  beforeEach(() => {
    targetResolutionService = {
      findTargetFromGitInfo: jest.fn().mockResolvedValue(null),
    } as unknown as jest.Mocked<TargetResolutionService>;

    distributionRepository = {
      findActiveStandardVersionsByTarget: jest.fn().mockResolvedValue([]),
      findActiveRecipeVersionsByTarget: jest.fn().mockResolvedValue([]),
      findActiveSkillVersionsByTarget: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<IDistributionRepository>;

    codingAgentPort = {
      deployArtifactsForAgents: jest.fn().mockResolvedValue({
        createOrUpdate: [],
        delete: [],
      }),
      getSkillsFolderPathForAgents: jest.fn().mockReturnValue(new Map()),
    } as unknown as jest.Mocked<ICodingAgentPort>;

    renderModeConfigurationService = {
      resolveActiveCodingAgents: jest
        .fn()
        .mockResolvedValue([CodingAgents.packmind, CodingAgents.claude]),
    } as unknown as jest.Mocked<RenderModeConfigurationService>;

    packageService = {
      getPackagesBySlugsWithArtefacts: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<PackageService>;

    skillsPort = {
      getSkillFiles: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<ISkillsPort>;

    standardsPort = {
      getRulesByStandardId: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<IStandardsPort>;

    accountsPort = {
      getUserById: jest.fn(),
      getOrganizationById: jest.fn(),
    } as unknown as jest.Mocked<IAccountsPort>;

    organizationId = createOrganizationId(uuidv4());
    organization = {
      id: organizationId,
      name: 'Test Org',
      slug: 'test-org',
    };

    command = {
      organizationId: organizationId as unknown as string,
      userId: uuidv4(),
      packagesSlugs: ['test-package'],
      gitRemoteUrl: 'https://github.com/owner/repo.git',
      gitBranch: 'main',
      relativePath: '/',
    };

    const user = createUserWithMembership(
      command.userId,
      organization,
      'member',
    );

    accountsPort.getUserById.mockResolvedValue(user);
    accountsPort.getOrganizationById.mockResolvedValue(organization);

    useCase = new GetDeployedContentUseCase(
      targetResolutionService,
      distributionRepository,
      codingAgentPort,
      renderModeConfigurationService,
      packageService,
      skillsPort,
      standardsPort,
      accountsPort,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when target exists with deployed versions', () => {
    const spaceId = createSpaceId(uuidv4());
    const targetId = createTargetId(uuidv4());
    const recipeId = createRecipeId(uuidv4());
    const standardId = createStandardId(uuidv4());
    const skillId = createSkillId(uuidv4());

    const target: Target = {
      id: targetId,
      name: 'Root',
      path: '/',
    };

    const recipeVersion: RecipeVersion = {
      id: createRecipeVersionId(uuidv4()),
      recipeId,
      name: 'test-recipe',
      slug: 'test-recipe',
      content: 'recipe content',
      version: 1,
      userId: createUserId(uuidv4()),
    };

    const standardVersion: StandardVersion = {
      id: createStandardVersionId(uuidv4()),
      standardId,
      name: 'test-standard',
      slug: 'test-standard',
      description: 'test description',
      version: 1,
      scope: null,
      rules: [],
    };

    const skillVersion: SkillVersion = {
      id: createSkillVersionId(uuidv4()),
      skillId,
      name: 'test-skill',
      slug: 'test-skill',
      description: 'test skill description',
      prompt: 'test prompt',
      version: 1,
      userId: createUserId(uuidv4()),
    };

    const recipe: Recipe = {
      id: recipeId,
      name: 'test-recipe',
      slug: 'test-recipe',
      content: 'recipe content',
      version: 1,
      userId: createUserId(uuidv4()),
      spaceId,
    };

    const standard: Standard = {
      id: standardId,
      name: 'test-standard',
      slug: 'test-standard',
      description: 'test description',
      version: 1,
      userId: createUserId(uuidv4()),
      spaceId,
      scope: null,
    };

    const skill: Skill = {
      id: skillId,
      name: 'test-skill',
      slug: 'test-skill',
      description: 'test skill description',
      prompt: 'test prompt',
      version: 1,
      userId: createUserId(uuidv4()),
      spaceId,
    };

    const packageWithArtefacts: PackageWithArtefacts = {
      id: createPackageId(uuidv4()),
      name: 'test-package',
      slug: 'test-package',
      description: 'test package',
      spaceId,
      createdBy: createUserId(uuidv4()),
      recipes: [recipe],
      standards: [standard],
      skills: [skill],
    };

    beforeEach(() => {
      targetResolutionService.findTargetFromGitInfo.mockResolvedValue(target);
      distributionRepository.findActiveRecipeVersionsByTarget.mockResolvedValue(
        [recipeVersion],
      );
      distributionRepository.findActiveStandardVersionsByTarget.mockResolvedValue(
        [standardVersion],
      );
      distributionRepository.findActiveSkillVersionsByTarget.mockResolvedValue([
        skillVersion,
      ]);
      packageService.getPackagesBySlugsWithArtefacts.mockResolvedValue([
        packageWithArtefacts,
      ]);

      const fileUpdates: FileUpdates = {
        createOrUpdate: [
          {
            path: '.packmind/standards/test-standard.md',
            content: 'standard content',
            artifactType: 'standard',
            artifactName: 'test-standard',
          },
          {
            path: '.packmind/commands/test-recipe.md',
            content: 'recipe content',
            artifactType: 'command',
            artifactName: 'test-recipe',
          },
        ],
        delete: [],
      };

      codingAgentPort.deployArtifactsForAgents.mockResolvedValue(fileUpdates);

      const skillFolderMap = new Map<string, string | undefined>();
      skillFolderMap.set('packmind', '.packmind/skills/');
      skillFolderMap.set('claude', '.claude/skills/');
      codingAgentPort.getSkillsFolderPathForAgents.mockReturnValue(
        skillFolderMap,
      );
    });

    it('returns rendered file updates with artifact metadata', async () => {
      const result = await useCase.execute(command);

      expect(result.fileUpdates.createOrUpdate).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: '.packmind/standards/test-standard.md',
            artifactId: standardId as string,
            spaceId: spaceId as string,
          }),
          expect.objectContaining({
            path: '.packmind/commands/test-recipe.md',
            artifactId: recipeId as string,
            spaceId: spaceId as string,
          }),
        ]),
      );
    });

    it('returns skill folders for all agents', async () => {
      const result = await useCase.execute(command);

      expect(result.skillFolders).toEqual(
        expect.arrayContaining([
          '.packmind/skills/test-skill',
          '.claude/skills/test-skill',
        ]),
      );
    });

    it('fetches skill files for each skill version', async () => {
      await useCase.execute(command);

      expect(skillsPort.getSkillFiles).toHaveBeenCalledWith(skillVersion.id);
    });

    it('fetches rules for each standard version', async () => {
      await useCase.execute(command);

      expect(standardsPort.getRulesByStandardId).toHaveBeenCalledWith(
        standardVersion.standardId,
      );
    });

    it('calls deployArtifactsForAgents with deployed versions including rules', async () => {
      await useCase.execute(command);

      expect(codingAgentPort.deployArtifactsForAgents).toHaveBeenCalledWith(
        expect.objectContaining({
          recipeVersions: [recipeVersion],
          standardVersions: [
            expect.objectContaining({
              id: standardVersion.id,
              rules: [],
            }),
          ],
          skillVersions: expect.arrayContaining([
            expect.objectContaining({ id: skillVersion.id, files: [] }),
          ]),
        }),
      );
    });
  });

  describe('when target is not found', () => {
    beforeEach(() => {
      targetResolutionService.findTargetFromGitInfo.mockResolvedValue(null);
    });

    it('returns empty file updates', async () => {
      const result = await useCase.execute(command);

      expect(result.fileUpdates).toEqual({ createOrUpdate: [], delete: [] });
    });

    it('returns empty skill folders', async () => {
      const result = await useCase.execute(command);

      expect(result.skillFolders).toEqual([]);
    });

    it('does not fetch deployed standard versions', async () => {
      await useCase.execute(command);

      expect(
        distributionRepository.findActiveStandardVersionsByTarget,
      ).not.toHaveBeenCalled();
    });

    it('does not fetch deployed recipe versions', async () => {
      await useCase.execute(command);

      expect(
        distributionRepository.findActiveRecipeVersionsByTarget,
      ).not.toHaveBeenCalled();
    });

    it('does not fetch deployed skill versions', async () => {
      await useCase.execute(command);

      expect(
        distributionRepository.findActiveSkillVersionsByTarget,
      ).not.toHaveBeenCalled();
    });
  });

  describe('when target exists but has no deployed versions', () => {
    const target: Target = {
      id: createTargetId(uuidv4()),
      name: 'Root',
      path: '/',
    };

    beforeEach(() => {
      targetResolutionService.findTargetFromGitInfo.mockResolvedValue(target);
      distributionRepository.findActiveStandardVersionsByTarget.mockResolvedValue(
        [],
      );
      distributionRepository.findActiveRecipeVersionsByTarget.mockResolvedValue(
        [],
      );
      distributionRepository.findActiveSkillVersionsByTarget.mockResolvedValue(
        [],
      );
      codingAgentPort.deployArtifactsForAgents.mockResolvedValue({
        createOrUpdate: [],
        delete: [],
      });
    });

    it('returns empty file updates', async () => {
      const result = await useCase.execute(command);

      expect(result.fileUpdates.createOrUpdate).toEqual([]);
    });
  });

  describe('when agents are provided in command', () => {
    beforeEach(() => {
      targetResolutionService.findTargetFromGitInfo.mockResolvedValue(null);
    });

    it('uses command agents normalized instead of org-level config', async () => {
      command.agents = [CodingAgents.cursor, CodingAgents.claude];

      await useCase.execute(command);

      expect(
        renderModeConfigurationService.resolveActiveCodingAgents,
      ).not.toHaveBeenCalled();
    });
  });

  describe('when agents are not provided in command', () => {
    beforeEach(() => {
      targetResolutionService.findTargetFromGitInfo.mockResolvedValue(null);
    });

    it('uses organization-level render mode configuration', async () => {
      delete command.agents;

      await useCase.execute(command);

      expect(
        renderModeConfigurationService.resolveActiveCodingAgents,
      ).toHaveBeenCalledWith(organization.id);
    });
  });
});
