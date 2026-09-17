import { mockInterface } from '@packmind/test-utils';
import { MockTree } from './createMockGateways';
import { IPackmindServices } from '../domain/services/IPackmindServices';
import { IDiffViolationFilterService } from '../domain/services/IDiffViolationFilterService';
import { IExecuteLinterProgramsUseCase } from '@packmind/types';
import { IListFiles } from '../domain/services/IListFiles';
import { IGitService } from '../domain/services/IGitService';
import { ISpaceService } from '../domain/services/ISpaceService';

/** Each override is a whole sub-mock - see the note in `createMockGateways`. */
export type MockServicesOverrides = Partial<MockTree<IPackmindServices>>;

/**
 * `IPackmindServices` is all data members - one nested service per field - so
 * `mockInterface` cannot build it on its own: it demands them, rather than
 * answering a `jest.fn()` where the interface declares an object. Mock a single
 * service with `mockInterface<IFooService>()` directly; this factory is only for
 * the whole tree.
 */
export function createMockServices(
  overrides?: MockServicesOverrides,
): MockTree<IPackmindServices> {
  return {
    listFiles: mockInterface<IListFiles>(),
    gitRemoteUrlService: mockInterface<IGitService>(),
    linterExecutionUseCase: mockInterface<IExecuteLinterProgramsUseCase>(),
    diffViolationFilterService: mockInterface<IDiffViolationFilterService>(),
    spaceService: mockInterface<ISpaceService>(),
    ...overrides,
  };
}
