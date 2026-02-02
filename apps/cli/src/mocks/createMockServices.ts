import { PackmindServices } from '../application/services/PackmindServices';
import { ListFiles } from '../application/services/ListFiles';
import { GitService } from '../application/services/GitService';
import { DiffViolationFilterService } from '../application/services/DiffViolationFilterService';
import { IExecuteLinterProgramsUseCase } from '@packmind/types';

export function createMockServices(
  services?: Partial<PackmindServices>,
): jest.Mocked<PackmindServices> {
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
  listFiles?: Partial<ListFiles>,
): jest.Mocked<ListFiles> {
  return {
    listFilesInDirectory: jest.fn(),
    readFileContent: jest.fn(),
    ...listFiles,
  };
}

export function createMockGitService(
  gitService?: Partial<GitService>,
): jest.Mocked<GitService> {
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
