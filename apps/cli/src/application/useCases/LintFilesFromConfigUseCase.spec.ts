import {
  AllConfigsResult,
  DetectionModeEnum,
  DetectionSeverity,
  ExecuteLinterProgramsCommand,
  GetDetectionProgramsForPackagesResponse,
  IExecuteLinterProgramsUseCase,
  LinterExecutionViolation,
} from '@packmind/types';
import * as fs from 'fs/promises';
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';
import { IPackmindRepositories } from '../../domain/repositories/IPackmindRepositories';
import { LintFilesFromConfigUseCase } from './LintFilesFromConfigUseCase';
import { stubLogger } from '@packmind/test-utils';
import { ILinterGateway } from '../../domain/repositories/ILinterGateway';
import {
  createMockExecuteLinterProgramsUseCase,
  createMockGitService,
  createMockListFiles,
  createMockServices,
} from '../../mocks/createMockServices';
import {
  createMockLinterGateway,
  createMockPackmindGateway,
} from '../../mocks/createMockGateways';
import {
  createMockConfigFileRepository,
  createMockPackmindRepositories,
} from '../../mocks/createMockRepositories';
import { IPackmindServices } from '../../domain/services/IPackmindServices';
import { IListFiles } from '../../domain/services/IListFiles';
import { IGitService } from '../../domain/services/IGitService';
import { IConfigFileRepository } from '../../domain/repositories/IConfigFileRepository';

jest.mock('fs/promises');

describe('LintFilesFromConfigUseCase', () => {
  let useCase: LintFilesFromConfigUseCase;
  let mockServices: IPackmindServices;
  let mockRepositories: IPackmindRepositories;
  let mockListFiles: jest.Mocked<IListFiles>;
  let mockGitRemoteUrlService: jest.Mocked<IGitService>;
  let mockLinterExecutionUseCase: jest.Mocked<IExecuteLinterProgramsUseCase>;
  let mockPackmindGateway: jest.Mocked<IPackmindGateway>;
  let mockLinterGateway: jest.Mocked<ILinterGateway>;

  let mockConfigFileRepository: jest.Mocked<IConfigFileRepository>;
  const logger = stubLogger();

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
            severity: program.severity,
          }),
        ),
      })),
    });

    mockLinterGateway = createMockLinterGateway();
    mockPackmindGateway = createMockPackmindGateway({
      linter: mockLinterGateway,
    });

    mockConfigFileRepository = createMockConfigFileRepository();

    mockServices = createMockServices({
      listFiles: mockListFiles,
      gitRemoteUrlService: mockGitRemoteUrlService,
      linterExecutionUseCase: mockLinterExecutionUseCase,
    });

    mockRepositories = createMockPackmindRepositories({
      packmindGateway: mockPackmindGateway,
      configFileRepository: mockConfigFileRepository,
    });

    (fs.stat as jest.Mock).mockResolvedValue({
      isFile: () => false,
      isDirectory: () => true,
    });

    useCase = new LintFilesFromConfigUseCase(
      mockServices,
      mockRepositories,
      logger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when configs exist in tree', () => {
    it('finds all configs and fetches detection programs for each target', async () => {
      const allConfigs: AllConfigsResult = {
        configs: [
          {
            targetPath: '/apps/api',
            absoluteTargetPath: '/project/apps/api',
            packages: { backend: '*' },
          },
          {
            targetPath: '/',
            absoluteTargetPath: '/project',
            packages: { generic: '*' },
          },
        ],
        hasConfigs: true,
        basePath: '/project',
      };

      mockGitRemoteUrlService.tryGetGitRepositoryRoot.mockReturnValue(
        '/project',
      );
      mockConfigFileRepository.findAllConfigsInTree.mockResolvedValue(
        allConfigs,
      );
      mockListFiles.listFilesInDirectory.mockResolvedValue([]);
      mockLinterGateway.getDetectionProgramsForPackages.mockResolvedValue({
        targets: [],
      });

      await useCase.execute({ path: '/project/apps/api' });

      expect(
        mockConfigFileRepository.findAllConfigsInTree,
      ).toHaveBeenCalledWith('/project/apps/api', '/project');
    });

    it('fetches detection programs for single target', async () => {
      const allConfigs: AllConfigsResult = {
        configs: [
          {
            targetPath: '/',
            absoluteTargetPath: '/project',
            packages: { frontend: '*', shared: '1.0.0' },
          },
        ],
        hasConfigs: true,
        basePath: '/project',
      };

      mockGitRemoteUrlService.tryGetGitRepositoryRoot.mockReturnValue(
        '/project',
      );
      mockConfigFileRepository.findAllConfigsInTree.mockResolvedValue(
        allConfigs,
      );
      mockListFiles.listFilesInDirectory.mockResolvedValue([
        { path: '/project/src/file.ts' },
      ]);
      mockListFiles.readFileContent.mockResolvedValue('const x = 1;');
      mockLinterGateway.getDetectionProgramsForPackages.mockResolvedValue({
        targets: [],
      });

      await useCase.execute({ path: '/project' });

      expect(
        mockPackmindGateway.linter.getDetectionProgramsForPackages,
      ).toHaveBeenCalledWith({
        packagesSlugs: ['frontend', 'shared'],
      });
    });
  });

  describe('when no configs exist in tree', () => {
    it('throws descriptive error', async () => {
      const allConfigs: AllConfigsResult = {
        configs: [],
        hasConfigs: false,
        basePath: '/project',
      };

      mockGitRemoteUrlService.tryGetGitRepositoryRoot.mockReturnValue(
        '/project',
      );
      mockConfigFileRepository.findAllConfigsInTree.mockResolvedValue(
        allConfigs,
      );

      await expect(useCase.execute({ path: '/project' })).rejects.toThrow(
        /No packmind.json found between/,
      );
    });
  });

  describe('when single config exists at root', () => {
    it('uses packages from root config for files in subdirectories', async () => {
      const allConfigs: AllConfigsResult = {
        configs: [
          {
            targetPath: '/',
            absoluteTargetPath: '/project',
            packages: { 'root-package': '*' },
          },
        ],
        hasConfigs: true,
        basePath: '/project',
      };

      mockGitRemoteUrlService.tryGetGitRepositoryRoot.mockReturnValue(
        '/project',
      );
      mockConfigFileRepository.findAllConfigsInTree.mockResolvedValue(
        allConfigs,
      );
      mockListFiles.listFilesInDirectory.mockResolvedValue([
        { path: '/project/apps/api/file.ts' },
      ]);
      mockListFiles.readFileContent.mockResolvedValue('const x = 1;');
      mockLinterGateway.getDetectionProgramsForPackages.mockResolvedValue({
        targets: [],
      });

      await useCase.execute({ path: '/project/apps/api' });

      expect(
        mockLinterGateway.getDetectionProgramsForPackages,
      ).toHaveBeenCalledWith({
        packagesSlugs: ['root-package'],
      });
    });
  });

  describe('when path is a single file', () => {
    it('uses parent directory for config resolution', async () => {
      (fs.stat as jest.Mock).mockResolvedValue({
        isFile: () => true,
        isDirectory: () => false,
      });

      const allConfigs: AllConfigsResult = {
        configs: [
          {
            targetPath: '/',
            absoluteTargetPath: '/project',
            packages: { typescript: '*' },
          },
        ],
        hasConfigs: true,
        basePath: '/project',
      };

      mockGitRemoteUrlService.tryGetGitRepositoryRoot.mockReturnValue(
        '/project',
      );
      mockConfigFileRepository.findAllConfigsInTree.mockResolvedValue(
        allConfigs,
      );
      mockListFiles.readFileContent.mockResolvedValue('const x = 1;');
      mockLinterGateway.getDetectionProgramsForPackages.mockResolvedValue({
        targets: [],
      });

      await useCase.execute({ path: '/project/src/file.ts' });

      expect(
        mockConfigFileRepository.findAllConfigsInTree,
      ).toHaveBeenCalledWith('/project/src', '/project');
    });
  });

  describe('when executing linting with target-based matching', () => {
    describe('when detection programs return violations', () => {
      let result: Awaited<ReturnType<LintFilesFromConfigUseCase['execute']>>;

      beforeEach(async () => {
        const allConfigs: AllConfigsResult = {
          configs: [
            {
              targetPath: '/',
              absoluteTargetPath: '/project',
              packages: { frontend: '*' },
            },
          ],
          hasConfigs: true,
          basePath: '/project',
        };

        const mockDetectionPrograms: GetDetectionProgramsForPackagesResponse = {
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
                          severity: DetectionSeverity.ERROR,
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

        mockGitRemoteUrlService.tryGetGitRepositoryRoot.mockReturnValue(
          '/project',
        );
        mockConfigFileRepository.findAllConfigsInTree.mockResolvedValue(
          allConfigs,
        );
        mockListFiles.listFilesInDirectory.mockResolvedValue([
          { path: '/project/src/file.ts' },
        ]);
        mockListFiles.readFileContent.mockResolvedValue('const x = 1;');
        mockLinterGateway.getDetectionProgramsForPackages.mockResolvedValue(
          mockDetectionPrograms,
        );

        result = await useCase.execute({ path: '/project' });
      });

      it('returns one violation', () => {
        expect(result.violations).toHaveLength(1);
      });

      it('reports total files as 1', () => {
        expect(result.summary.totalFiles).toBe(1);
      });

      it('includes test-standard in standards checked', () => {
        expect(result.summary.standardsChecked).toContain('test-standard');
      });
    });

    describe('when file matches multiple targets', () => {
      let result: Awaited<ReturnType<LintFilesFromConfigUseCase['execute']>>;

      beforeEach(async () => {
        const allConfigs: AllConfigsResult = {
          configs: [
            {
              targetPath: '/',
              absoluteTargetPath: '/project',
              packages: { generic: '*' },
            },
            {
              targetPath: '/src',
              absoluteTargetPath: '/project/src',
              packages: { backend: '*' },
            },
          ],
          hasConfigs: true,
          basePath: '/project',
        };

        const genericPrograms: GetDetectionProgramsForPackagesResponse = {
          targets: [
            {
              name: 'Generic Target',
              path: '/',
              standards: [
                {
                  name: 'Generic Standard',
                  slug: 'generic-standard',
                  scope: [],
                  rules: [
                    {
                      content: 'Generic rule',
                      activeDetectionPrograms: [
                        {
                          language: 'typescript',
                          severity: DetectionSeverity.ERROR,
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

        const backendPrograms: GetDetectionProgramsForPackagesResponse = {
          targets: [
            {
              name: 'Backend Target',
              path: '/',
              standards: [
                {
                  name: 'Backend Standard',
                  slug: 'backend-standard',
                  scope: [],
                  rules: [
                    {
                      content: 'Backend rule',
                      activeDetectionPrograms: [
                        {
                          language: 'typescript',
                          severity: DetectionSeverity.ERROR,
                          detectionProgram: {
                            mode: DetectionModeEnum.SINGLE_AST,
                            code: 'function checkSourceCode(ast) { return [2]; }',
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

        mockGitRemoteUrlService.tryGetGitRepositoryRoot.mockReturnValue(
          '/project',
        );
        mockConfigFileRepository.findAllConfigsInTree.mockResolvedValue(
          allConfigs,
        );
        mockListFiles.listFilesInDirectory.mockResolvedValue([
          { path: '/project/src/file.ts' },
        ]);
        mockListFiles.readFileContent.mockResolvedValue('const x = 1;');
        mockLinterGateway.getDetectionProgramsForPackages
          .mockResolvedValueOnce(genericPrograms)
          .mockResolvedValueOnce(backendPrograms);

        result = await useCase.execute({ path: '/project' });
      });

      it('returns one file with violations', () => {
        expect(result.violations).toHaveLength(1);
      });

      it('accumulates violations from both targets', () => {
        expect(result.violations[0].violations).toHaveLength(2);
      });

      it('includes generic-standard in standards checked', () => {
        expect(result.summary.standardsChecked).toContain('generic-standard');
      });

      it('includes backend-standard in standards checked', () => {
        expect(result.summary.standardsChecked).toContain('backend-standard');
      });
    });

    describe('when overlapping configs reference the same standard and rule', () => {
      let result: Awaited<ReturnType<LintFilesFromConfigUseCase['execute']>>;

      beforeEach(async () => {
        const allConfigs: AllConfigsResult = {
          configs: [
            {
              targetPath: '/',
              absoluteTargetPath: '/project',
              packages: { generic: '*' },
            },
            {
              targetPath: '/src',
              absoluteTargetPath: '/project/src',
              packages: { generic: '*' },
            },
          ],
          hasConfigs: true,
          basePath: '/project',
        };

        const sharedPrograms: GetDetectionProgramsForPackagesResponse = {
          targets: [
            {
              name: 'Generic Target',
              path: '/',
              standards: [
                {
                  name: 'Shared Standard',
                  slug: 'shared-standard',
                  scope: [],
                  rules: [
                    {
                      content: 'Shared rule',
                      activeDetectionPrograms: [
                        {
                          language: 'typescript',
                          severity: DetectionSeverity.ERROR,
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

        mockGitRemoteUrlService.tryGetGitRepositoryRoot.mockReturnValue(
          '/project',
        );
        mockConfigFileRepository.findAllConfigsInTree.mockResolvedValue(
          allConfigs,
        );
        mockListFiles.listFilesInDirectory.mockResolvedValue([
          { path: '/project/src/file.ts' },
        ]);
        mockListFiles.readFileContent.mockResolvedValue('const x = 1;');
        mockLinterGateway.getDetectionProgramsForPackages.mockResolvedValue(
          sharedPrograms,
        );

        result = await useCase.execute({ path: '/project' });
      });

      it('deduplicates programs from overlapping configs', () => {
        expect(result.violations[0].violations).toHaveLength(1);
      });
    });

    it('caches API calls for identical package sets', async () => {
      const allConfigs: AllConfigsResult = {
        configs: [
          {
            targetPath: '/',
            absoluteTargetPath: '/project',
            packages: { shared: '*' },
          },
          {
            targetPath: '/apps/api',
            absoluteTargetPath: '/project/apps/api',
            packages: { shared: '*' },
          },
        ],
        hasConfigs: true,
        basePath: '/project',
      };

      mockGitRemoteUrlService.tryGetGitRepositoryRoot.mockReturnValue(
        '/project',
      );
      mockConfigFileRepository.findAllConfigsInTree.mockResolvedValue(
        allConfigs,
      );
      mockListFiles.listFilesInDirectory.mockResolvedValue([
        { path: '/project/apps/api/file.ts' },
      ]);
      mockListFiles.readFileContent.mockResolvedValue('const x = 1;');
      mockLinterGateway.getDetectionProgramsForPackages.mockResolvedValue({
        targets: [],
      });

      await useCase.execute({ path: '/project' });

      // Both targets have same packages, so API should only be called once
      expect(
        mockLinterGateway.getDetectionProgramsForPackages,
      ).toHaveBeenCalledTimes(1);
    });

    describe('when file is outside a specific target path', () => {
      let result: Awaited<ReturnType<LintFilesFromConfigUseCase['execute']>>;

      beforeEach(async () => {
        const allConfigs: AllConfigsResult = {
          configs: [
            {
              targetPath: '/',
              absoluteTargetPath: '/project',
              packages: { generic: '*' },
            },
            {
              targetPath: '/apps/api',
              absoluteTargetPath: '/project/apps/api',
              packages: { backend: '*' },
            },
          ],
          hasConfigs: true,
          basePath: '/project',
        };

        const genericPrograms: GetDetectionProgramsForPackagesResponse = {
          targets: [
            {
              name: 'Generic Target',
              path: '/',
              standards: [
                {
                  name: 'Generic Standard',
                  slug: 'generic-standard',
                  scope: [],
                  rules: [
                    {
                      content: 'Generic rule',
                      activeDetectionPrograms: [
                        {
                          language: 'typescript',
                          severity: DetectionSeverity.ERROR,
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

        const backendPrograms: GetDetectionProgramsForPackagesResponse = {
          targets: [
            {
              name: 'Backend Target',
              path: '/',
              standards: [
                {
                  name: 'Backend Standard',
                  slug: 'backend-standard',
                  scope: [],
                  rules: [
                    {
                      content: 'Backend rule',
                      activeDetectionPrograms: [
                        {
                          language: 'typescript',
                          severity: DetectionSeverity.ERROR,
                          detectionProgram: {
                            mode: DetectionModeEnum.SINGLE_AST,
                            code: 'function checkSourceCode(ast) { return [2]; }',
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

        mockGitRemoteUrlService.tryGetGitRepositoryRoot.mockReturnValue(
          '/project',
        );
        mockConfigFileRepository.findAllConfigsInTree.mockResolvedValue(
          allConfigs,
        );
        // File in /libs - not under /apps/api
        mockListFiles.listFilesInDirectory.mockResolvedValue([
          { path: '/project/libs/utils.ts' },
        ]);
        mockListFiles.readFileContent.mockResolvedValue('const x = 1;');
        mockLinterGateway.getDetectionProgramsForPackages
          .mockResolvedValueOnce(genericPrograms)
          .mockResolvedValueOnce(backendPrograms);

        result = await useCase.execute({ path: '/project' });
      });

      it('returns one file with violations', () => {
        expect(result.violations).toHaveLength(1);
      });

      it('applies only programs from matching root target', () => {
        expect(result.violations[0].violations).toHaveLength(1);
      });

      it('includes generic-standard in standards checked', () => {
        expect(result.summary.standardsChecked).toContain('generic-standard');
      });

      it('excludes backend-standard from standards checked', () => {
        expect(result.summary.standardsChecked).not.toContain(
          'backend-standard',
        );
      });
    });
  });

  describe('when path does not exist', () => {
    it('throws error', async () => {
      (fs.stat as jest.Mock).mockRejectedValue(new Error('ENOENT'));

      await expect(
        useCase.execute({ path: '/non-existent-path' }),
      ).rejects.toThrow(/does not exist or cannot be accessed/);
    });
  });
});
