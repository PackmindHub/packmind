import { PackmindLogger } from '@packmind/logger';
import {
  CodingAgent,
  FileUpdates,
  IGitPort,
  IGitPortName,
  IStandardsPort,
  IStandardsPortName,
  RecipeVersion,
  SkillVersion,
  StandardVersion,
} from '@packmind/types';
import { CodingAgentAdapter } from './CodingAgentAdapter';
import { CodingAgentServices } from '../services/CodingAgentServices';
import { ICodingAgentRepositories } from '../../domain/repositories/ICodingAgentRepositories';
import { ICodingAgentDeployer } from '../../domain/repository/ICodingAgentDeployer';
import { ICodingAgentDeployerRegistry } from '../../domain/repository/ICodingAgentDeployerRegistry';

describe('CodingAgentAdapter', () => {
  let adapter: CodingAgentAdapter;
  let mockLogger: PackmindLogger;
  let mockStandardsPort: IStandardsPort;
  let mockGitPort: IGitPort;
  let mockServices: CodingAgentServices;
  let mockRepositories: ICodingAgentRepositories;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    } as unknown as PackmindLogger;

    mockStandardsPort = {} as IStandardsPort;
    mockGitPort = {} as IGitPort;

    mockRepositories = {
      getDeployerRegistry: jest.fn(),
    } as unknown as ICodingAgentRepositories;

    mockServices = {
      getDeployerService: jest.fn(),
      prepareRecipesDeployment: jest.fn(),
      prepareStandardsDeployment: jest.fn(),
    } as unknown as CodingAgentServices;

    adapter = new CodingAgentAdapter(
      mockRepositories,
      mockServices,
      mockLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('isReady', () => {
    describe('when adapter not initialized', () => {
      it('returns false', () => {
        expect(adapter.isReady()).toBe(false);
      });
    });

    describe('when all required ports and services are set', () => {
      it('returns true', async () => {
        await adapter.initialize({
          [IStandardsPortName]: mockStandardsPort,
          [IGitPortName]: mockGitPort,
        });

        expect(adapter.isReady()).toBe(true);
      });
    });
  });

  describe('initialize', () => {
    describe('when required ports not provided', () => {
      it('throws', async () => {
        await expect(
          adapter.initialize({
            [IStandardsPortName]: mockStandardsPort,
            [IGitPortName]: undefined,
          } as unknown as {
            [IStandardsPortName]: IStandardsPort;
            [IGitPortName]: IGitPort;
          }),
        ).rejects.toThrow(
          'CodingAgentAdapter: Required ports/services not provided',
        );
      });
    });

    describe('when all dependencies provided', () => {
      beforeEach(async () => {
        await adapter.initialize({
          [IStandardsPortName]: mockStandardsPort,
          [IGitPortName]: mockGitPort,
        });
      });

      it('initializes without throwing', async () => {
        await expect(
          adapter.initialize({
            [IStandardsPortName]: mockStandardsPort,
            [IGitPortName]: mockGitPort,
          }),
        ).resolves.not.toThrow();
      });

      it('marks adapter as ready', () => {
        expect(adapter.isReady()).toBe(true);
      });
    });
  });

  describe('getPort', () => {
    it('returns the adapter as port interface', async () => {
      await adapter.initialize({
        [IStandardsPortName]: mockStandardsPort,
        [IGitPortName]: mockGitPort,
      });

      expect(adapter.getPort()).toBe(adapter);
    });
  });

  describe('deployArtifactsForAgents', () => {
    let mockDeployer: jest.Mocked<ICodingAgentDeployer>;
    let mockDeployerRegistry: jest.Mocked<ICodingAgentDeployerRegistry>;

    beforeEach(() => {
      mockDeployer = {
        deployArtifacts: jest.fn(),
        deployRecipes: jest.fn(),
        deployStandards: jest.fn(),
        deploySkills: jest.fn(),
        generateRemovalFileUpdates: jest.fn(),
      } as unknown as jest.Mocked<ICodingAgentDeployer>;

      mockDeployerRegistry = {
        getDeployer: jest.fn().mockReturnValue(mockDeployer),
      } as unknown as jest.Mocked<ICodingAgentDeployerRegistry>;

      (mockRepositories.getDeployerRegistry as jest.Mock).mockReturnValue(
        mockDeployerRegistry,
      );
    });

    describe('with single agent', () => {
      const fileUpdates: FileUpdates = {
        createOrUpdate: [{ path: 'CLAUDE.md', content: 'test' }],
        delete: [],
      };

      beforeEach(async () => {
        mockDeployer.deployArtifacts.mockResolvedValue(fileUpdates);
      });

      it('retrieves deployer for the agent', async () => {
        await adapter.deployArtifactsForAgents({
          recipeVersions: [] as RecipeVersion[],
          standardVersions: [] as StandardVersion[],
          skillVersions: [] as SkillVersion[],
          codingAgents: ['claude'] as CodingAgent[],
        });

        expect(mockDeployerRegistry.getDeployer).toHaveBeenCalledWith('claude');
      });

      it('calls deployArtifacts with empty arrays', async () => {
        await adapter.deployArtifactsForAgents({
          recipeVersions: [] as RecipeVersion[],
          standardVersions: [] as StandardVersion[],
          skillVersions: [] as SkillVersion[],
          codingAgents: ['claude'] as CodingAgent[],
        });

        expect(mockDeployer.deployArtifacts).toHaveBeenCalledWith([], [], []);
      });

      it('returns file updates from deployer', async () => {
        const result = await adapter.deployArtifactsForAgents({
          recipeVersions: [] as RecipeVersion[],
          standardVersions: [] as StandardVersion[],
          skillVersions: [] as SkillVersion[],
          codingAgents: ['claude'] as CodingAgent[],
        });

        expect(result).toEqual(fileUpdates);
      });
    });

    describe('with multiple agents', () => {
      const claudeUpdates: FileUpdates = {
        createOrUpdate: [{ path: 'CLAUDE.md', content: 'claude content' }],
        delete: [],
      };
      const copilotUpdates: FileUpdates = {
        createOrUpdate: [
          {
            path: '.github/copilot-instructions.md',
            content: 'copilot content',
          },
        ],
        delete: [],
      };

      const deployForMultipleAgents = async () => {
        mockDeployer.deployArtifacts
          .mockResolvedValueOnce(claudeUpdates)
          .mockResolvedValueOnce(copilotUpdates);

        return adapter.deployArtifactsForAgents({
          recipeVersions: [] as RecipeVersion[],
          standardVersions: [] as StandardVersion[],
          skillVersions: [] as SkillVersion[],
          codingAgents: ['claude', 'copilot'] as CodingAgent[],
        });
      };

      it('merges file updates with correct count', async () => {
        const result = await deployForMultipleAgents();

        expect(result.createOrUpdate).toHaveLength(2);
      });

      it('includes claude file updates', async () => {
        const result = await deployForMultipleAgents();

        expect(result.createOrUpdate).toContainEqual({
          path: 'CLAUDE.md',
          content: 'claude content',
        });
      });

      it('includes copilot file updates', async () => {
        const result = await deployForMultipleAgents();

        expect(result.createOrUpdate).toContainEqual({
          path: '.github/copilot-instructions.md',
          content: 'copilot content',
        });
      });
    });
  });

  describe('generateRemovalUpdatesForAgents', () => {
    let mockDeployer: jest.Mocked<ICodingAgentDeployer>;
    let mockDeployerRegistry: jest.Mocked<ICodingAgentDeployerRegistry>;

    beforeEach(() => {
      mockDeployer = {
        deployArtifacts: jest.fn(),
        deployRecipes: jest.fn(),
        deployStandards: jest.fn(),
        deploySkills: jest.fn(),
        generateRemovalFileUpdates: jest.fn(),
      } as unknown as jest.Mocked<ICodingAgentDeployer>;

      mockDeployerRegistry = {
        getDeployer: jest.fn().mockReturnValue(mockDeployer),
      } as unknown as jest.Mocked<ICodingAgentDeployerRegistry>;

      (mockRepositories.getDeployerRegistry as jest.Mock).mockReturnValue(
        mockDeployerRegistry,
      );
    });

    describe('with single agent', () => {
      const removalUpdates: FileUpdates = {
        createOrUpdate: [],
        delete: [{ path: '.claude/skills/removed-skill.md' }],
      };

      const generateRemovalUpdates = async () => {
        mockDeployer.generateRemovalFileUpdates.mockResolvedValue(
          removalUpdates,
        );

        return adapter.generateRemovalUpdatesForAgents({
          removed: {
            recipeVersions: [] as RecipeVersion[],
            standardVersions: [] as StandardVersion[],
            skillVersions: [] as SkillVersion[],
          },
          installed: {
            recipeVersions: [] as RecipeVersion[],
            standardVersions: [] as StandardVersion[],
            skillVersions: [] as SkillVersion[],
          },
          codingAgents: ['claude'] as CodingAgent[],
        });
      };

      it('calls generateRemovalFileUpdates with removed and installed artifacts', async () => {
        await generateRemovalUpdates();

        expect(mockDeployer.generateRemovalFileUpdates).toHaveBeenCalledWith(
          {
            recipeVersions: [],
            standardVersions: [],
            skillVersions: [],
          },
          {
            recipeVersions: [],
            standardVersions: [],
            skillVersions: [],
          },
        );
      });

      it('returns removal file updates from deployer', async () => {
        const result = await generateRemovalUpdates();

        expect(result).toEqual(removalUpdates);
      });
    });
  });

  describe('getAgentFilePath', () => {
    it('returns CLAUDE.md for claude agent', () => {
      expect(adapter.getAgentFilePath('claude')).toBe('CLAUDE.md');
    });

    it('returns .github/copilot-instructions.md for copilot agent', () => {
      expect(adapter.getAgentFilePath('copilot')).toBe(
        '.github/copilot-instructions.md',
      );
    });

    it('returns AGENTS.md for agents_md agent', () => {
      expect(adapter.getAgentFilePath('agents_md')).toBe('AGENTS.md');
    });
  });

  describe('getAgentSkillPath', () => {
    it('returns .claude/skills for claude agent', () => {
      expect(adapter.getAgentSkillPath('claude')).toBe('.claude/skills');
    });

    it('returns .github/skills for copilot agent', () => {
      expect(adapter.getAgentSkillPath('copilot')).toBe('.github/skills');
    });

    describe('when agent does not support skills', () => {
      it('returns null for cursor agent', () => {
        expect(adapter.getAgentSkillPath('cursor')).toBeNull();
      });

      it('returns null for junie agent', () => {
        expect(adapter.getAgentSkillPath('junie')).toBeNull();
      });

      it('returns null for packmind agent', () => {
        expect(adapter.getAgentSkillPath('packmind')).toBeNull();
      });
    });
  });

  describe('getSupportedAgents', () => {
    it('includes claude agent', () => {
      expect(adapter.getSupportedAgents()).toContain('claude');
    });

    it('includes copilot agent', () => {
      expect(adapter.getSupportedAgents()).toContain('copilot');
    });

    it('includes cursor agent', () => {
      expect(adapter.getSupportedAgents()).toContain('cursor');
    });

    it('includes junie agent', () => {
      expect(adapter.getSupportedAgents()).toContain('junie');
    });

    it('includes packmind agent', () => {
      expect(adapter.getSupportedAgents()).toContain('packmind');
    });

    it('includes agents_md agent', () => {
      expect(adapter.getSupportedAgents()).toContain('agents_md');
    });

    it('includes gitlab_duo agent', () => {
      expect(adapter.getSupportedAgents()).toContain('gitlab_duo');
    });

    it('includes continue agent', () => {
      expect(adapter.getSupportedAgents()).toContain('continue');
    });
  });
});
