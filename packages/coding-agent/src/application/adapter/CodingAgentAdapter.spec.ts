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
      it('calls deployer.deployArtifacts for the agent', async () => {
        const fileUpdates: FileUpdates = {
          createOrUpdate: [{ path: 'CLAUDE.md', content: 'test' }],
          delete: [],
        };
        mockDeployer.deployArtifacts.mockResolvedValue(fileUpdates);

        const result = await adapter.deployArtifactsForAgents({
          recipeVersions: [] as RecipeVersion[],
          standardVersions: [] as StandardVersion[],
          skillVersions: [] as SkillVersion[],
          codingAgents: ['claude'] as CodingAgent[],
        });

        expect(mockDeployerRegistry.getDeployer).toHaveBeenCalledWith('claude');
        expect(mockDeployer.deployArtifacts).toHaveBeenCalledWith([], [], []);
        expect(result).toEqual(fileUpdates);
      });
    });

    describe('with multiple agents', () => {
      it('merges file updates from all agents', async () => {
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

        mockDeployer.deployArtifacts
          .mockResolvedValueOnce(claudeUpdates)
          .mockResolvedValueOnce(copilotUpdates);

        const result = await adapter.deployArtifactsForAgents({
          recipeVersions: [] as RecipeVersion[],
          standardVersions: [] as StandardVersion[],
          skillVersions: [] as SkillVersion[],
          codingAgents: ['claude', 'copilot'] as CodingAgent[],
        });

        expect(result.createOrUpdate).toHaveLength(2);
        expect(result.createOrUpdate).toContainEqual({
          path: 'CLAUDE.md',
          content: 'claude content',
        });
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

    it('calls deployer.generateRemovalFileUpdates for each agent', async () => {
      const removalUpdates: FileUpdates = {
        createOrUpdate: [],
        delete: [{ path: '.claude/skills/removed-skill.md' }],
      };
      mockDeployer.generateRemovalFileUpdates.mockResolvedValue(removalUpdates);

      const result = await adapter.generateRemovalUpdatesForAgents({
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
      expect(result).toEqual(removalUpdates);
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

    it('returns null for agents without skill support', () => {
      expect(adapter.getAgentSkillPath('cursor')).toBeNull();
      expect(adapter.getAgentSkillPath('junie')).toBeNull();
      expect(adapter.getAgentSkillPath('packmind')).toBeNull();
    });
  });

  describe('getSupportedAgents', () => {
    it('returns all supported agents', () => {
      const agents = adapter.getSupportedAgents();

      expect(agents).toContain('claude');
      expect(agents).toContain('copilot');
      expect(agents).toContain('cursor');
      expect(agents).toContain('junie');
      expect(agents).toContain('packmind');
      expect(agents).toContain('agents_md');
      expect(agents).toContain('gitlab_duo');
      expect(agents).toContain('continue');
    });
  });
});
