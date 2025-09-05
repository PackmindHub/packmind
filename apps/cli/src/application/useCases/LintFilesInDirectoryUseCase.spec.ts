import { LintFilesInDirectoryUseCase } from './LintFilesInDirectoryUseCase';
import { PackmindServices } from '../services/PackmindServices';
import { IPackmindRepositories } from '../../domain/repositories/IPackmindRepositories';
import { ListFiles } from '../services/ListFiles';
import { GitService } from '../services/GitService';
import { AstExecutorService } from '../services/AstExecutorService';
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';

describe('LintFilesInDirectoryUseCase', () => {
  let useCase: LintFilesInDirectoryUseCase;
  let mockServices: PackmindServices;
  let mockRepositories: IPackmindRepositories;
  let mockListFiles: jest.Mocked<ListFiles>;
  let mockGitRemoteUrlService: jest.Mocked<GitService>;
  let mockAstExecutorService: jest.Mocked<AstExecutorService>;
  let mockPackmindGateway: jest.Mocked<IPackmindGateway>;

  beforeEach(() => {
    mockListFiles = {
      listFilesInDirectory: jest.fn(),
    } as unknown as jest.Mocked<ListFiles>;

    mockGitRemoteUrlService = {
      getGitRemoteUrl: jest.fn(),
    } as unknown as jest.Mocked<GitService>;

    mockAstExecutorService = {
      executeProgram: jest.fn(),
    } as unknown as jest.Mocked<AstExecutorService>;

    mockPackmindGateway = {
      listExecutionPrograms: jest.fn(),
    };

    mockServices = {
      listFiles: mockListFiles,
      gitRemoteUrlService: mockGitRemoteUrlService,
      astExecutorService: mockAstExecutorService,
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
    // Setup mocks
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
    mockAstExecutorService.executeProgram.mockResolvedValue([
      { line: 1, character: 0 },
    ]);

    const result = await useCase.execute({
      path: '/project',
    });

    // Verify calls
    expect(mockListFiles.listFilesInDirectory).toHaveBeenCalledWith(
      '/project',
      ['.ts'],
      ['node_modules', 'dist'],
    );
    expect(mockGitRemoteUrlService.getGitRemoteUrl).toHaveBeenCalledWith(
      '/project',
    );
    expect(mockPackmindGateway.listExecutionPrograms).toHaveBeenCalledWith({
      gitRemoteUrl,
    });
    expect(mockAstExecutorService.executeProgram).toHaveBeenCalledTimes(2); // 2 files

    // Verify result structure
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
      expect(result.summary.totalFiles).toBe(0);
      expect(result.summary.violatedFiles).toBe(0);
      expect(result.summary.totalViolations).toBe(0);
    });
  });

  it('handles AST execution errors gracefully', async () => {
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
    mockAstExecutorService.executeProgram.mockRejectedValue(
      new Error('AST parsing failed'),
    );

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    const result = await useCase.execute({
      path: '/project',
    });

    expect(result.violations).toHaveLength(0);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Error executing program for file'),
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
            scope: ['**/*.spec.ts', '**/test/**/*.ts'], // Only apply to test files
            rules: [
              {
                content: 'Test specific rule',
                activeDetectionPrograms: [
                  {
                    language: 'typescript',
                    detectionProgram: {
                      mode: 'ast',
                      code: 'function checkSourceCode(ast) { return [1]; }',
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
      mockAstExecutorService.executeProgram.mockResolvedValue([
        { line: 1, character: 0 },
      ]);

      await useCase.execute({
        path: '/project',
      });

      // Should only execute programs for files matching the scope patterns
      // component.ts should be skipped, component.spec.ts and test/helpers.ts should be processed
      expect(mockAstExecutorService.executeProgram).toHaveBeenCalledTimes(2);
      expect(mockAstExecutorService.executeProgram).toHaveBeenCalledWith(
        'function checkSourceCode(ast) { return [1]; }',
        'interface TestInterface {}',
      );
      expect(mockAstExecutorService.executeProgram).toHaveBeenCalledWith(
        'function checkSourceCode(ast) { return [1]; }',
        'interface Helper {}',
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
            scope: [], // Empty scope means apply to all files
            rules: [
              {
                content: 'Global rule',
                activeDetectionPrograms: [
                  {
                    language: 'typescript',
                    detectionProgram: {
                      mode: 'ast',
                      code: 'function checkSourceCode(ast) { return [1]; }',
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
      mockAstExecutorService.executeProgram.mockResolvedValue([
        { line: 1, character: 0 },
      ]);

      await useCase.execute({
        path: '/project',
      });

      // Should execute programs for all files when scope is empty
      expect(mockAstExecutorService.executeProgram).toHaveBeenCalledTimes(2);
    });
  });
});
