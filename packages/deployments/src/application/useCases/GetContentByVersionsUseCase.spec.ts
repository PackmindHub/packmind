import { stubLogger } from '@packmind/test-utils';
import {
  ArtifactVersionEntry,
  CodingAgents,
  FileUpdates,
  GetContentByVersionsCommand,
  IAccountsPort,
  ICodingAgentPort,
  IRecipesPort,
  ISkillsPort,
  IStandardsPort,
  Organization,
  OrganizationId,
  RecipeVersion,
  SkillVersion,
  StandardVersion,
  User,
  UserOrganizationMembership,
  createOrganizationId,
  createRecipeId,
  createRecipeVersionId,
  createSkillId,
  createSkillVersionId,
  createSpaceId,
  createStandardId,
  createStandardVersionId,
  createUserId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { RenderModeConfigurationService } from '../services/RenderModeConfigurationService';
import { GetContentByVersionsUseCase } from './GetContentByVersionsUseCase';

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

describe('GetContentByVersionsUseCase', () => {
  let codingAgentPort: jest.Mocked<ICodingAgentPort>;
  let renderModeConfigurationService: jest.Mocked<RenderModeConfigurationService>;
  let skillsPort: jest.Mocked<ISkillsPort>;
  let standardsPort: jest.Mocked<IStandardsPort>;
  let recipesPort: jest.Mocked<IRecipesPort>;
  let accountsPort: jest.Mocked<IAccountsPort>;
  let useCase: GetContentByVersionsUseCase;
  let command: GetContentByVersionsCommand;
  let organizationId: OrganizationId;
  let organization: Organization;

  beforeEach(() => {
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

    skillsPort = {
      listSkillVersions: jest.fn().mockResolvedValue([]),
      getSkillFiles: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<ISkillsPort>;

    standardsPort = {
      listStandardVersions: jest.fn().mockResolvedValue([]),
      getRulesByStandardId: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<IStandardsPort>;

    recipesPort = {
      getRecipeVersion: jest.fn().mockResolvedValue(null),
    } as unknown as jest.Mocked<IRecipesPort>;

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
      artifacts: [],
    };

    const user = createUserWithMembership(
      command.userId,
      organization,
      'member',
    );

    accountsPort.getUserById.mockResolvedValue(user);
    accountsPort.getOrganizationById.mockResolvedValue(organization);

    useCase = new GetContentByVersionsUseCase(
      codingAgentPort,
      renderModeConfigurationService,
      skillsPort,
      standardsPort,
      recipesPort,
      accountsPort,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when artifacts array is empty', () => {
    it('returns empty file updates', async () => {
      const result = await useCase.execute(command);

      expect(result.fileUpdates).toEqual({ createOrUpdate: [], delete: [] });
    });

    it('returns empty skill folders', async () => {
      const result = await useCase.execute(command);

      expect(result.skillFolders).toEqual([]);
    });
  });

  describe('when artifacts contain mixed types', () => {
    const spaceId = createSpaceId(uuidv4());
    const recipeId = createRecipeId(uuidv4());
    const standardId = createStandardId(uuidv4());
    const skillId = createSkillId(uuidv4());

    const recipeVersion: RecipeVersion = {
      id: createRecipeVersionId(uuidv4()),
      recipeId,
      name: 'test-recipe',
      slug: 'test-recipe',
      content: 'recipe content',
      version: 2,
      userId: createUserId(uuidv4()),
    };

    const standardVersion: StandardVersion = {
      id: createStandardVersionId(uuidv4()),
      standardId,
      name: 'test-standard',
      slug: 'test-standard',
      description: 'test description',
      version: 3,
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

    const artifacts: ArtifactVersionEntry[] = [
      {
        name: 'test-recipe',
        type: 'command',
        id: recipeId as string,
        version: 2,
        spaceId: spaceId as string,
      },
      {
        name: 'test-standard',
        type: 'standard',
        id: standardId as string,
        version: 3,
        spaceId: spaceId as string,
      },
      {
        name: 'test-skill',
        type: 'skill',
        id: skillId as string,
        version: 1,
        spaceId: spaceId as string,
      },
    ];

    beforeEach(() => {
      command.artifacts = artifacts;

      recipesPort.getRecipeVersion.mockResolvedValue(recipeVersion);
      standardsPort.listStandardVersions.mockResolvedValue([standardVersion]);
      skillsPort.listSkillVersions.mockResolvedValue([skillVersion]);

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
            artifactVersion: standardVersion.version,
          }),
          expect.objectContaining({
            path: '.packmind/commands/test-recipe.md',
            artifactId: recipeId as string,
            spaceId: spaceId as string,
            artifactVersion: recipeVersion.version,
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

    it('fetches recipe version with correct id and version number', async () => {
      await useCase.execute(command);

      expect(recipesPort.getRecipeVersion).toHaveBeenCalledWith(
        recipeId,
        2,
      );
    });

    it('fetches standard versions for matching', async () => {
      await useCase.execute(command);

      expect(standardsPort.listStandardVersions).toHaveBeenCalledWith(
        standardId,
      );
    });

    it('fetches rules for each matched standard', async () => {
      await useCase.execute(command);

      expect(standardsPort.getRulesByStandardId).toHaveBeenCalledWith(
        standardId,
      );
    });

    it('fetches skill files for each matched skill version', async () => {
      await useCase.execute(command);

      expect(skillsPort.getSkillFiles).toHaveBeenCalledWith(skillVersion.id);
    });

    it('calls deployArtifactsForAgents with fetched versions', async () => {
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
          skillVersions: [
            expect.objectContaining({
              id: skillVersion.id,
              files: [],
            }),
          ],
        }),
      );
    });
  });

  describe('when a version is not found for an artifact', () => {
    const spaceId = createSpaceId(uuidv4());
    const recipeId = createRecipeId(uuidv4());

    beforeEach(() => {
      command.artifacts = [
        {
          name: 'missing-recipe',
          type: 'command',
          id: recipeId as string,
          version: 99,
          spaceId: spaceId as string,
        },
      ];

      recipesPort.getRecipeVersion.mockResolvedValue(null);
    });

    it('skips the missing artifact and returns empty results', async () => {
      const result = await useCase.execute(command);

      expect(result.fileUpdates).toEqual({ createOrUpdate: [], delete: [] });
    });
  });

  describe('when agents are provided in command', () => {
    it('uses command agents instead of org-level config', async () => {
      command.agents = [CodingAgents.cursor, CodingAgents.claude];

      await useCase.execute(command);

      expect(
        renderModeConfigurationService.resolveActiveCodingAgents,
      ).not.toHaveBeenCalled();
    });
  });

  describe('when agents are not provided in command', () => {
    it('uses organization-level render mode configuration', async () => {
      delete command.agents;

      await useCase.execute(command);

      expect(
        renderModeConfigurationService.resolveActiveCodingAgents,
      ).toHaveBeenCalledWith(organization.id);
    });
  });
});
