import { IPackmindServices } from '../domain/services/IPackmindServices';
import { DiffViolationFilterService } from '../application/services/DiffViolationFilterService';
import { IExecuteLinterProgramsUseCase } from '@packmind/types';
import { IListFiles } from '../domain/services/IListFiles';
import { IGitService } from '../domain/services/IGitService';

export function createMockServices(
  services?: Partial<IPackmindServices>,
): jest.Mocked<IPackmindServices> {
  return {
    listFiles: createMockListFiles(services?.listFiles),
    gitRemoteUrlService: createMockGitService(services?.gitRemoteUrlService),
    linterExecutionUseCase: createMockExecuteLinterProgramsUseCase(
      services?.linterExecutionUseCase,
    ),
    diffViolationFilterService: createMockDiffViolationFilterService(
      services?.diffViolationFilterService,
    ),
    ...services,
  };
}

export function createMockListFiles(
  listFiles?: Partial<IListFiles>,
): jest.Mocked<IListFiles> {
  return {
    listFilesInDirectory: jest.fn(),
    readFileContent: jest.fn(),
    ...listFiles,
  };
}

export function createMockGitService(
  gitService?: Partial<IGitService>,
): jest.Mocked<IGitService> {
  return {
    getGitRepositoryRoot: jest.fn(),
    tryGetGitRepositoryRoot: jest.fn(),
    getGitRepositoryRootSync: jest.fn(),
    getCurrentBranch: jest.fn(),
    getCurrentBranches: jest.fn(),
    getGitRemoteUrl: jest.fn(),
    getModifiedFiles: jest.fn(),
    getUntrackedFiles: jest.fn(),
    getModifiedLines: jest.fn(),
    ...gitService,
  };
}

export function createMockExecuteLinterProgramsUseCase(
  executeLinterPrograms?: Partial<IExecuteLinterProgramsUseCase>,
): jest.Mocked<IExecuteLinterProgramsUseCase> {
  return {
    execute: jest.fn(),
    ...executeLinterPrograms,
  };
}

export function createMockDiffViolationFilterService(
  diffViolationService?: Partial<DiffViolationFilterService>,
): jest.Mocked<DiffViolationFilterService> {
  return {
    filterByFiles: jest.fn(),
    filterByLines: jest.fn(),
    groupModifiedLinesByFile: jest.fn(),
    isLineInModifiedRanges: jest.fn(),
    ...diffViolationService,
  };
}
