import {
  ExecuteLinterProgramsCommand,
  HierarchicalConfigResult,
  IExecuteLinterProgramsUseCase,
  LinterExecutionViolation,
} from '@packmind/types';
import * as fs from 'fs/promises';
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';
import { IPackmindRepositories } from '../../domain/repositories/IPackmindRepositories';
import { GitService } from '../services/GitService';
import { ListFiles } from '../services/ListFiles';
import { PackmindServices } from '../services/PackmindServices';
import { LintFilesLocallyUseCase } from './LintFilesLocallyUseCase';
import { ConfigFileRepository } from '../../infra/repositories/ConfigFileRepository';
import { stubLogger } from '@packmind/test-utils';

jest.mock('fs/promises');

describe('LintFilesLocallyUseCase', () => {
  let useCase: LintFilesLocallyUseCase;
  let mockServices: PackmindServices;
  let mockRepositories: IPackmindRepositories;
  let mockListFiles: jest.Mocked<ListFiles>;
  let mockGitRemoteUrlService: jest.Mocked<GitService>;
  let mockLinterExecutionUseCase: jest.Mocked<IExecuteLinterProgramsUseCase>;
  let mockPackmindGateway: jest.Mocked<IPackmindGateway>;
  let mockConfigFileRepository: jest.Mocked<ConfigFileRepository>;
  const logger = stubLogger();

  beforeEach(() => {
    mockListFiles = {
      listFilesInDirectory: jest.fn(),
      readFileContent: jest.fn(),
    } as unknown as jest.Mocked<ListFiles>;

    mockGitRemoteUrlService = {
      getGitRemoteUrl: jest.fn(),
      getCurrentBranches: jest.fn(),
      getGitRepositoryRoot: jest.fn(),
      tryGetGitRepositoryRoot: jest.fn(),
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
      getPullData: jest.fn(),
      listPackages: jest.fn(),
      getPackageSummary: jest.fn(),
      getDetectionProgramsForPackages: jest.fn(),
    };

    mockConfigFileRepository = {
      readConfig: jest.fn(),
      writeConfig: jest.fn(),
      readHierarchicalConfig: jest.fn(),
    } as unknown as jest.Mocked<ConfigFileRepository>;

    mockServices = {
      listFiles: mockListFiles,
      gitRemoteUrlService: mockGitRemoteUrlService,
      linterExecutionUseCase: mockLinterExecutionUseCase,
    };

    mockRepositories = {
      packmindGateway: mockPackmindGateway,
      configFileRepository: mockConfigFileRepository,
    };

    (fs.stat as jest.Mock).mockResolvedValue({
      isFile: () => false,
      isDirectory: () => true,
    });

    useCase = new LintFilesLocallyUseCase(
      mockServices,
      mockRepositories,
      logger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when hierarchical configs exist', () => {
    it('merges packages from root and subdirectory configs', async () => {
      const hierarchicalConfig: HierarchicalConfigResult = {
        packages: { generic: '*', backend: '*' },
        configPaths: [
          '/project/apps/api/packmind.json',
          '/project/packmind.json',
        ],
        hasConfigs: true,
      };

      mockGitRemoteUrlService.tryGetGitRepositoryRoot.mockResolvedValue(
        '/project',
      );
      mockConfigFileRepository.readHierarchicalConfig.mockResolvedValue(
        hierarchicalConfig,
      );
      mockListFiles.listFilesInDirectory.mockResolvedValue([]);
      mockPackmindGateway.getDetectionProgramsForPackages.mockResolvedValue({
        targets: [],
      });

      await useCase.execute({ path: '/project/apps/api' });

      expect(
        mockConfigFileRepository.readHierarchicalConfig,
      ).toHaveBeenCalledWith('/project/apps/api', '/project');
      expect(
        mockPackmindGateway.getDetectionProgramsForPackages,
      ).toHaveBeenCalledWith({
        packagesSlugs: ['generic', 'backend'],
      });
    });

    it('passes merged packages to gateway', async () => {
      const hierarchicalConfig: HierarchicalConfigResult = {
        packages: { frontend: '*', shared: '1.0.0' },
        configPaths: ['/project/packmind.json'],
        hasConfigs: true,
      };

      mockGitRemoteUrlService.tryGetGitRepositoryRoot.mockResolvedValue(
        '/project',
      );
      mockConfigFileRepository.readHierarchicalConfig.mockResolvedValue(
        hierarchicalConfig,
      );
      mockListFiles.listFilesInDirectory.mockResolvedValue([]);
      mockPackmindGateway.getDetectionProgramsForPackages.mockResolvedValue({
        targets: [],
      });

      await useCase.execute({ path: '/project' });

      expect(
        mockPackmindGateway.getDetectionProgramsForPackages,
      ).toHaveBeenCalledWith({
        packagesSlugs: ['frontend', 'shared'],
      });
    });
  });

  describe('when no hierarchical configs exist', () => {
    it('throws descriptive error', async () => {
      const hierarchicalConfig: HierarchicalConfigResult = {
        packages: {},
        configPaths: [],
        hasConfigs: false,
      };

      mockGitRemoteUrlService.tryGetGitRepositoryRoot.mockResolvedValue(
        '/project',
      );
      mockConfigFileRepository.readHierarchicalConfig.mockResolvedValue(
        hierarchicalConfig,
      );

      await expect(useCase.execute({ path: '/project' })).rejects.toThrow(
        /No packmind.json found between/,
      );
    });
  });

  describe('when single config exists at root', () => {
    it('uses packages from root config', async () => {
      const hierarchicalConfig: HierarchicalConfigResult = {
        packages: { 'root-package': '*' },
        configPaths: ['/project/packmind.json'],
        hasConfigs: true,
      };

      mockGitRemoteUrlService.tryGetGitRepositoryRoot.mockResolvedValue(
        '/project',
      );
      mockConfigFileRepository.readHierarchicalConfig.mockResolvedValue(
        hierarchicalConfig,
      );
      mockListFiles.listFilesInDirectory.mockResolvedValue([]);
      mockPackmindGateway.getDetectionProgramsForPackages.mockResolvedValue({
        targets: [],
      });

      await useCase.execute({ path: '/project/apps/api' });

      expect(
        mockPackmindGateway.getDetectionProgramsForPackages,
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

      const hierarchicalConfig: HierarchicalConfigResult = {
        packages: { typescript: '*' },
        configPaths: ['/project/packmind.json'],
        hasConfigs: true,
      };

      mockGitRemoteUrlService.tryGetGitRepositoryRoot.mockResolvedValue(
        '/project',
      );
      mockConfigFileRepository.readHierarchicalConfig.mockResolvedValue(
        hierarchicalConfig,
      );
      mockListFiles.readFileContent.mockResolvedValue('const x = 1;');
      mockPackmindGateway.getDetectionProgramsForPackages.mockResolvedValue({
        targets: [],
      });

      await useCase.execute({ path: '/project/src/file.ts' });

      expect(
        mockConfigFileRepository.readHierarchicalConfig,
      ).toHaveBeenCalledWith('/project/src', '/project');
    });
  });

  describe('when executing linting with merged packages', () => {
    it('returns violations from detection programs', async () => {
      const hierarchicalConfig: HierarchicalConfigResult = {
        packages: { frontend: '*' },
        configPaths: ['/project/packmind.json'],
        hasConfigs: true,
      };

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

      mockGitRemoteUrlService.tryGetGitRepositoryRoot.mockResolvedValue(
        '/project',
      );
      mockConfigFileRepository.readHierarchicalConfig.mockResolvedValue(
        hierarchicalConfig,
      );
      mockListFiles.listFilesInDirectory.mockResolvedValue([
        { path: '/project/src/file.ts' },
      ]);
      mockListFiles.readFileContent.mockResolvedValue('const x = 1;');
      mockPackmindGateway.getDetectionProgramsForPackages.mockResolvedValue(
        mockDetectionPrograms,
      );

      const result = await useCase.execute({ path: '/project' });

      expect(result.violations).toHaveLength(1);
      expect(result.summary.totalFiles).toBe(1);
      expect(result.summary.standardsChecked).toContain('test-standard');
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
