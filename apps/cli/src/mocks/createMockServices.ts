import { IPackmindServices } from '../domain/services/IPackmindServices';
import { IDiffViolationFilterService } from '../domain/services/IDiffViolationFilterService';
import { IExecuteLinterProgramsUseCase } from '@packmind/types';
import { IListFiles } from '../domain/services/IListFiles';
import { IGitService } from '../domain/services/IGitService';

type MockServicesOverrides = {
  listFiles?: Partial<jest.Mocked<IListFiles>>;
  gitRemoteUrlService?: Partial<jest.Mocked<IGitService>>;
  linterExecutionUseCase?: Partial<jest.Mocked<IExecuteLinterProgramsUseCase>>;
  diffViolationFilterService?: Partial<
    jest.Mocked<IDiffViolationFilterService>
  >;
};

export function createMockServices(
  overrides?: MockServicesOverrides,
): jest.Mocked<IPackmindServices> {
  return {
    listFiles: createMockListFiles(overrides?.listFiles),
    gitRemoteUrlService: createMockGitService(overrides?.gitRemoteUrlService),
    linterExecutionUseCase: createMockExecuteLinterProgramsUseCase(
      overrides?.linterExecutionUseCase,
    ),
    diffViolationFilterService: createMockDiffViolationFilterService(
      overrides?.diffViolationFilterService,
    ),
  };
}

export function createMockListFiles(
  overrides?: Partial<jest.Mocked<IListFiles>>,
): jest.Mocked<IListFiles> {
  return {
    listFilesInDirectory: jest.fn(),
    readFileContent: jest.fn(),
    ...overrides,
  };
}

export function createMockGitService(
  overrides?: Partial<jest.Mocked<IGitService>>,
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
    ...overrides,
  };
}

export function createMockExecuteLinterProgramsUseCase(
  overrides?: Partial<jest.Mocked<IExecuteLinterProgramsUseCase>>,
): jest.Mocked<IExecuteLinterProgramsUseCase> {
  return {
    execute: jest.fn(),
    ...overrides,
  };
}

export function createMockDiffViolationFilterService(
  overrides?: Partial<jest.Mocked<IDiffViolationFilterService>>,
): jest.Mocked<IDiffViolationFilterService> {
  return {
    filterByFiles: jest.fn(),
    filterByLines: jest.fn(),
    ...overrides,
  };
}
