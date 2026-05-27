import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import {
  ArtifactVersionEntry,
  CodingAgents,
  FileUpdates,
  GetContentByVersionsCommand,
  IAccountsPort,
  ICodingAgentPort,
  InvalidArtifactIdError,
  IRecipesPort,
  ISkillsPort,
  ISpacesPort,
  IStandardsPort,
  Organization,
  OrganizationId,
  RecipeVersion,
  SkillVersion,
  Space,
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
import { getDefaultSkillId } from '../utils/defaultSkillIdUtils';
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
  let spacesPort: jest.Mocked<ISpacesPort>;
  let accountsPort: jest.Mocked<IAccountsPort>;
  let logger: jest.Mocked<PackmindLogger>;
  let useCase: GetContentByVersionsUseCase;
  let command: GetContentByVersionsCommand;
  let organizationId: OrganizationId;
  let organization: Organization;
  let orgSpaceId: ReturnType<typeof createSpaceId>;

  beforeEach(() => {
    codingAgentPort = {
      deployArtifactsForAgents: jest.fn().mockResolvedValue({
        createOrUpdate: [],
        delete: [],
      }),
      getSkillsFolderPathForAgents: jest.fn().mockReturnValue(new Map()),
    } as unknown as jest.Mocked<ICodingAgentPort>;

    renderModeConfigurationService = {
      resolveCodingAgents: jest
        .fn()
        .mockResolvedValue([CodingAgents.packmind, CodingAgents.claude]),
    } as unknown as jest.Mocked<RenderModeConfigurationService>;

    skillsPort = {
      getSkillVersionByNumber: jest.fn().mockResolvedValue(null),
      getSkillFiles: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<ISkillsPort>;

    standardsPort = {
      getStandardVersionByNumber: jest.fn().mockResolvedValue(null),
      getRulesByVersionId: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<IStandardsPort>;

    recipesPort = {
      getRecipeVersion: jest.fn().mockResolvedValue(null),
    } as unknown as jest.Mocked<IRecipesPort>;

    accountsPort = {
      getUserById: jest.fn(),
      getOrganizationById: jest.fn(),
    } as unknown as jest.Mocked<IAccountsPort>;

    organizationId = createOrganizationId(uuidv4());
    orgSpaceId = createSpaceId(uuidv4());
    organization = {
      id: organizationId,
      name: 'Test Org',
      slug: 'test-org',
    };

    spacesPort = {
      listSpacesByOrganization: jest
        .fn()
        .mockResolvedValue([
          { id: orgSpaceId, name: 'Global', slug: 'global' } as Space,
        ]),
    } as unknown as jest.Mocked<ISpacesPort>;

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

    logger = stubLogger();
    useCase = new GetContentByVersionsUseCase(
      codingAgentPort,
      renderModeConfigurationService,
      skillsPort,
      standardsPort,
      recipesPort,
      spacesPort,
      accountsPort,
      logger,
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

    it('returns resolvedAgents from server resolution', async () => {
      const result = await useCase.execute(command);

      expect(result.resolvedAgents).toEqual([
        CodingAgents.packmind,
        CodingAgents.claude,
      ]);
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
      standardsPort.getStandardVersionByNumber.mockResolvedValue(
        standardVersion,
      );
      skillsPort.getSkillVersionByNumber.mockResolvedValue(skillVersion);

      const fileUpdates: FileUpdates = {
        createOrUpdate: [
          {
            path: '.packmind/standards/test-standard.md',
            content: 'standard content',
            artifactType: 'standard',
            artifactName: 'test-standard',
            artifactId: standardId as string,
          },
          {
            path: '.packmind/commands/test-recipe.md',
            content: 'recipe content',
            artifactType: 'command',
            artifactName: 'test-recipe',
            artifactId: recipeId as string,
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
            artifactSlug: standardVersion.slug,
          }),
          expect.objectContaining({
            path: '.packmind/commands/test-recipe.md',
            artifactId: recipeId as string,
            spaceId: spaceId as string,
            artifactVersion: recipeVersion.version,
            artifactSlug: recipeVersion.slug,
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

    it('fetches recipe version with correct id, version, and allowedSpaceIds', async () => {
      await useCase.execute(command);

      expect(recipesPort.getRecipeVersion).toHaveBeenCalledWith(recipeId, 2, [
        orgSpaceId,
      ]);
    });

    it('fetches standard version by number with allowed space IDs', async () => {
      await useCase.execute(command);

      expect(standardsPort.getStandardVersionByNumber).toHaveBeenCalledWith(
        standardId,
        3,
        [orgSpaceId],
      );
    });

    it('fetches rules for each matched standard version', async () => {
      await useCase.execute(command);

      expect(standardsPort.getRulesByVersionId).toHaveBeenCalledWith(
        standardVersion.id,
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

  describe('when a skill artifact is a default skill', () => {
    const spaceId = createSpaceId(uuidv4());
    const defaultSkillId = getDefaultSkillId('packmind-create-skill');

    beforeEach(() => {
      command.artifacts = [
        {
          name: 'packmind-create-skill',
          type: 'skill',
          id: defaultSkillId,
          version: 1,
          spaceId: spaceId as string,
        },
      ];
    });

    it('does not query the skills port for the default-skill id', async () => {
      await useCase.execute(command);

      expect(skillsPort.getSkillVersionByNumber).not.toHaveBeenCalled();
      expect(skillsPort.getSkillFiles).not.toHaveBeenCalled();
    });

    it('does not emit a "Skill version not found" warning', async () => {
      await useCase.execute(command);

      const warnCalls = logger.warn.mock.calls.map(([message]) => message);
      expect(warnCalls).not.toContain('Skill version not found');
    });

    it('still resolves the response cleanly', async () => {
      const result = await useCase.execute(command);

      expect(result.fileUpdates).toEqual({ createOrUpdate: [], delete: [] });
    });
  });

  describe('when a skill artifact uses a legacy slug id (pre-316404566 lockfile)', () => {
    const spaceId = createSpaceId(uuidv4());
    const legacySlug = 'packmind-create-skill';

    it('does not throw InvalidArtifactIdError for the slug', async () => {
      command.artifacts = [
        {
          name: legacySlug,
          type: 'skill',
          id: legacySlug,
          version: 1,
          spaceId: spaceId as string,
        },
      ];

      await expect(useCase.execute(command)).resolves.toBeDefined();
    });

    it('does not query the skills port and does not warn', async () => {
      command.artifacts = [
        {
          name: legacySlug,
          type: 'skill',
          id: legacySlug,
          version: 1,
          spaceId: spaceId as string,
        },
      ];

      await useCase.execute(command);

      expect(skillsPort.getSkillVersionByNumber).not.toHaveBeenCalled();
      const warnMessages = logger.warn.mock.calls.map(([message]) => message);
      expect(warnMessages).not.toContain('Skill version not found');
    });

    it('still processes a real standard in the same batch', async () => {
      const realStandardId = createStandardId(uuidv4());
      const realStandardVersion: StandardVersion = {
        id: createStandardVersionId(uuidv4()),
        standardId: realStandardId,
        name: 'real-standard',
        slug: 'real-standard',
        description: 'desc',
        version: 1,
        scope: null,
        rules: [],
      };
      standardsPort.getStandardVersionByNumber.mockResolvedValue(
        realStandardVersion,
      );

      command.artifacts = [
        {
          name: legacySlug,
          type: 'skill',
          id: legacySlug,
          version: 1,
          spaceId: spaceId as string,
        },
        {
          name: 'real-standard',
          type: 'standard',
          id: realStandardId as string,
          version: 1,
          spaceId: spaceId as string,
        },
      ];

      await useCase.execute(command);

      expect(standardsPort.getStandardVersionByNumber).toHaveBeenCalledWith(
        realStandardId,
        1,
        [orgSpaceId],
      );
    });
  });

  describe('when an artifact id is not a valid UUID', () => {
    const spaceId = createSpaceId(uuidv4());

    it('rejects with InvalidArtifactIdError', async () => {
      command.artifacts = [
        {
          name: 'bad',
          type: 'skill',
          id: 'arbitrary-non-uuid',
          version: 1,
          spaceId: spaceId as string,
        },
      ];

      await expect(useCase.execute(command)).rejects.toBeInstanceOf(
        InvalidArtifactIdError,
      );
    });

    it('carries the offending id on the thrown error', async () => {
      command.artifacts = [
        {
          name: 'bad',
          type: 'standard',
          id: 'not-a-uuid',
          version: 1,
          spaceId: spaceId as string,
        },
      ];

      await expect(useCase.execute(command)).rejects.toMatchObject({
        name: 'InvalidArtifactIdError',
        invalidId: 'not-a-uuid',
      });
    });

    it('throws before calling any port', async () => {
      command.artifacts = [
        {
          name: 'bad',
          type: 'command',
          id: 'still-not-a-uuid',
          version: 1,
          spaceId: spaceId as string,
        },
      ];

      await expect(useCase.execute(command)).rejects.toBeInstanceOf(
        InvalidArtifactIdError,
      );

      expect(skillsPort.getSkillVersionByNumber).not.toHaveBeenCalled();
      expect(standardsPort.getStandardVersionByNumber).not.toHaveBeenCalled();
      expect(recipesPort.getRecipeVersion).not.toHaveBeenCalled();
      expect(spacesPort.listSpacesByOrganization).not.toHaveBeenCalled();
    });

    it('rejects when a valid uuid sits alongside an invalid one', async () => {
      command.artifacts = [
        {
          name: 'good',
          type: 'skill',
          id: uuidv4(),
          version: 1,
          spaceId: spaceId as string,
        },
        {
          name: 'bad',
          type: 'skill',
          id: 'still-not-a-uuid',
          version: 1,
          spaceId: spaceId as string,
        },
      ];

      await expect(useCase.execute(command)).rejects.toMatchObject({
        name: 'InvalidArtifactIdError',
        invalidId: 'still-not-a-uuid',
      });
    });
  });

  describe('when agents are provided in command', () => {
    it('uses command agents instead of org-level config', async () => {
      command.agents = [CodingAgents.cursor, CodingAgents.claude];

      await useCase.execute(command);

      expect(
        renderModeConfigurationService.resolveCodingAgents,
      ).toHaveBeenCalledWith(command.agents, organization.id);
    });
  });

  describe('when agents are not provided in command', () => {
    it('uses organization-level render mode configuration', async () => {
      delete command.agents;

      await useCase.execute(command);

      expect(
        renderModeConfigurationService.resolveCodingAgents,
      ).toHaveBeenCalledWith(undefined, organization.id);
    });
  });
});
