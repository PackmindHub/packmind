import {
  DetectionModeEnum,
  ExecuteLinterProgramsCommand,
  IExecuteLinterProgramsUseCase,
  LinterExecutionViolation,
  ListDetectionProgramResponse,
  ProgrammingLanguage,
  RuleId,
} from '@packmind/types';
import * as fs from 'fs/promises';
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';
import { IPackmindRepositories } from '../../domain/repositories/IPackmindRepositories';
import { GitService } from '../services/GitService';
import { ListFiles } from '../services/ListFiles';
import { IPackmindServices } from '../services/IPackmindServices';
import { LintFilesInDirectoryUseCase } from './LintFilesInDirectoryUseCase';
import { ILinterGateway } from '../../domain/repositories/ILinterGateway';
import {
  createMockLinterGateway,
  createMockPackmindGateway,
} from '../../mocks/createMockGateways';
import {
  createMockExecuteLinterProgramsUseCase,
  createMockGitService,
  createMockListFiles,
  createMockServices,
} from '../../mocks/createMockServices';
import { createMockPackmindRepositories } from '../../mocks/createMockRepositories';
import { stubLogger } from '@packmind/test-utils';

jest.mock('fs/promises');

describe('LintFilesInDirectoryUseCase', () => {
  let useCase: LintFilesInDirectoryUseCase;
  let mockServices: IPackmindServices;
  let mockRepositories: IPackmindRepositories;
  let mockListFiles: jest.Mocked<ListFiles>;
  let mockGitRemoteUrlService: jest.Mocked<GitService>;
  let mockLinterExecutionUseCase: jest.Mocked<IExecuteLinterProgramsUseCase>;
  let mockPackmindGateway: jest.Mocked<IPackmindGateway>;
  let mockLinterGateway: jest.Mocked<ILinterGateway>;

  beforeEach(() => {
    mockListFiles = createMockListFiles();
    mockGitRemoteUrlService = createMockGitService();
    mockLinterExecutionUseCase = createMockExecuteLinterProgramsUseCase({
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
    });

    mockLinterGateway = createMockLinterGateway();
    mockPackmindGateway = createMockPackmindGateway({
      linter: mockLinterGateway,
    });

    mockServices = createMockServices({
      listFiles: mockListFiles,
      gitRemoteUrlService: mockGitRemoteUrlService,
      linterExecutionUseCase: mockLinterExecutionUseCase,
    });

    mockRepositories = createMockPackmindRepositories({
      packmindGateway: mockPackmindGateway,
    });

    // By default, mock fs.stat to return directory stats
    (fs.stat as jest.Mock).mockResolvedValue({
      isFile: () => false,
      isDirectory: () => true,
    });

    useCase = new LintFilesInDirectoryUseCase(mockServices, mockRepositories);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when executing complete linting flow', () => {
    const mockFiles = [
      { path: '/project/src/file1.ts' },
      { path: '/project/src/file2.ts' },
    ];
    const gitRemoteUrl = 'github.com/user/repo';
    const branches = ['main', 'develop'];
    const mockDetectionPrograms: ListDetectionProgramResponse = {
      targets: [
        {
          name: 'Root Target',
          path: '/',
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
                        mode: DetectionModeEnum.SINGLE_AST,
                        code: 'function checkSourceCode(ast) { return [1]; }',
                        sourceCodeState: 'AST' as const,
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    let result: Awaited<ReturnType<typeof useCase.execute>>;

    beforeEach(async () => {
      mockGitRemoteUrlService.getGitRepositoryRoot.mockReturnValue('/project');
      mockListFiles.listFilesInDirectory.mockResolvedValue(mockFiles);
      mockListFiles.readFileContent.mockImplementation(async (filePath) => {
        if (filePath === '/project/src/file1.ts') return 'interface User {}';
        if (filePath === '/project/src/file2.ts') return 'interface IAdmin {}';
        return '';
      });
      mockGitRemoteUrlService.getGitRemoteUrl.mockReturnValue({
        gitRemoteUrl,
      });
      mockGitRemoteUrlService.getCurrentBranches.mockReturnValue({
        branches,
      });
      mockLinterGateway.listDetectionPrograms.mockResolvedValue(
        mockDetectionPrograms,
      );

      result = await useCase.execute({
        path: '/project',
      });
    });

    it('calls getGitRepositoryRoot with correct path', () => {
      expect(mockGitRemoteUrlService.getGitRepositoryRoot).toHaveBeenCalledWith(
        '/project',
      );
    });

    it('calls listFilesInDirectory with correct parameters', () => {
      expect(mockListFiles.listFilesInDirectory).toHaveBeenCalledWith(
        '/project',
        [],
        ['node_modules', 'dist', '.min.', '.map.', '.git'],
      );
    });

    it('calls getGitRemoteUrl with correct path', () => {
      expect(mockGitRemoteUrlService.getGitRemoteUrl).toHaveBeenCalledWith(
        '/project',
      );
    });

    it('calls getCurrentBranches with correct path', () => {
      expect(mockGitRemoteUrlService.getCurrentBranches).toHaveBeenCalledWith(
        '/project',
      );
    });

    it('calls listExecutionPrograms with correct parameters', () => {
      expect(
        mockPackmindGateway.linter.listDetectionPrograms,
      ).toHaveBeenCalledWith({
        gitRemoteUrl,
        branches,
      });
    });

    it('executes linter for each file', () => {
      expect(mockLinterExecutionUseCase.execute).toHaveBeenCalledTimes(2);
    });

    it('executes linter with correct parameters for file1', () => {
      expect(mockLinterExecutionUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          filePath: '/project/src/file1.ts',
          language: ProgrammingLanguage.TYPESCRIPT,
        }),
      );
    });

    it('executes linter with correct parameters for file2', () => {
      expect(mockLinterExecutionUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          filePath: '/project/src/file2.ts',
          language: ProgrammingLanguage.TYPESCRIPT,
        }),
      );
    });

    it('returns correct gitRemoteUrl', () => {
      expect(result.gitRemoteUrl).toBe(gitRemoteUrl);
    });

    it('returns correct number of violations', () => {
      expect(result.violations).toHaveLength(2);
    });

    it('returns correct totalFiles in summary', () => {
      expect(result.summary.totalFiles).toBe(2);
    });

    it('returns correct violatedFiles in summary', () => {
      expect(result.summary.violatedFiles).toBe(2);
    });

    it('returns correct totalViolations in summary', () => {
      expect(result.summary.totalViolations).toBe(2);
    });

    it('returns correct standardsChecked in summary', () => {
      expect(result.summary.standardsChecked).toEqual(['interface-naming']);
    });
  });

  describe('when no files found', () => {
    let result: Awaited<ReturnType<typeof useCase.execute>>;

    beforeEach(async () => {
      mockGitRemoteUrlService.getGitRepositoryRoot.mockReturnValue(
        '/empty-project',
      );
      mockListFiles.listFilesInDirectory.mockResolvedValue([]);
      mockGitRemoteUrlService.getGitRemoteUrl.mockReturnValue({
        gitRemoteUrl: 'github.com/user/repo',
      });
      mockGitRemoteUrlService.getCurrentBranches.mockReturnValue({
        branches: ['main'],
      });
      mockLinterGateway.listDetectionPrograms.mockResolvedValue({
        targets: [],
      });

      result = await useCase.execute({
        path: '/empty-project',
      });
    });

    it('returns empty violations array', () => {
      expect(result.violations).toHaveLength(0);
    });

    it('does not call linter execution', () => {
      expect(mockLinterExecutionUseCase.execute).not.toHaveBeenCalled();
    });

    it('returns zero totalFiles in summary', () => {
      expect(result.summary.totalFiles).toBe(0);
    });

    it('returns zero violatedFiles in summary', () => {
      expect(result.summary.violatedFiles).toBe(0);
    });

    it('returns zero totalViolations in summary', () => {
      expect(result.summary.totalViolations).toBe(0);
    });
  });

  describe('when path is a single file', () => {
    describe('when linting a TypeScript file', () => {
      const mockDetectionPrograms: ListDetectionProgramResponse = {
        targets: [
          {
            name: 'Root Target',
            path: '/',
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
                          mode: DetectionModeEnum.SINGLE_AST,
                          code: 'function checkSourceCode(ast) { return [1]; }',
                          sourceCodeState: 'AST' as const,
                        },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };
      let result: Awaited<ReturnType<typeof useCase.execute>>;

      beforeEach(async () => {
        (fs.stat as jest.Mock).mockResolvedValue({
          isFile: () => true,
          isDirectory: () => false,
        });

        mockGitRemoteUrlService.getGitRepositoryRoot.mockReturnValue(
          '/project',
        );
        mockListFiles.readFileContent.mockResolvedValue('interface User {}');
        mockGitRemoteUrlService.getGitRemoteUrl.mockReturnValue({
          gitRemoteUrl: 'github.com/user/repo',
        });
        mockGitRemoteUrlService.getCurrentBranches.mockReturnValue({
          branches: ['main'],
        });
        mockLinterGateway.listDetectionPrograms.mockResolvedValue(
          mockDetectionPrograms,
        );

        result = await useCase.execute({
          path: '/project/src/user.ts',
        });
      });

      it('uses directory for Git operations', () => {
        expect(
          mockGitRemoteUrlService.getGitRepositoryRoot,
        ).toHaveBeenCalledWith('/project/src');
      });

      it('does not call listFilesInDirectory', () => {
        expect(mockListFiles.listFilesInDirectory).not.toHaveBeenCalled();
      });

      it('lints the single file with correct parameters', () => {
        expect(mockLinterExecutionUseCase.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            filePath: '/project/src/user.ts',
            language: ProgrammingLanguage.TYPESCRIPT,
          }),
        );
      });

      it('returns one violation', () => {
        expect(result.violations).toHaveLength(1);
      });

      it('returns totalFiles as 1 in summary', () => {
        expect(result.summary.totalFiles).toBe(1);
      });

      it('returns violatedFiles as 1 in summary', () => {
        expect(result.summary.violatedFiles).toBe(1);
      });
    });

    describe('when linting a JavaScript file with violations', () => {
      const mockDetectionPrograms: ListDetectionProgramResponse = {
        targets: [
          {
            name: 'Root Target',
            path: '/',
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
                        language: 'js',
                        detectionProgram: {
                          mode: DetectionModeEnum.SINGLE_AST,
                          code: 'function check() { return [1]; }',
                          sourceCodeState: 'AST' as const,
                        },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };
      let result: Awaited<ReturnType<typeof useCase.execute>>;

      beforeEach(async () => {
        (fs.stat as jest.Mock).mockResolvedValue({
          isFile: () => true,
          isDirectory: () => false,
        });

        mockGitRemoteUrlService.getGitRepositoryRoot.mockReturnValue(
          '/project',
        );
        mockListFiles.readFileContent.mockResolvedValue('const x = 1;');
        mockGitRemoteUrlService.getGitRemoteUrl.mockReturnValue({
          gitRemoteUrl: 'github.com/user/repo',
        });
        mockGitRemoteUrlService.getCurrentBranches.mockReturnValue({
          branches: ['main'],
        });
        mockLinterGateway.listDetectionPrograms.mockResolvedValue(
          mockDetectionPrograms,
        );

        result = await useCase.execute({
          path: '/project/index.js',
        });
      });

      it('returns one violation', () => {
        expect(result.violations).toHaveLength(1);
      });

      it('returns correct file path in violation', () => {
        expect(result.violations[0].file).toBe('/project/index.js');
      });

      it('returns non-empty violations array for the file', () => {
        expect(result.violations[0].violations.length).toBeGreaterThan(0);
      });
    });
  });

  describe('when linter execution throws an error', () => {
    const mockFiles = [{ path: '/project/src/file1.ts' }];
    const mockDetectionPrograms: ListDetectionProgramResponse = {
      targets: [
        {
          name: 'Root Target',
          path: '/',
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
                        mode: DetectionModeEnum.SINGLE_AST,
                        code: 'invalid code',
                        sourceCodeState: 'AST' as const,
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    let result: Awaited<ReturnType<typeof useCase.execute>>;
    let consoleSpy: jest.SpyInstance;

    beforeEach(async () => {
      mockGitRemoteUrlService.getGitRepositoryRoot.mockReturnValue('/project');
      mockListFiles.listFilesInDirectory.mockResolvedValue(mockFiles);
      mockListFiles.readFileContent.mockResolvedValue('interface User {}');
      mockGitRemoteUrlService.getGitRemoteUrl.mockReturnValue({
        gitRemoteUrl: 'github.com/user/repo',
      });
      mockGitRemoteUrlService.getCurrentBranches.mockReturnValue({
        branches: ['main'],
      });
      mockLinterGateway.listDetectionPrograms.mockResolvedValue(
        mockDetectionPrograms,
      );
      mockLinterExecutionUseCase.execute.mockRejectedValue(
        new Error('AST parsing failed'),
      );

      consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      result = await useCase.execute({
        path: '/project',
      });
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('returns empty violations array', () => {
      expect(result.violations).toHaveLength(0);
    });

    it('logs error message to console', () => {
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('Error executing programs for file'),
      );
    });
  });

  describe('when standard has scope patterns', () => {
    const mockFiles = [
      { path: '/project/src/component.ts' },
      {
        path: '/project/src/component.spec.ts',
      },
      { path: '/project/test/helpers.ts' },
    ];
    const mockDetectionPrograms: ListDetectionProgramResponse = {
      targets: [
        {
          name: 'Root Target',
          path: '/',
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
                        mode: DetectionModeEnum.SINGLE_AST,
                        code: 'function checkSourceCode(ast) { return [1]; }',
                        sourceCodeState: 'AST' as const,
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    beforeEach(async () => {
      mockGitRemoteUrlService.getGitRepositoryRoot.mockReturnValue('/project');
      mockListFiles.listFilesInDirectory.mockResolvedValue(mockFiles);
      mockListFiles.readFileContent.mockImplementation(async (filePath) => {
        if (filePath === '/project/src/component.ts')
          return 'interface User {}';
        if (filePath === '/project/src/component.spec.ts')
          return 'interface TestInterface {}';
        if (filePath === '/project/test/helpers.ts')
          return 'interface Helper {}';
        return '';
      });
      mockGitRemoteUrlService.getGitRemoteUrl.mockReturnValue({
        gitRemoteUrl: 'github.com/user/repo',
      });
      mockGitRemoteUrlService.getCurrentBranches.mockReturnValue({
        branches: ['main'],
      });
      mockLinterGateway.listDetectionPrograms.mockResolvedValue(
        mockDetectionPrograms,
      );

      await useCase.execute({
        path: '/project',
      });
    });

    it('executes linter only for files matching scope', () => {
      expect(mockLinterExecutionUseCase.execute).toHaveBeenCalledTimes(2);
    });

    it('excludes files not matching scope pattern', () => {
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
        { path: '/project/src/component.ts' },
        {
          path: '/project/src/component.spec.ts',
        },
      ];
      const mockDetectionPrograms: ListDetectionProgramResponse = {
        targets: [
          {
            name: 'Root Target',
            path: '/',
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
                          mode: DetectionModeEnum.SINGLE_AST,
                          code: 'function checkSourceCode(ast) { return [1]; }',
                          sourceCodeState: 'AST' as const,
                        },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };

      mockGitRemoteUrlService.getGitRepositoryRoot.mockReturnValue('/project');
      mockListFiles.listFilesInDirectory.mockResolvedValue(mockFiles);
      mockListFiles.readFileContent.mockImplementation(async (filePath) => {
        if (filePath === '/project/src/component.ts')
          return 'interface User {}';
        if (filePath === '/project/src/component.spec.ts')
          return 'interface TestInterface {}';
        return '';
      });
      mockGitRemoteUrlService.getGitRemoteUrl.mockReturnValue({
        gitRemoteUrl: 'github.com/user/repo',
      });
      mockGitRemoteUrlService.getCurrentBranches.mockReturnValue({
        branches: ['main'],
      });
      mockLinterGateway.listDetectionPrograms.mockResolvedValue(
        mockDetectionPrograms,
      );

      await useCase.execute({
        path: '/project',
      });

      expect(mockLinterExecutionUseCase.execute).toHaveBeenCalledTimes(2);
    });
  });

  it('skips programs with unsupported languages', async () => {
    const mockFiles = [{ path: '/project/src/file1.py' }];
    const mockDetectionPrograms: ListDetectionProgramResponse = {
      targets: [
        {
          name: 'Root Target',
          path: '/',
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
                        mode: DetectionModeEnum.SINGLE_AST,
                        code: 'function checkSourceCode() { return [1]; }',
                        sourceCodeState: 'AST' as const,
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    mockGitRemoteUrlService.getGitRepositoryRoot.mockReturnValue('/project');
    mockListFiles.listFilesInDirectory.mockResolvedValue(mockFiles);
    mockGitRemoteUrlService.getGitRemoteUrl.mockReturnValue({
      gitRemoteUrl: 'github.com/user/repo',
    });
    mockGitRemoteUrlService.getCurrentBranches.mockReturnValue({
      branches: ['main'],
    });
    mockLinterGateway.listDetectionPrograms.mockResolvedValue(
      mockDetectionPrograms,
    );

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    await useCase.execute({
      path: '/project',
    });

    expect(mockLinterExecutionUseCase.execute).not.toHaveBeenCalled();

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

  describe('when draft mode is enabled', () => {
    describe('when fetching draft programs', () => {
      const draftProgramsResponse = {
        programs: [
          {
            language: 'typescript',
            code: 'const x = 1;',
            mode: 'singleAst',
            sourceCodeState: 'AST' as const,
          },
        ],
        ruleContent: 'Test draft rule',
        standardSlug: 'test-standard',
        scope: null,
      };

      beforeEach(async () => {
        mockPackmindGateway.linter.getDraftDetectionProgramsForRule = jest
          .fn()
          .mockResolvedValue(draftProgramsResponse);

        mockGitRemoteUrlService.getGitRepositoryRoot.mockReturnValue(
          '/project',
        );
        mockListFiles.listFilesInDirectory.mockResolvedValue([
          { path: '/project/test.ts' },
        ]);
        mockListFiles.readFileContent.mockResolvedValue('const x = 1;');

        mockGitRemoteUrlService.getGitRemoteUrl.mockReturnValue({
          gitRemoteUrl: 'https://github.com/user/repo',
        });
        mockGitRemoteUrlService.getCurrentBranches.mockReturnValue({
          branches: ['main'],
        });

        mockLinterExecutionUseCase.execute.mockResolvedValue({
          file: '/project/test.ts',
          violations: [],
        });

        await useCase.execute({
          path: '/project',
          draftMode: true,
          standardSlug: 'test-standard',
          ruleId: 'rule-123' as RuleId,
        });
      });

      it('calls getDraftDetectionProgramsForRule with correct parameters', () => {
        expect(
          mockPackmindGateway.linter.getDraftDetectionProgramsForRule,
        ).toHaveBeenCalledWith({
          standardSlug: 'test-standard',
          ruleId: 'rule-123',
        });
      });

      it('does not call listExecutionPrograms', () => {
        expect(
          mockPackmindGateway.linter.listDetectionPrograms,
        ).not.toHaveBeenCalled();
      });
    });

    describe('when scope filtering is skipped', () => {
      const draftProgramsResponse = {
        programs: [
          {
            language: 'typescript',
            code: 'const x = 1;',
            mode: 'singleAst',
            sourceCodeState: 'AST' as const,
          },
        ],
        ruleContent: 'Test draft rule',
        standardSlug: 'test-standard',
        scope: null,
      };
      let result: Awaited<ReturnType<typeof useCase.execute>>;

      beforeEach(async () => {
        mockPackmindGateway.linter.getDraftDetectionProgramsForRule = jest
          .fn()
          .mockResolvedValue(draftProgramsResponse);

        mockGitRemoteUrlService.getGitRepositoryRoot.mockReturnValue(
          '/project',
        );
        mockListFiles.listFilesInDirectory.mockResolvedValue([
          { path: '/project/outside-scope.ts' },
        ]);
        mockListFiles.readFileContent.mockResolvedValue('const x = 1;');

        mockGitRemoteUrlService.getGitRemoteUrl.mockReturnValue({
          gitRemoteUrl: 'https://github.com/user/repo',
        });
        mockGitRemoteUrlService.getCurrentBranches.mockReturnValue({
          branches: ['main'],
        });

        mockLinterExecutionUseCase.execute.mockResolvedValue({
          file: '/project/outside-scope.ts',
          violations: [
            {
              line: 1,
              character: 1,
              rule: 'Test draft rule',
              standard: 'test-standard',
            },
          ],
        });

        result = await useCase.execute({
          path: '/project',
          draftMode: true,
          standardSlug: 'test-standard',
          ruleId: 'rule-123' as RuleId,
        });
      });

      it('returns violations for all files', () => {
        expect(result.violations.length).toBe(1);
      });

      it('executes linter for all files', () => {
        expect(mockLinterExecutionUseCase.execute).toHaveBeenCalled();
      });
    });

    describe('when using draft mode with comma-separated scope', () => {
      const draftProgramsResponse = {
        programs: [
          {
            language: 'typescript',
            code: 'const x = 1;',
            mode: 'singleAst',
            sourceCodeState: 'AST' as const,
          },
        ],
        ruleContent: 'Test hexagonal architecture rule',
        standardSlug: 'hexagonal-architecture',
        scope: '**/*Hexa.ts,**/*Adapter.ts',
      };

      beforeEach(async () => {
        mockPackmindGateway.linter.getDraftDetectionProgramsForRule = jest
          .fn()
          .mockResolvedValue(draftProgramsResponse);

        mockGitRemoteUrlService.getGitRepositoryRoot.mockReturnValue(
          '/project',
        );
        mockListFiles.listFilesInDirectory.mockResolvedValue([
          { path: '/project/src/UserHexa.ts' },
          { path: '/project/src/UserAdapter.ts' },
          { path: '/project/src/UserService.ts' },
        ]);
        mockListFiles.readFileContent.mockResolvedValue('const x = 1;');

        mockGitRemoteUrlService.getGitRemoteUrl.mockReturnValue({
          gitRemoteUrl: 'https://github.com/user/repo',
        });
        mockGitRemoteUrlService.getCurrentBranches.mockReturnValue({
          branches: ['main'],
        });

        mockLinterExecutionUseCase.execute.mockResolvedValue({
          file: '/project/src/test.ts',
          violations: [
            {
              line: 1,
              character: 1,
              rule: 'Test hexagonal architecture rule',
              standard: 'hexagonal-architecture',
            },
          ],
        });

        await useCase.execute({
          path: '/project',
          draftMode: true,
          standardSlug: 'hexagonal-architecture',
          ruleId: 'rule-123' as RuleId,
        });
      });

      it('lints files matching first pattern', () => {
        expect(mockLinterExecutionUseCase.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            filePath: '/project/src/UserHexa.ts',
          }),
        );
      });

      it('lints files matching second pattern', () => {
        expect(mockLinterExecutionUseCase.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            filePath: '/project/src/UserAdapter.ts',
          }),
        );
      });

      it('does not lint files matching neither pattern', () => {
        expect(mockLinterExecutionUseCase.execute).not.toHaveBeenCalledWith(
          expect.objectContaining({
            filePath: '/project/src/UserService.ts',
          }),
        );
      });

      it('calls linter exactly twice', () => {
        expect(mockLinterExecutionUseCase.execute).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('when active mode is enabled', () => {
    describe('when using active mode with comma-separated scope', () => {
      const activeProgramsResponse = {
        programs: [
          {
            language: 'typescript',
            code: 'const x = 1;',
            mode: 'singleAst',
            sourceCodeState: 'AST' as const,
          },
        ],
        ruleContent: 'Test hexagonal architecture rule',
        standardSlug: 'hexagonal-architecture',
        scope: '**/*Hexa.ts,**/*Adapter.ts',
      };

      beforeEach(async () => {
        mockPackmindGateway.linter.getActiveDetectionProgramsForRule = jest
          .fn()
          .mockResolvedValue(activeProgramsResponse);

        mockGitRemoteUrlService.getGitRepositoryRoot.mockReturnValue(
          '/project',
        );
        mockListFiles.listFilesInDirectory.mockResolvedValue([
          { path: '/project/src/UserHexa.ts' },
          { path: '/project/src/UserAdapter.ts' },
          { path: '/project/src/UserService.ts' },
        ]);
        mockListFiles.readFileContent.mockResolvedValue('const x = 1;');

        mockGitRemoteUrlService.getGitRemoteUrl.mockReturnValue({
          gitRemoteUrl: 'https://github.com/user/repo',
        });
        mockGitRemoteUrlService.getCurrentBranches.mockReturnValue({
          branches: ['main'],
        });

        mockLinterExecutionUseCase.execute.mockResolvedValue({
          file: '/project/src/test.ts',
          violations: [
            {
              line: 1,
              character: 1,
              rule: 'Test hexagonal architecture rule',
              standard: 'hexagonal-architecture',
            },
          ],
        });

        await useCase.execute({
          path: '/project',
          draftMode: false,
          standardSlug: 'hexagonal-architecture',
          ruleId: 'rule-123' as RuleId,
        });
      });

      it('lints files matching first pattern', () => {
        expect(mockLinterExecutionUseCase.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            filePath: '/project/src/UserHexa.ts',
          }),
        );
      });

      it('lints files matching second pattern', () => {
        expect(mockLinterExecutionUseCase.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            filePath: '/project/src/UserAdapter.ts',
          }),
        );
      });

      it('does not lint files matching neither pattern', () => {
        expect(mockLinterExecutionUseCase.execute).not.toHaveBeenCalledWith(
          expect.objectContaining({
            filePath: '/project/src/UserService.ts',
          }),
        );
      });

      it('calls linter exactly twice', () => {
        expect(mockLinterExecutionUseCase.execute).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('File matching with target and scope', () => {
    // Create a clean instance for unit testing the public method
    let testUseCase: LintFilesInDirectoryUseCase;

    beforeEach(() => {
      // Minimal setup just to test the public method
      const mockServices = createMockServices();
      const mockRepositories = createMockPackmindRepositories();
      const mockLogger = stubLogger();

      testUseCase = new LintFilesInDirectoryUseCase(
        mockServices,
        mockRepositories,
        mockLogger,
      );
    });

    describe('Standard Scope is null', () => {
      describe('when target path is root', () => {
        it('includes all files (Ex 1)', () => {
          const filePath = '/frontend/src/file.js';
          const targetPath = '/';
          const scope: string[] = [];

          const result = testUseCase.fileMatchesTargetAndScope(
            filePath,
            targetPath,
            scope,
          );

          expect(result).toBe(true);
        });
      });

      describe('when target path matches file directory', () => {
        it('includes file in target path (Ex 2)', () => {
          const filePath = '/frontend/src/file.js';
          const targetPath = '/frontend/src/';
          const scope: string[] = [];

          const result = testUseCase.fileMatchesTargetAndScope(
            filePath,
            targetPath,
            scope,
          );

          expect(result).toBe(true);
        });
      });

      describe('when target path does not match file directory', () => {
        it('excludes file not in target path (Ex 3)', () => {
          const filePath = '/frontend/src/file.js';
          const targetPath = '/backend/';
          const scope: string[] = [];

          const result = testUseCase.fileMatchesTargetAndScope(
            filePath,
            targetPath,
            scope,
          );

          expect(result).toBe(false);
        });
      });
    });

    describe('Standard Scope is defined', () => {
      describe('when scope starts with target path', () => {
        it('uses scope alone and includes matching file (Ex 7)', () => {
          const filePath = '/backend/src/file.ts';
          const targetPath = '/backend/src';
          const scope = ['/backend/src/**/*.ts'];

          const result = testUseCase.fileMatchesTargetAndScope(
            filePath,
            targetPath,
            scope,
          );

          expect(result).toBe(true);
        });

        it('excludes file not matching scope pattern', () => {
          const filePath = '/backend/other/file.ts';
          const targetPath = '/backend/src';
          const scope = ['/backend/src/**/*.ts'];

          const result = testUseCase.fileMatchesTargetAndScope(
            filePath,
            targetPath,
            scope,
          );

          expect(result).toBe(false);
        });
      });

      describe('when scope does not start with target path', () => {
        it('concatenates target and scope for glob pattern (Ex 4)', () => {
          const filePath = '/backend/test/file.spec.ts';
          const targetPath = '/backend/';
          const scope = ['**/*.spec.ts'];

          const result = testUseCase.fileMatchesTargetAndScope(
            filePath,
            targetPath,
            scope,
          );

          expect(result).toBe(true);
        });

        it('excludes file not matching concatenated pattern (Ex 5)', () => {
          const filePath = '/backend/src/file.ts';
          const targetPath = '/backend/';
          const scope = ['test/**/*.spec.ts'];

          const result = testUseCase.fileMatchesTargetAndScope(
            filePath,
            targetPath,
            scope,
          );

          expect(result).toBe(false);
        });

        describe('when scope starts with leading slash', () => {
          it('strips leading slash and concatenates with target (Ex 6)', () => {
            const filePath = '/backend/test/file.spec.ts';
            const targetPath = '/backend/';
            const scope = ['/**/*.spec.ts'];

            const result = testUseCase.fileMatchesTargetAndScope(
              filePath,
              targetPath,
              scope,
            );

            expect(result).toBe(true);
          });

          it('handles directory scope with leading slash (Ex 8)', () => {
            const filePath = '/backend/src/infra/file.ts';
            const targetPath = '/backend/src';
            const scope = ['/infra/'];

            const result = testUseCase.fileMatchesTargetAndScope(
              filePath,
              targetPath,
              scope,
            );

            expect(result).toBe(true);
          });

          it('handles pattern scope with leading slash (Ex 9)', () => {
            const filePath = '/backend/src/infra/file.ts';
            const targetPath = '/backend/src';
            const scope = ['/infra/**/*.ts'];

            const result = testUseCase.fileMatchesTargetAndScope(
              filePath,
              targetPath,
              scope,
            );

            expect(result).toBe(true);
          });
        });
      });
    });

    describe('buildEffectivePattern', () => {
      describe('when scope is null and target is root', () => {
        it('returns wildcard pattern', () => {
          const pattern = testUseCase['buildEffectivePattern']('/', null);
          expect(pattern).toBe('/**');
        });
      });

      describe('when scope is null', () => {
        it('returns target path with wildcard', () => {
          const pattern = testUseCase['buildEffectivePattern'](
            '/backend/',
            null,
          );
          expect(pattern).toBe('/backend/**');
        });
      });

      describe('when scope starts with target path', () => {
        it('returns scope alone', () => {
          const pattern = testUseCase['buildEffectivePattern'](
            '/backend/src',
            '/backend/src/**/*.ts',
          );
          expect(pattern).toBe('/backend/src/**/*.ts');
        });
      });

      it('strips leading slash from scope and concatenates', () => {
        const pattern = testUseCase['buildEffectivePattern'](
          '/backend',
          '/**/*.spec.ts',
        );
        expect(pattern).toBe('/backend/**/*.spec.ts');
      });

      it('concatenates target and scope without leading slash', () => {
        const pattern = testUseCase['buildEffectivePattern'](
          '/backend/',
          '**/*.spec.ts',
        );
        expect(pattern).toBe('/backend/**/*.spec.ts');
      });

      it('concatenates target without trailing slash and scope', () => {
        const pattern = testUseCase['buildEffectivePattern'](
          '/backend',
          'test/**/*.spec.ts',
        );
        expect(pattern).toBe('/backend/test/**/*.spec.ts');
      });
    });
  });
});
