import { ICodingAgentDeployer } from '@packmind/coding-agent';
import { stubLogger } from '@packmind/test-utils';
import {
  CodingAgent,
  DeployDefaultSkillsCommand,
  DeployDefaultSkillsResponse,
  FileUpdates,
  IAccountsPort,
  ICodingAgentDeployerRegistry,
  ICodingAgentPort,
  Organization,
  OrganizationId,
  User,
  UserOrganizationMembership,
  createOrganizationId,
  createUserId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { RenderModeConfigurationService } from '../services/RenderModeConfigurationService';
import { getDefaultSkillId } from '../utils/defaultSkillIdUtils';
import { DeployDefaultSkillsUseCase } from './DeployDefaultSkillsUseCase';

const createMockDeployer = (
  overrides?: Partial<ICodingAgentDeployer>,
): jest.Mocked<ICodingAgentDeployer> =>
  ({
    deployRecipes: jest.fn(),
    deployStandards: jest.fn(),
    deploySkills: jest.fn(),
    generateFileUpdatesForRecipes: jest.fn(),
    generateFileUpdatesForStandards: jest.fn(),
    generateFileUpdatesForSkills: jest.fn(),
    generateRemovalFileUpdates: jest.fn(),
    generateAgentCleanupFileUpdates: jest.fn(),
    deployArtifacts: jest.fn(),
    deployDefaultSkills: jest.fn().mockResolvedValue({
      fileUpdates: { createOrUpdate: [], delete: [] },
      skippedSkillsCount: 0,
      deployedSkills: [],
    }),
    getSkillsFolderPath: jest.fn(),
    ...overrides,
  }) as unknown as jest.Mocked<ICodingAgentDeployer>;

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

describe('DeployDefaultSkillsUseCase', () => {
  let renderModeConfigurationService: jest.Mocked<RenderModeConfigurationService>;
  let codingAgentPort: jest.Mocked<ICodingAgentPort>;
  let deployerRegistry: jest.Mocked<ICodingAgentDeployerRegistry>;
  let accountsPort: {
    getUserById: jest.Mock;
    getOrganizationById: jest.Mock;
  };
  let useCase: DeployDefaultSkillsUseCase;
  let command: DeployDefaultSkillsCommand;
  let organizationId: OrganizationId;
  let organization: Organization;
  let logger: ReturnType<typeof stubLogger>;

  beforeEach(() => {
    renderModeConfigurationService = {
      resolveActiveCodingAgents: jest.fn(),
      getConfiguration: jest.fn(),
      upsertConfiguration: jest.fn(),
    } as unknown as jest.Mocked<RenderModeConfigurationService>;

    deployerRegistry = {
      getDeployer: jest.fn(),
      registerDeployer: jest.fn(),
      hasDeployer: jest.fn(),
    };

    codingAgentPort = {
      renderArtifacts: jest.fn(),
      getDeployerRegistry: jest.fn().mockReturnValue(deployerRegistry),
    } as unknown as jest.Mocked<ICodingAgentPort>;

    accountsPort = {
      getUserById: jest.fn(),
      getOrganizationById: jest.fn(),
    };

    organizationId = createOrganizationId(uuidv4());
    organization = {
      id: organizationId,
      name: 'Packmind',
      slug: 'packmind',
    };

    command = {
      organizationId: organizationId as unknown as string,
      userId: uuidv4(),
    };

    accountsPort.getOrganizationById.mockResolvedValue(organization);
    accountsPort.getUserById.mockResolvedValue(
      createUserWithMembership(command.userId, organization, 'member'),
    );

    logger = stubLogger();
    useCase = new DeployDefaultSkillsUseCase(
      renderModeConfigurationService,
      codingAgentPort,
      accountsPort as unknown as IAccountsPort,
      logger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when no coding agents are configured', () => {
    let result: DeployDefaultSkillsResponse;

    beforeEach(async () => {
      renderModeConfigurationService.resolveActiveCodingAgents.mockResolvedValue(
        [],
      );

      result = await useCase.execute(command);
    });

    it('returns empty file updates', () => {
      expect(result.fileUpdates).toEqual({
        createOrUpdate: [],
        delete: [],
      });
    });

    it('returns 0 skipped skills count', () => {
      expect(result.skippedSkillsCount).toBe(0);
    });

    it('returns an empty lockFileSlice', () => {
      expect(result.lockFileSlice).toEqual({});
    });

    it('calls resolveActiveCodingAgents with organization id', () => {
      expect(
        renderModeConfigurationService.resolveActiveCodingAgents,
      ).toHaveBeenCalledWith(organizationId);
    });

    it('does not call getDeployer', () => {
      expect(deployerRegistry.getDeployer).not.toHaveBeenCalled();
    });
  });

  describe('when Claude is configured', () => {
    describe('when deployer supports deployDefaultSkills', () => {
      let result: DeployDefaultSkillsResponse;
      let mockDeployer: jest.Mocked<ICodingAgentDeployer>;
      const fileUpdates: FileUpdates = {
        createOrUpdate: [
          {
            path: '.claude/skills/packmind-create-skill/SKILL.md',
            content: 'skill content',
          },
          {
            path: '.claude/skills/packmind-create-skill/README.md',
            content: 'readme content',
          },
        ],
        delete: [],
      };

      beforeEach(async () => {
        renderModeConfigurationService.resolveActiveCodingAgents.mockResolvedValue(
          ['claude'] as CodingAgent[],
        );

        mockDeployer = createMockDeployer({
          deployDefaultSkills: jest.fn().mockResolvedValue({
            fileUpdates,
            skippedSkillsCount: 0,
            deployedSkills: [
              {
                slug: 'packmind-create-skill',
                name: 'Skill Creator',
                version: 1,
              },
            ],
          }),
        });

        deployerRegistry.getDeployer.mockReturnValue(mockDeployer);

        result = await useCase.execute(command);
      });

      it('returns enriched file updates from deployer', () => {
        expect(result.fileUpdates.createOrUpdate).toHaveLength(2);
        expect(result.fileUpdates.createOrUpdate[0]).toMatchObject({
          path: '.claude/skills/packmind-create-skill/SKILL.md',
          artifactType: 'skill',
          artifactId: getDefaultSkillId('packmind-create-skill'),
          artifactSlug: 'packmind-create-skill',
          artifactName: 'Skill Creator',
          artifactVersion: 1,
          source: 'default',
        });
      });

      it('returns skipped skills count from deployer', () => {
        expect(result.skippedSkillsCount).toBe(0);
      });

      it('populates lockFileSlice with default-skill keyed entries', () => {
        expect(Object.keys(result.lockFileSlice)).toEqual([
          'default:skill:packmind-create-skill',
        ]);
        expect(
          result.lockFileSlice['default:skill:packmind-create-skill'],
        ).toMatchObject({
          name: 'Skill Creator',
          type: 'skill',
          id: getDefaultSkillId('packmind-create-skill'),
          version: 1,
          source: 'default',
        });
      });

      it('reuses the same id for the same slug across runs in-process', async () => {
        const secondResult = await useCase.execute(command);
        expect(
          secondResult.lockFileSlice['default:skill:packmind-create-skill'].id,
        ).toBe(result.lockFileSlice['default:skill:packmind-create-skill'].id);
      });

      it('does not emit warn logs from the PackmindLockFileService gate', () => {
        expect(logger.warn).not.toHaveBeenCalled();
      });

      it('calls getDeployer with claude', () => {
        expect(deployerRegistry.getDeployer).toHaveBeenCalledWith('claude');
      });

      it('calls deployDefaultSkills on the deployer', () => {
        expect(mockDeployer.deployDefaultSkills).toHaveBeenCalled();
      });
    });

    describe('when deployer does not support deployDefaultSkills', () => {
      let result: DeployDefaultSkillsResponse;
      let mockDeployer: jest.Mocked<ICodingAgentDeployer>;

      beforeEach(async () => {
        renderModeConfigurationService.resolveActiveCodingAgents.mockResolvedValue(
          ['packmind'] as CodingAgent[],
        );

        mockDeployer = createMockDeployer({
          deployDefaultSkills: undefined,
        });

        deployerRegistry.getDeployer.mockReturnValue(mockDeployer);

        result = await useCase.execute(command);
      });

      it('returns empty file updates', () => {
        expect(result.fileUpdates).toEqual({
          createOrUpdate: [],
          delete: [],
        });
      });

      it('calls getDeployer', () => {
        expect(deployerRegistry.getDeployer).toHaveBeenCalled();
      });
    });
  });

  describe('when multiple agents are configured', () => {
    let result: DeployDefaultSkillsResponse;
    let claudeDeployer: jest.Mocked<ICodingAgentDeployer>;
    let packmindDeployer: jest.Mocked<ICodingAgentDeployer>;

    beforeEach(async () => {
      renderModeConfigurationService.resolveActiveCodingAgents.mockResolvedValue(
        ['claude', 'packmind'] as CodingAgent[],
      );

      claudeDeployer = createMockDeployer({
        deployDefaultSkills: jest.fn().mockResolvedValue({
          fileUpdates: {
            createOrUpdate: [
              {
                path: '.claude/skills/packmind/packmind-create-skill/SKILL.md',
                content: 'claude skill',
              },
            ],
            delete: [],
          },
          skippedSkillsCount: 0,
          deployedSkills: [],
        }),
      });

      packmindDeployer = createMockDeployer({
        deployDefaultSkills: undefined,
      });

      deployerRegistry.getDeployer.mockImplementation((agent: CodingAgent) => {
        if (agent === 'claude') return claudeDeployer;
        return packmindDeployer;
      });

      result = await useCase.execute(command);
    });

    it('returns one file update from the claude deployer', () => {
      expect(result.fileUpdates.createOrUpdate).toHaveLength(1);
    });

    it('returns file updates with correct path', () => {
      expect(result.fileUpdates.createOrUpdate[0].path).toBe(
        '.claude/skills/packmind/packmind-create-skill/SKILL.md',
      );
    });

    it('calls getDeployer twice for both agents', () => {
      expect(deployerRegistry.getDeployer).toHaveBeenCalledTimes(2);
    });

    it('calls getDeployer with claude', () => {
      expect(deployerRegistry.getDeployer).toHaveBeenCalledWith('claude');
    });

    it('calls getDeployer with packmind', () => {
      expect(deployerRegistry.getDeployer).toHaveBeenCalledWith('packmind');
    });

    it('calls deployDefaultSkills only on deployers that support it', () => {
      expect(claudeDeployer.deployDefaultSkills).toHaveBeenCalled();
    });
  });

  describe('when command.agents is provided', () => {
    let result: DeployDefaultSkillsResponse;
    let claudeDeployer: jest.Mocked<ICodingAgentDeployer>;

    beforeEach(async () => {
      claudeDeployer = createMockDeployer({
        deployDefaultSkills: jest.fn().mockResolvedValue({
          fileUpdates: {
            createOrUpdate: [
              {
                path: '.claude/skills/packmind/packmind-create-skill/SKILL.md',
                content: 'claude skill',
              },
            ],
            delete: [],
          },
          skippedSkillsCount: 0,
          deployedSkills: [],
        }),
      });

      deployerRegistry.getDeployer.mockReturnValue(claudeDeployer);

      result = await useCase.execute({
        ...command,
        agents: ['claude'] as CodingAgent[],
      });
    });

    it('uses agents from command instead of org-level config', () => {
      expect(
        renderModeConfigurationService.resolveActiveCodingAgents,
      ).not.toHaveBeenCalled();
    });

    it('returns file updates from deployer', () => {
      expect(result.fileUpdates.createOrUpdate).toHaveLength(1);
    });

    it('calls getDeployer with the agent from command', () => {
      expect(deployerRegistry.getDeployer).toHaveBeenCalledWith('claude');
    });
  });

  describe('when command.agents is empty array', () => {
    beforeEach(async () => {
      renderModeConfigurationService.resolveActiveCodingAgents.mockResolvedValue(
        ['claude'] as CodingAgent[],
      );

      const mockDeployer = createMockDeployer();

      deployerRegistry.getDeployer.mockReturnValue(mockDeployer);

      await useCase.execute({
        ...command,
        agents: [],
      });
    });

    it('falls back to org-level config', () => {
      expect(
        renderModeConfigurationService.resolveActiveCodingAgents,
      ).toHaveBeenCalledWith(organizationId);
    });
  });

  describe('when command.agents is undefined', () => {
    beforeEach(async () => {
      renderModeConfigurationService.resolveActiveCodingAgents.mockResolvedValue(
        ['cursor'] as CodingAgent[],
      );

      const mockDeployer = createMockDeployer();

      deployerRegistry.getDeployer.mockReturnValue(mockDeployer);

      await useCase.execute({
        ...command,
        agents: undefined,
      });
    });

    it('falls back to org-level config', () => {
      expect(
        renderModeConfigurationService.resolveActiveCodingAgents,
      ).toHaveBeenCalledWith(organizationId);
    });

    it('calls getDeployer with agent from org-level config', () => {
      expect(deployerRegistry.getDeployer).toHaveBeenCalledWith('cursor');
    });
  });

  describe('when command.excludeDeprecated is true', () => {
    let mockDeployer: jest.Mocked<ICodingAgentDeployer>;

    beforeEach(async () => {
      mockDeployer = createMockDeployer();
      deployerRegistry.getDeployer.mockReturnValue(mockDeployer);

      await useCase.execute({
        ...command,
        agents: ['claude'] as CodingAgent[],
        excludeDeprecated: true,
      });
    });

    it('forwards excludeDeprecated to the deployer', () => {
      expect(mockDeployer.deployDefaultSkills).toHaveBeenCalledWith(
        expect.objectContaining({ excludeDeprecated: true }),
      );
    });
  });

  describe('when command.excludeDeprecated is not provided', () => {
    let mockDeployer: jest.Mocked<ICodingAgentDeployer>;

    beforeEach(async () => {
      mockDeployer = createMockDeployer();
      deployerRegistry.getDeployer.mockReturnValue(mockDeployer);

      await useCase.execute({
        ...command,
        agents: ['claude'] as CodingAgent[],
      });
    });

    it('does not set excludeDeprecated on the deployer call', () => {
      expect(mockDeployer.deployDefaultSkills).toHaveBeenCalledWith(
        expect.objectContaining({ excludeDeprecated: undefined }),
      );
    });
  });

  describe('when command.agents has multiple agents', () => {
    let claudeDeployer: jest.Mocked<ICodingAgentDeployer>;
    let cursorDeployer: jest.Mocked<ICodingAgentDeployer>;

    beforeEach(async () => {
      claudeDeployer = createMockDeployer({
        deployDefaultSkills: jest.fn().mockResolvedValue({
          fileUpdates: {
            createOrUpdate: [
              {
                path: '.claude/skills/packmind/SKILL.md',
                content: 'claude skill',
              },
            ],
            delete: [],
          },
          skippedSkillsCount: 2,
          deployedSkills: [],
        }),
      });

      cursorDeployer = createMockDeployer({
        deployDefaultSkills: jest.fn().mockResolvedValue({
          fileUpdates: {
            createOrUpdate: [
              {
                path: '.cursor/skills/packmind/SKILL.md',
                content: 'cursor skill',
              },
            ],
            delete: [],
          },
          skippedSkillsCount: 2,
          deployedSkills: [],
        }),
      });

      deployerRegistry.getDeployer.mockImplementation((agent: CodingAgent) => {
        if (agent === 'claude') return claudeDeployer;
        if (agent === 'cursor') return cursorDeployer;
        return claudeDeployer;
      });

      await useCase.execute({
        ...command,
        agents: ['claude', 'cursor'] as CodingAgent[],
      });
    });

    it('does not call resolveActiveCodingAgents', () => {
      expect(
        renderModeConfigurationService.resolveActiveCodingAgents,
      ).not.toHaveBeenCalled();
    });

    it('calls getDeployer for claude', () => {
      expect(deployerRegistry.getDeployer).toHaveBeenCalledWith('claude');
    });

    it('calls getDeployer for cursor', () => {
      expect(deployerRegistry.getDeployer).toHaveBeenCalledWith('cursor');
    });

    it('calls deployDefaultSkills on claude deployer', () => {
      expect(claudeDeployer.deployDefaultSkills).toHaveBeenCalled();
    });

    it('calls deployDefaultSkills on cursor deployer', () => {
      expect(cursorDeployer.deployDefaultSkills).toHaveBeenCalled();
    });
  });
});
