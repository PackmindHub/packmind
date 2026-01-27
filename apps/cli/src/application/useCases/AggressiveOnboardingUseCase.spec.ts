import { AggressiveOnboardingUseCase } from './AggressiveOnboardingUseCase';
import { IProjectScannerService } from '../services/ProjectScannerService';
import { IDocumentationScannerService } from '../services/DocumentationScannerService';
import { IStandardsGeneratorService } from '../services/StandardsGeneratorService';
import { ICommandsGeneratorService } from '../services/CommandsGeneratorService';
import { ISkillsGeneratorService } from '../services/SkillsGeneratorService';
import { IContentPreviewService } from '../services/ContentPreviewService';

describe('AggressiveOnboardingUseCase', () => {
  let useCase: AggressiveOnboardingUseCase;
  let mockScanner: jest.Mocked<IProjectScannerService>;
  let mockDocScanner: jest.Mocked<IDocumentationScannerService>;
  let mockStandardsGen: jest.Mocked<IStandardsGeneratorService>;
  let mockCommandsGen: jest.Mocked<ICommandsGeneratorService>;
  let mockSkillsGen: jest.Mocked<ISkillsGeneratorService>;
  let mockPreview: jest.Mocked<IContentPreviewService>;

  beforeEach(() => {
    mockScanner = {
      scanProject: jest.fn(),
    };
    mockDocScanner = {
      scanExistingDocumentation: jest.fn(),
    };
    mockStandardsGen = {
      generateStandards: jest.fn(),
    };
    mockCommandsGen = {
      generateCommands: jest.fn(),
    };
    mockSkillsGen = {
      generateSkills: jest.fn(),
    };
    mockPreview = {
      formatPreview: jest.fn(),
    };

    useCase = new AggressiveOnboardingUseCase(
      mockScanner,
      mockDocScanner,
      mockStandardsGen,
      mockCommandsGen,
      mockSkillsGen,
      mockPreview,
    );
  });

  describe('execute', () => {
    it('scans project and generates content', async () => {
      const scanResult = {
        languages: ['TypeScript'],
        frameworks: ['NestJS'],
        tools: ['nx'],
        structure: { isMonorepo: true, hasTests: true, hasSrcDirectory: true },
        testFramework: 'jest',
        packageManager: 'npm',
        hasTypeScript: true,
        hasLinting: true,
      };

      const docResult = {
        extractedRules: ['Use strict mode'],
        extractedConventions: ['Follow conventional commits'],
        extractedWorkflows: [],
        sourceFiles: ['CLAUDE.md'],
      };

      const standards = [
        {
          name: 'TypeScript Standards',
          description: 'TS best practices',
          summary: 'Use TS properly',
          rules: [{ content: 'Use interfaces' }],
        },
      ];

      const commands = [
        {
          name: 'Create Module',
          summary: 'Create NestJS module',
          whenToUse: ['Adding features'],
          contextValidationCheckpoints: ['What name?'],
          steps: [{ name: 'Step 1', description: 'Do something' }],
        },
      ];

      const skills = [
        {
          name: 'debugging-jest',
          description: 'Debug with Jest',
          prompt: '# Debugging guide',
        },
      ];

      mockScanner.scanProject.mockResolvedValue(scanResult);
      mockDocScanner.scanExistingDocumentation.mockResolvedValue(docResult);
      mockStandardsGen.generateStandards.mockReturnValue(standards);
      mockCommandsGen.generateCommands.mockReturnValue(commands);
      mockSkillsGen.generateSkills.mockReturnValue(skills);
      mockPreview.formatPreview.mockReturnValue('Preview output');

      const result = await useCase.execute({ projectPath: '/test/path' });

      expect(mockScanner.scanProject).toHaveBeenCalledWith('/test/path');
      expect(mockDocScanner.scanExistingDocumentation).toHaveBeenCalledWith(
        '/test/path',
      );
      expect(mockStandardsGen.generateStandards).toHaveBeenCalledWith(
        scanResult,
        docResult,
      );
      expect(mockCommandsGen.generateCommands).toHaveBeenCalledWith(scanResult);
      expect(mockSkillsGen.generateSkills).toHaveBeenCalledWith(scanResult);
      expect(result.content.standards).toEqual(standards);
      expect(result.content.commands).toEqual(commands);
      expect(result.content.skills).toEqual(skills);
      expect(result.preview).toBe('Preview output');
    });

    it('uses current directory when projectPath not provided', async () => {
      const scanResult = {
        languages: [],
        frameworks: [],
        tools: [],
        structure: {
          isMonorepo: false,
          hasTests: false,
          hasSrcDirectory: false,
        },
        hasTypeScript: false,
        hasLinting: false,
      };

      const docResult = {
        extractedRules: [],
        extractedConventions: [],
        extractedWorkflows: [],
        sourceFiles: [],
      };

      mockScanner.scanProject.mockResolvedValue(scanResult);
      mockDocScanner.scanExistingDocumentation.mockResolvedValue(docResult);
      mockStandardsGen.generateStandards.mockReturnValue([]);
      mockCommandsGen.generateCommands.mockReturnValue([]);
      mockSkillsGen.generateSkills.mockReturnValue([]);
      mockPreview.formatPreview.mockReturnValue('Empty preview');

      await useCase.execute({});

      expect(mockScanner.scanProject).toHaveBeenCalledWith(process.cwd());
    });

    it('returns scan result in response', async () => {
      const scanResult = {
        languages: ['TypeScript', 'Python'],
        frameworks: ['NestJS', 'FastAPI'],
        tools: ['nx', 'eslint'],
        structure: { isMonorepo: true, hasTests: true, hasSrcDirectory: true },
        testFramework: 'jest',
        packageManager: 'pnpm',
        hasTypeScript: true,
        hasLinting: true,
      };

      const docResult = {
        extractedRules: [],
        extractedConventions: [],
        extractedWorkflows: [],
        sourceFiles: [],
      };

      mockScanner.scanProject.mockResolvedValue(scanResult);
      mockDocScanner.scanExistingDocumentation.mockResolvedValue(docResult);
      mockStandardsGen.generateStandards.mockReturnValue([]);
      mockCommandsGen.generateCommands.mockReturnValue([]);
      mockSkillsGen.generateSkills.mockReturnValue([]);
      mockPreview.formatPreview.mockReturnValue('Preview');

      const result = await useCase.execute({ projectPath: '/test' });

      expect(result.scanResult).toEqual(scanResult);
    });
  });
});
