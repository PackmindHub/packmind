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
import { DeployDefaultSkillsUseCase } from './DeployDefaultSkillsUseCase';

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

    useCase = new DeployDefaultSkillsUseCase(
      renderModeConfigurationService,
      codingAgentPort,
      accountsPort as unknown as IAccountsPort,
      stubLogger(),
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
            path: '.claude/skills/packmind/skill-creator/SKILL.md',
            content: 'skill content',
          },
          {
            path: '.claude/skills/packmind/skill-creator/README.md',
            content: 'readme content',
          },
        ],
        delete: [],
      };

      beforeEach(async () => {
        renderModeConfigurationService.resolveActiveCodingAgents.mockResolvedValue(
          ['claude'] as CodingAgent[],
        );

        mockDeployer = {
          deployRecipes: jest.fn(),
          deployStandards: jest.fn(),
          deploySkills: jest.fn(),
          generateFileUpdatesForRecipes: jest.fn(),
          generateFileUpdatesForStandards: jest.fn(),
          generateFileUpdatesForSkills: jest.fn(),
          generateRemovalFileUpdates: jest.fn(),
          generateAgentCleanupFileUpdates: jest.fn(),
          deployArtifacts: jest.fn(),
          deployDefaultSkills: jest.fn().mockResolvedValue(fileUpdates),
          getSkillsFolderPath: jest.fn(),
        } as unknown as jest.Mocked<ICodingAgentDeployer>;

        deployerRegistry.getDeployer.mockReturnValue(mockDeployer);

        result = await useCase.execute(command);
      });

      it('returns file updates from deployer', () => {
        expect(result.fileUpdates).toEqual(fileUpdates);
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

        mockDeployer = {
          deployRecipes: jest.fn(),
          deployStandards: jest.fn(),
          deploySkills: jest.fn(),
          generateFileUpdatesForRecipes: jest.fn(),
          generateFileUpdatesForStandards: jest.fn(),
          generateFileUpdatesForSkills: jest.fn(),
          generateRemovalFileUpdates: jest.fn(),
          generateAgentCleanupFileUpdates: jest.fn(),
          deployArtifacts: jest.fn(),
          getSkillsFolderPath: jest.fn(),
        } as unknown as jest.Mocked<ICodingAgentDeployer>;

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

      claudeDeployer = {
        deployRecipes: jest.fn(),
        deployStandards: jest.fn(),
        deploySkills: jest.fn(),
        generateFileUpdatesForRecipes: jest.fn(),
        generateFileUpdatesForStandards: jest.fn(),
        generateFileUpdatesForSkills: jest.fn(),
        generateRemovalFileUpdates: jest.fn(),
        deployArtifacts: jest.fn(),
        deployDefaultSkills: jest.fn().mockResolvedValue({
          createOrUpdate: [
            {
              path: '.claude/skills/packmind/skill-creator/SKILL.md',
              content: 'claude skill',
            },
          ],
          delete: [],
        }),
      } as unknown as jest.Mocked<ICodingAgentDeployer>;

      packmindDeployer = {
        deployRecipes: jest.fn(),
        deployStandards: jest.fn(),
        deploySkills: jest.fn(),
        generateFileUpdatesForRecipes: jest.fn(),
        generateFileUpdatesForStandards: jest.fn(),
        generateFileUpdatesForSkills: jest.fn(),
        generateRemovalFileUpdates: jest.fn(),
        deployArtifacts: jest.fn(),
      } as unknown as jest.Mocked<ICodingAgentDeployer>;

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
        '.claude/skills/packmind/skill-creator/SKILL.md',
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
});
