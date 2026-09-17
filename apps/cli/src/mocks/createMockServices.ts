import { mockInterface } from '@packmind/test-utils';
import { IPackmindServices } from '../domain/services/IPackmindServices';
import { IDiffViolationFilterService } from '../domain/services/IDiffViolationFilterService';
import { IExecuteLinterProgramsUseCase } from '@packmind/types';
import { IListFiles } from '../domain/services/IListFiles';
import { IGitService } from '../domain/services/IGitService';
import { ISpaceService } from '../domain/services/ISpaceService';

/**
 * Each override is a whole sub-mock, not a partial to merge. A `mockInterface`
 * mock is a proxy whose members are materialised lazily, so its own keys are
 * empty until something touches them - copying one into a fresh mock with
 * `Object.assign` would silently copy nothing. The supplied mock is used as-is
 * instead, which is also what callers want: they keep a reference and stub it
 * after the tree is built.
 */
type MockServicesOverrides = {
  listFiles?: jest.Mocked<IListFiles>;
  gitRemoteUrlService?: jest.Mocked<IGitService>;
  linterExecutionUseCase?: jest.Mocked<IExecuteLinterProgramsUseCase>;
  diffViolationFilterService?: jest.Mocked<IDiffViolationFilterService>;
  spaceService?: jest.Mocked<ISpaceService>;
};

/**
 * `IPackmindServices` is all data members - one nested service per field - so
 * `mockInterface` cannot build it on its own: it demands them, rather than
 * answering a `jest.fn()` where the interface declares an object. This factory
 * supplies that tree; the leaf factories below are the ones `mockInterface`
 * fills in.
 */
export function createMockServices(
  overrides?: MockServicesOverrides,
): jest.Mocked<IPackmindServices> {
  return {
    listFiles: overrides?.listFiles ?? createMockListFiles(),
    gitRemoteUrlService:
      overrides?.gitRemoteUrlService ?? createMockGitService(),
    linterExecutionUseCase:
      overrides?.linterExecutionUseCase ??
      createMockExecuteLinterProgramsUseCase(),
    diffViolationFilterService:
      overrides?.diffViolationFilterService ??
      createMockDiffViolationFilterService(),
    spaceService: overrides?.spaceService ?? createMockSpaceService(),
  };
}

export function createMockSpaceService(
  overrides?: Partial<jest.Mocked<ISpaceService>>,
): jest.Mocked<ISpaceService> {
  return Object.assign(mockInterface<ISpaceService>(), overrides);
}

export function createMockListFiles(
  overrides?: Partial<jest.Mocked<IListFiles>>,
): jest.Mocked<IListFiles> {
  return Object.assign(mockInterface<IListFiles>(), overrides);
}

export function createMockGitService(
  overrides?: Partial<jest.Mocked<IGitService>>,
): jest.Mocked<IGitService> {
  return Object.assign(mockInterface<IGitService>(), overrides);
}

export function createMockExecuteLinterProgramsUseCase(
  overrides?: Partial<jest.Mocked<IExecuteLinterProgramsUseCase>>,
): jest.Mocked<IExecuteLinterProgramsUseCase> {
  return Object.assign(
    mockInterface<IExecuteLinterProgramsUseCase>(),
    overrides,
  );
}

export function createMockDiffViolationFilterService(
  overrides?: Partial<jest.Mocked<IDiffViolationFilterService>>,
): jest.Mocked<IDiffViolationFilterService> {
  return Object.assign(mockInterface<IDiffViolationFilterService>(), overrides);
}
