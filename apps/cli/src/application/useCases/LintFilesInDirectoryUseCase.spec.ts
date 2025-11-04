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
  PackmindLogger,
  ProgrammingLanguage,
  RuleId,
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
      readFileContent: jest.fn(),
    } as unknown as jest.Mocked<ListFiles>;

    mockGitRemoteUrlService = {
      getGitRemoteUrl: jest.fn(),
      getCurrentBranches: jest.fn(),
      getGitRepositoryRoot: jest.fn(),
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
      getDraftDetectionProgramsForRule: jest.fn(),
      getActiveDetectionProgramsForRule: jest.fn(),
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
      { path: '/project/src/file1.ts' },
      { path: '/project/src/file2.ts' },
    ];
    const gitRemoteUrl = 'github.com/user/repo';
    const branches = ['main', 'develop'];
    const mockDetectionPrograms = {
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
        },
      ],
    };

    mockGitRemoteUrlService.getGitRepositoryRoot.mockResolvedValue('/project');
    mockListFiles.listFilesInDirectory.mockResolvedValue(mockFiles);
    mockListFiles.readFileContent.mockImplementation(async (filePath) => {
      if (filePath === '/project/src/file1.ts') return 'interface User {}';
      if (filePath === '/project/src/file2.ts') return 'interface IAdmin {}';
      return '';
    });
    mockGitRemoteUrlService.getGitRemoteUrl.mockResolvedValue({ gitRemoteUrl });
    mockGitRemoteUrlService.getCurrentBranches.mockResolvedValue({ branches });
    mockPackmindGateway.listExecutionPrograms.mockResolvedValue(
      mockDetectionPrograms,
    );

    const result = await useCase.execute({
      path: '/project',
    });

    expect(mockGitRemoteUrlService.getGitRepositoryRoot).toHaveBeenCalledWith(
      '/project',
    );
    expect(mockListFiles.listFilesInDirectory).toHaveBeenCalledWith(
      '/project',
      [],
      ['node_modules', 'dist', '.min.', '.map.', '.git'],
    );
    expect(mockGitRemoteUrlService.getGitRemoteUrl).toHaveBeenCalledWith(
      '/project',
    );
    expect(mockGitRemoteUrlService.getCurrentBranches).toHaveBeenCalledWith(
      '/project',
    );
    expect(mockPackmindGateway.listExecutionPrograms).toHaveBeenCalledWith({
      gitRemoteUrl,
      branches,
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
      mockGitRemoteUrlService.getGitRepositoryRoot.mockResolvedValue(
        '/empty-project',
      );
      mockListFiles.listFilesInDirectory.mockResolvedValue([]);
      mockGitRemoteUrlService.getGitRemoteUrl.mockResolvedValue({
        gitRemoteUrl: 'github.com/user/repo',
      });
      mockGitRemoteUrlService.getCurrentBranches.mockResolvedValue({
        branches: ['main'],
      });
      mockPackmindGateway.listExecutionPrograms.mockResolvedValue({
        targets: [],
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
    const mockFiles = [{ path: '/project/src/file1.ts' }];
    const mockDetectionPrograms = {
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
        },
      ],
    };

    mockGitRemoteUrlService.getGitRepositoryRoot.mockResolvedValue('/project');
    mockListFiles.listFilesInDirectory.mockResolvedValue(mockFiles);
    mockListFiles.readFileContent.mockResolvedValue('interface User {}');
    mockGitRemoteUrlService.getGitRemoteUrl.mockResolvedValue({
      gitRemoteUrl: 'github.com/user/repo',
    });
    mockGitRemoteUrlService.getCurrentBranches.mockResolvedValue({
      branches: ['main'],
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
        { path: '/project/src/component.ts' },
        {
          path: '/project/src/component.spec.ts',
        },
        { path: '/project/test/helpers.ts' },
      ];
      const mockDetectionPrograms = {
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
          },
        ],
      };

      mockGitRemoteUrlService.getGitRepositoryRoot.mockResolvedValue(
        '/project',
      );
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
      mockGitRemoteUrlService.getGitRemoteUrl.mockResolvedValue({
        gitRemoteUrl: 'github.com/user/repo',
      });
      mockGitRemoteUrlService.getCurrentBranches.mockResolvedValue({
        branches: ['main'],
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
        { path: '/project/src/component.ts' },
        {
          path: '/project/src/component.spec.ts',
        },
      ];
      const mockDetectionPrograms = {
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
          },
        ],
      };

      mockGitRemoteUrlService.getGitRepositoryRoot.mockResolvedValue(
        '/project',
      );
      mockListFiles.listFilesInDirectory.mockResolvedValue(mockFiles);
      mockListFiles.readFileContent.mockImplementation(async (filePath) => {
        if (filePath === '/project/src/component.ts')
          return 'interface User {}';
        if (filePath === '/project/src/component.spec.ts')
          return 'interface TestInterface {}';
        return '';
      });
      mockGitRemoteUrlService.getGitRemoteUrl.mockResolvedValue({
        gitRemoteUrl: 'github.com/user/repo',
      });
      mockGitRemoteUrlService.getCurrentBranches.mockResolvedValue({
        branches: ['main'],
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
    const mockFiles = [{ path: '/project/src/file1.py' }];
    const mockDetectionPrograms = {
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
        },
      ],
    };

    mockGitRemoteUrlService.getGitRepositoryRoot.mockResolvedValue('/project');
    mockListFiles.listFilesInDirectory.mockResolvedValue(mockFiles);
    mockGitRemoteUrlService.getGitRemoteUrl.mockResolvedValue({
      gitRemoteUrl: 'github.com/user/repo',
    });
    mockGitRemoteUrlService.getCurrentBranches.mockResolvedValue({
      branches: ['main'],
    });
    mockPackmindGateway.listExecutionPrograms.mockResolvedValue(
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
    it('fetches draft programs instead of active programs', async () => {
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

      mockPackmindGateway.getDraftDetectionProgramsForRule = jest
        .fn()
        .mockResolvedValue(draftProgramsResponse);

      mockGitRemoteUrlService.getGitRepositoryRoot.mockResolvedValue(
        '/project',
      );
      mockListFiles.listFilesInDirectory.mockResolvedValue([
        { path: '/project/test.ts' },
      ]);
      mockListFiles.readFileContent.mockResolvedValue('const x = 1;');

      mockGitRemoteUrlService.getGitRemoteUrl.mockResolvedValue({
        gitRemoteUrl: 'https://github.com/user/repo',
      });
      mockGitRemoteUrlService.getCurrentBranches.mockResolvedValue({
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

      expect(
        mockPackmindGateway.getDraftDetectionProgramsForRule,
      ).toHaveBeenCalledWith({
        standardSlug: 'test-standard',
        ruleId: 'rule-123',
      });

      expect(mockPackmindGateway.listExecutionPrograms).not.toHaveBeenCalled();
    });

    it('skips scope filtering in draft mode', async () => {
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

      mockPackmindGateway.getDraftDetectionProgramsForRule = jest
        .fn()
        .mockResolvedValue(draftProgramsResponse);

      mockGitRemoteUrlService.getGitRepositoryRoot.mockResolvedValue(
        '/project',
      );
      mockListFiles.listFilesInDirectory.mockResolvedValue([
        { path: '/project/outside-scope.ts' },
      ]);
      mockListFiles.readFileContent.mockResolvedValue('const x = 1;');

      mockGitRemoteUrlService.getGitRemoteUrl.mockResolvedValue({
        gitRemoteUrl: 'https://github.com/user/repo',
      });
      mockGitRemoteUrlService.getCurrentBranches.mockResolvedValue({
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

      const result = await useCase.execute({
        path: '/project',
        draftMode: true,
        standardSlug: 'test-standard',
        ruleId: 'rule-123' as RuleId,
      });

      expect(result.violations.length).toBe(1);
      expect(mockLinterExecutionUseCase.execute).toHaveBeenCalled();
    });
  });

  describe('File matching with target and scope', () => {
    // Create a clean instance for unit testing the public method
    let testUseCase: LintFilesInDirectoryUseCase;

    beforeEach(() => {
      // Minimal setup just to test the public method
      const mockServices = {
        listFiles: {} as ListFiles,
        gitRemoteUrlService: {} as GitService,
        linterExecutionUseCase: {} as IExecuteLinterProgramsUseCase,
      };
      const mockRepositories = {
        packmindGateway: {} as IPackmindGateway,
      };
      const mockLogger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      } as unknown as PackmindLogger;
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
