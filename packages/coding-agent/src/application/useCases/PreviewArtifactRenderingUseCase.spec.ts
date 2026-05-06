import AdmZip from 'adm-zip';
import { stubLogger } from '@packmind/test-utils';
import {
  FileUpdates,
  PreviewArtifactRenderingCommand,
  RecipeVersion,
  RecipeVersionId,
  RecipeId,
  StandardVersion,
  StandardVersionId,
  StandardId,
  SkillVersion,
  SkillVersionId,
  SkillId,
  UserId,
} from '@packmind/types';
import { ICodingAgentDeployer } from '../../domain/repository/ICodingAgentDeployer';
import { ICodingAgentDeployerRegistry } from '../../domain/repository/ICodingAgentDeployerRegistry';
import { ICodingAgentRepositories } from '../../domain/repositories/ICodingAgentRepositories';
import { PreviewArtifactRenderingUseCase } from './PreviewArtifactRenderingUseCase';

describe('PreviewArtifactRenderingUseCase', () => {
  let useCase: PreviewArtifactRenderingUseCase;
  let mockDeployer: jest.Mocked<ICodingAgentDeployer>;
  let mockDeployerRegistry: jest.Mocked<ICodingAgentDeployerRegistry>;
  let mockRepositories: jest.Mocked<ICodingAgentRepositories>;

  const recipeVersion: RecipeVersion = {
    id: 'rv-1' as RecipeVersionId,
    recipeId: 'rec-1' as RecipeId,
    name: 'Test Command',
    slug: 'test-command',
    content: '# Test command content',
    version: 1,
    userId: 'user-1' as UserId,
  };

  const standardVersion: StandardVersion = {
    id: 'sv-1' as StandardVersionId,
    standardId: 'std-1' as StandardId,
    name: 'Test Standard',
    slug: 'test-standard',
    description: 'A test standard',
    version: 1,
    scope: null,
    rules: [{ id: 'r1', content: 'Rule 1', examples: [] }],
  };

  const skillVersion: SkillVersion = {
    id: 'skv-1' as SkillVersionId,
    skillId: 'sk-1' as SkillId,
    version: 1,
    userId: 'user-1' as UserId,
    name: 'Test Skill',
    slug: 'test-skill',
    description: 'A test skill',
    prompt: '# Skill prompt',
  };

  beforeEach(() => {
    mockDeployer = {
      generateFileUpdatesForStandards: jest.fn(),
      generateFileUpdatesForRecipes: jest.fn(),
      generateFileUpdatesForSkills: jest.fn(),
      deployRecipes: jest.fn(),
      deployStandards: jest.fn(),
      deploySkills: jest.fn(),
      deployArtifacts: jest.fn(),
      generateRemovalFileUpdates: jest.fn(),
      generateAgentCleanupFileUpdates: jest.fn(),
      getSkillsFolderPath: jest.fn(),
    };

    mockDeployerRegistry = {
      getDeployer: jest.fn().mockReturnValue(mockDeployer),
      registerDeployer: jest.fn(),
      hasDeployer: jest.fn(),
    };

    mockRepositories = {
      getDeployerRegistry: jest.fn().mockReturnValue(mockDeployerRegistry),
    };

    useCase = new PreviewArtifactRenderingUseCase(
      mockRepositories,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    describe('when rendering a command for an agent', () => {
      const fileUpdates: FileUpdates = {
        createOrUpdate: [
          {
            path: '.claude/commands/test-command.md',
            content: '# Test command content',
          },
        ],
        delete: [],
      };

      beforeEach(() => {
        mockDeployer.deployArtifacts.mockResolvedValue(fileUpdates);
      });

      it('returns a zip with the correct filename', async () => {
        const command: PreviewArtifactRenderingCommand = {
          codingAgent: 'claude',
          recipeVersions: [recipeVersion],
          standardVersions: [],
          skillVersions: [],
        };

        const result = await useCase.execute(command);

        expect(result.fileName).toBe('packmind-claude-test-command.zip');
      });

      describe('filename computation', () => {
        beforeEach(() => {
          mockDeployer.deployArtifacts.mockResolvedValue({
            createOrUpdate: [],
            delete: [],
          });
        });

        it('uses the standard slug when the command carries a single standard', async () => {
          const result = await useCase.execute({
            codingAgent: 'claude',
            recipeVersions: [],
            standardVersions: [standardVersion],
            skillVersions: [],
          });

          expect(result.fileName).toBe('packmind-claude-test-standard.zip');
        });

        it('uses the skill slug when the command carries a single skill', async () => {
          const result = await useCase.execute({
            codingAgent: 'cursor',
            recipeVersions: [],
            standardVersions: [],
            skillVersions: [skillVersion],
          });

          expect(result.fileName).toBe('packmind-cursor-test-skill.zip');
        });

        it('slugifies the artifact name when slug is empty', async () => {
          const withEmptySlug: RecipeVersion = {
            ...recipeVersion,
            slug: '',
            name: 'My Cool Thing!',
          };

          const result = await useCase.execute({
            codingAgent: 'claude',
            recipeVersions: [withEmptySlug],
            standardVersions: [],
            skillVersions: [],
          });

          expect(result.fileName).toBe('packmind-claude-my-cool-thing.zip');
        });

        it('falls back to "preview" when both slug and name are empty', async () => {
          const emptyArtifact: RecipeVersion = {
            ...recipeVersion,
            slug: '',
            name: '',
          };

          const result = await useCase.execute({
            codingAgent: 'claude',
            recipeVersions: [emptyArtifact],
            standardVersions: [],
            skillVersions: [],
          });

          expect(result.fileName).toBe('packmind-claude-preview.zip');
        });

        it('falls back to "preview" when the command carries multiple artifacts', async () => {
          const result = await useCase.execute({
            codingAgent: 'claude',
            recipeVersions: [recipeVersion],
            standardVersions: [standardVersion],
            skillVersions: [],
          });

          expect(result.fileName).toBe('packmind-claude-preview.zip');
        });

        it('falls back to "preview" when the command carries no artifacts', async () => {
          const result = await useCase.execute({
            codingAgent: 'copilot',
            recipeVersions: [],
            standardVersions: [],
            skillVersions: [],
          });

          expect(result.fileName).toBe('packmind-copilot-preview.zip');
        });
      });

      describe('when extracting the zip', () => {
        let entries: AdmZip.IZipEntry[];

        beforeEach(async () => {
          const command: PreviewArtifactRenderingCommand = {
            codingAgent: 'claude',
            recipeVersions: [recipeVersion],
            standardVersions: [],
            skillVersions: [],
          };

          const result = await useCase.execute(command);
          const zip = new AdmZip(Buffer.from(result.fileContent, 'base64'));
          entries = zip.getEntries();
        });

        it('contains one file', () => {
          expect(entries).toHaveLength(1);
        });

        it('has the correct file path', () => {
          expect(entries[0].entryName).toBe('.claude/commands/test-command.md');
        });

        it('has the correct file content', () => {
          expect(entries[0].getData().toString('utf8')).toBe(
            '# Test command content',
          );
        });
      });
    });

    describe('when rendering multiple artifacts', () => {
      beforeEach(() => {
        mockDeployer.deployArtifacts.mockResolvedValue({
          createOrUpdate: [
            {
              path: '.claude/commands/test-command.md',
              content: '# Command',
            },
            {
              path: '.claude/rules/packmind/standard-test-standard.md',
              content: '## Standard',
            },
          ],
          delete: [],
        });
      });

      it('includes all files in the zip', async () => {
        const command: PreviewArtifactRenderingCommand = {
          codingAgent: 'claude',
          recipeVersions: [recipeVersion],
          standardVersions: [standardVersion],
          skillVersions: [],
        };

        const result = await useCase.execute(command);

        const zip = new AdmZip(Buffer.from(result.fileContent, 'base64'));
        expect(zip.getEntries()).toHaveLength(2);
      });
    });

    describe('when deployer returns files with sections instead of content', () => {
      beforeEach(() => {
        mockDeployer.deployArtifacts.mockResolvedValue({
          createOrUpdate: [
            {
              path: 'CLAUDE.md',
              sections: [{ key: 'packmind', content: '## Section' }],
            },
          ],
          delete: [],
        });
      });

      it('excludes section-only files from the zip', async () => {
        const command: PreviewArtifactRenderingCommand = {
          codingAgent: 'claude',
          recipeVersions: [recipeVersion],
          standardVersions: [],
          skillVersions: [],
        };

        const result = await useCase.execute(command);

        const zip = new AdmZip(Buffer.from(result.fileContent, 'base64'));
        expect(zip.getEntries()).toHaveLength(0);
      });
    });

    describe('when the deployer throws an error', () => {
      it('propagates the error', async () => {
        mockDeployer.deployArtifacts.mockRejectedValue(
          new Error('Deployer failed'),
        );

        const command: PreviewArtifactRenderingCommand = {
          codingAgent: 'claude',
          recipeVersions: [recipeVersion],
          standardVersions: [],
          skillVersions: [],
        };

        await expect(useCase.execute(command)).rejects.toThrow(
          'Deployer failed',
        );
      });
    });

    it('calls deployArtifacts with the provided versions', async () => {
      mockDeployer.deployArtifacts.mockResolvedValue({
        createOrUpdate: [],
        delete: [],
      });

      const command: PreviewArtifactRenderingCommand = {
        codingAgent: 'cursor',
        recipeVersions: [recipeVersion],
        standardVersions: [standardVersion],
        skillVersions: [],
      };

      await useCase.execute(command);

      expect(mockDeployer.deployArtifacts).toHaveBeenCalledWith(
        [recipeVersion],
        [standardVersion],
        [],
      );
    });

    it('gets the deployer for the correct agent', async () => {
      mockDeployer.deployArtifacts.mockResolvedValue({
        createOrUpdate: [],
        delete: [],
      });

      const command: PreviewArtifactRenderingCommand = {
        codingAgent: 'copilot',
        recipeVersions: [],
        standardVersions: [],
        skillVersions: [],
      };

      await useCase.execute(command);

      expect(mockDeployerRegistry.getDeployer).toHaveBeenCalledWith('copilot');
    });
  });
});
