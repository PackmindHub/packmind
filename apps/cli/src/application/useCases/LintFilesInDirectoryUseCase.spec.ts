import { LintFilesInDirectoryUseCase } from './LintFilesInDirectoryUseCase';
import { PackmindServices } from '../services/PackmindServices';
import { IPackmindRepositories } from '../../domain/repositories/IPackmindRepositories';
import { ListFiles } from '../services/ListFiles';
import { GitService } from '../services/GitService';
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';
import {
  ExecuteLinterProgramsCommand,
  IExecuteLinterProgramsUseCase,
  LinterExecutionViolation,
  ProgrammingLanguage,
} from '@packmind/shared';

describe('LintFilesInDirectoryUseCase', () => {
  let useCase: LintFilesInDirectoryUseCase;
  let mockServices: PackmindServices;
  let mockRepositories: IPackmindRepositories;
  let mockListFiles: jest.Mocked<ListFiles>;
  let mockGitRemoteUrlService: jest.Mocked<GitService>;
  let mockLinterExecutionUseCase: jest.Mocked<IExecuteLinterProgramsUseCase>;
  let mockPackmindGateway: jest.Mocked<IPackmindGateway>;

  beforeEach(() => {
    mockListFiles = {
      listFilesInDirectory: jest.fn(),
    } as unknown as jest.Mocked<ListFiles>;

    mockGitRemoteUrlService = {
      getGitRemoteUrl: jest.fn(),
    } as unknown as jest.Mocked<GitService>;

    mockLinterExecutionUseCase = {
      execute: jest.fn(async (command: ExecuteLinterProgramsCommand) => ({
        file: command.filePath,
        violations: command.programs.map<LinterExecutionViolation>(
          (program) => ({
            line: 1,
            character: 0,
            rule: program.ruleContent,
            standard: program.standardSlug,
          }),
        ),
      })),
    } as unknown as jest.Mocked<IExecuteLinterProgramsUseCase>;

    mockPackmindGateway = {
      listExecutionPrograms: jest.fn(),
    };

    mockServices = {
      listFiles: mockListFiles,
      gitRemoteUrlService: mockGitRemoteUrlService,
      linterExecutionUseCase: mockLinterExecutionUseCase,
    };

    mockRepositories = {
      packmindGateway: mockPackmindGateway,
    };

    useCase = new LintFilesInDirectoryUseCase(mockServices, mockRepositories);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('executes complete linting flow with correct parameters', async () => {
    const mockFiles = [
      { path: '/project/src/file1.ts', content: 'interface User {}' },
      { path: '/project/src/file2.ts', content: 'interface IAdmin {}' },
    ];
    const gitRemoteUrl = 'github.com/user/repo';
    const mockDetectionPrograms = {
      standards: [
        {
          name: 'Interface Naming',
          slug: 'interface-naming',
          scope: [],
          rules: [
            {
              content: 'Interface names should start with I',
              activeDetectionPrograms: [
                {
                  language: 'typescript',
                  detectionProgram: {
                    mode: 'ast',
                    code: 'function checkSourceCode(ast) { return [1]; }',
                    sourceCodeState: 'AST' as const,
                  },
                },
              ],
            },
          ],
        },
      ],
    };

    mockListFiles.listFilesInDirectory.mockResolvedValue(mockFiles);
    mockGitRemoteUrlService.getGitRemoteUrl.mockResolvedValue({ gitRemoteUrl });
    mockPackmindGateway.listExecutionPrograms.mockResolvedValue(
      mockDetectionPrograms,
    );

    const result = await useCase.execute({
      path: '/project',
    });

    expect(mockListFiles.listFilesInDirectory).toHaveBeenCalledWith(
      '/project',
      [],
      ['node_modules', 'dist', '.min.', '.map.', '.git'],
    );
    expect(mockGitRemoteUrlService.getGitRemoteUrl).toHaveBeenCalledWith(
      '/project',
    );
    expect(mockPackmindGateway.listExecutionPrograms).toHaveBeenCalledWith({
      gitRemoteUrl,
    });
    expect(mockLinterExecutionUseCase.execute).toHaveBeenCalledTimes(2);
    mockFiles.forEach((file) => {
      expect(mockLinterExecutionUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          filePath: file.path,
          language: ProgrammingLanguage.TYPESCRIPT,
        }),
      );
    });

    expect(result.gitRemoteUrl).toBe(gitRemoteUrl);
    expect(result.violations).toHaveLength(2);
    expect(result.summary.totalFiles).toBe(2);
    expect(result.summary.violatedFiles).toBe(2);
    expect(result.summary.totalViolations).toBe(2);
    expect(result.summary.standardsChecked).toEqual(['interface-naming']);
  });

  describe('when no files found', () => {
    it('returns empty violations', async () => {
      mockListFiles.listFilesInDirectory.mockResolvedValue([]);
      mockGitRemoteUrlService.getGitRemoteUrl.mockResolvedValue({
        gitRemoteUrl: 'github.com/user/repo',
      });
      mockPackmindGateway.listExecutionPrograms.mockResolvedValue({
        standards: [],
      });

      const result = await useCase.execute({
        path: '/empty-project',
      });

      expect(result.violations).toHaveLength(0);
      expect(mockLinterExecutionUseCase.execute).not.toHaveBeenCalled();
      expect(result.summary.totalFiles).toBe(0);
      expect(result.summary.violatedFiles).toBe(0);
      expect(result.summary.totalViolations).toBe(0);
    });
  });

  it('handles linter execution errors gracefully', async () => {
    const mockFiles = [
      { path: '/project/src/file1.ts', content: 'interface User {}' },
    ];
    const mockDetectionPrograms = {
      standards: [
        {
          name: 'Test Standard',
          slug: 'test-standard',
          scope: [],
          rules: [
            {
              content: 'Test rule',
              activeDetectionPrograms: [
                {
                  language: 'typescript',
                  detectionProgram: {
                    mode: 'ast',
                    code: 'invalid code',
                    sourceCodeState: 'AST' as const,
                  },
                },
              ],
            },
          ],
        },
      ],
    };

    mockListFiles.listFilesInDirectory.mockResolvedValue(mockFiles);
    mockGitRemoteUrlService.getGitRemoteUrl.mockResolvedValue({
      gitRemoteUrl: 'github.com/user/repo',
    });
    mockPackmindGateway.listExecutionPrograms.mockResolvedValue(
      mockDetectionPrograms,
    );
    mockLinterExecutionUseCase.execute.mockRejectedValue(
      new Error('AST parsing failed'),
    );

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    const result = await useCase.execute({
      path: '/project',
    });

    expect(result.violations).toHaveLength(0);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Error executing programs for file'),
    );

    consoleSpy.mockRestore();
  });

  describe('when standard has scope patterns', () => {
    it('applies scope filtering', async () => {
      const mockFiles = [
        { path: '/project/src/component.ts', content: 'interface User {}' },
        {
          path: '/project/src/component.spec.ts',
          content: 'interface TestInterface {}',
        },
        { path: '/project/test/helpers.ts', content: 'interface Helper {}' },
      ];
      const mockDetectionPrograms = {
        standards: [
          {
            name: 'Test Files Standard',
            slug: 'test-files',
            scope: ['**/*.spec.ts', '**/test/**/*.ts'],
            rules: [
              {
                content: 'Test specific rule',
                activeDetectionPrograms: [
                  {
                    language: 'typescript',
                    detectionProgram: {
                      mode: 'ast',
                      code: 'function checkSourceCode(ast) { return [1]; }',
                      sourceCodeState: 'AST' as const,
                    },
                  },
                ],
              },
            ],
          },
        ],
      };

      mockListFiles.listFilesInDirectory.mockResolvedValue(mockFiles);
      mockGitRemoteUrlService.getGitRemoteUrl.mockResolvedValue({
        gitRemoteUrl: 'github.com/user/repo',
      });
      mockPackmindGateway.listExecutionPrograms.mockResolvedValue(
        mockDetectionPrograms,
      );

      await useCase.execute({
        path: '/project',
      });

      expect(mockLinterExecutionUseCase.execute).toHaveBeenCalledTimes(2);
      expect(mockLinterExecutionUseCase.execute).not.toHaveBeenCalledWith(
        expect.objectContaining({
          filePath: '/project/src/component.ts',
        }),
      );
    });
  });

  describe('when standard has empty scope', () => {
    it('runs on all files', async () => {
      const mockFiles = [
        { path: '/project/src/component.ts', content: 'interface User {}' },
        {
          path: '/project/src/component.spec.ts',
          content: 'interface TestInterface {}',
        },
      ];
      const mockDetectionPrograms = {
        standards: [
          {
            name: 'Global Standard',
            slug: 'global',
            scope: [],
            rules: [
              {
                content: 'Global rule',
                activeDetectionPrograms: [
                  {
                    language: 'typescript',
                    detectionProgram: {
                      mode: 'ast',
                      code: 'function checkSourceCode(ast) { return [1]; }',
                      sourceCodeState: 'AST' as const,
                    },
                  },
                ],
              },
            ],
          },
        ],
      };

      mockListFiles.listFilesInDirectory.mockResolvedValue(mockFiles);
      mockGitRemoteUrlService.getGitRemoteUrl.mockResolvedValue({
        gitRemoteUrl: 'github.com/user/repo',
      });
      mockPackmindGateway.listExecutionPrograms.mockResolvedValue(
        mockDetectionPrograms,
      );

      await useCase.execute({
        path: '/project',
      });

      expect(mockLinterExecutionUseCase.execute).toHaveBeenCalledTimes(2);
    });
  });

  it('skips programs with unsupported languages', async () => {
    const mockFiles = [
      { path: '/project/src/file1.py', content: 'print("hello")' },
    ];
    const mockDetectionPrograms = {
      standards: [
        {
          name: 'Python Standard',
          slug: 'python-standard',
          scope: [],
          rules: [
            {
              content: 'Test rule',
              activeDetectionPrograms: [
                {
                  language: 'unsupported-lang',
                  detectionProgram: {
                    mode: 'ast',
                    code: 'function checkSourceCode() { return [1]; }',
                    sourceCodeState: 'AST' as const,
                  },
                },
              ],
            },
          ],
        },
      ],
    };

    mockListFiles.listFilesInDirectory.mockResolvedValue(mockFiles);
    mockGitRemoteUrlService.getGitRemoteUrl.mockResolvedValue({
      gitRemoteUrl: 'github.com/user/repo',
    });
    mockPackmindGateway.listExecutionPrograms.mockResolvedValue(
      mockDetectionPrograms,
    );

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    await useCase.execute({
      path: '/project',
    });

    expect(mockLinterExecutionUseCase.execute).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Unsupported programming language'),
    );

    consoleSpy.mockRestore();
  });

  describe('extractExtensionFromFile', () => {
    it('extracts extension from simple filename', () => {
      const result = useCase.extractExtensionFromFile('file.js');

      expect(result).toBe('js');
    });

    it('extracts extension from path with forward slashes', () => {
      const result = useCase.extractExtensionFromFile('src/file.js');

      expect(result).toBe('js');
    });

    it('extracts extension from path with backward slashes', () => {
      const result = useCase.extractExtensionFromFile('src\\file.js');

      expect(result).toBe('js');
    });

    it('extracts extension from nested path', () => {
      const result = useCase.extractExtensionFromFile(
        'src/components/MyComponent.tsx',
      );

      expect(result).toBe('tsx');
    });

    it('returns empty string for file without extension', () => {
      const result = useCase.extractExtensionFromFile('Dockerfile');

      expect(result).toBe('');
    });

    it('returns empty string for file ending with dot', () => {
      const result = useCase.extractExtensionFromFile('file.');

      expect(result).toBe('');
    });

    it('extracts last extension from file with multiple dots', () => {
      const result = useCase.extractExtensionFromFile('file.spec.ts');

      expect(result).toBe('ts');
    });
  });
});
