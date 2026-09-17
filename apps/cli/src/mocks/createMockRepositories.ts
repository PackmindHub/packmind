import { mockInterface } from '@packmind/test-utils';
import { IPackmindRepositories } from '../domain/repositories/IPackmindRepositories';
import { IConfigFileRepository } from '../domain/repositories/IConfigFileRepository';
import { ILockFileRepository } from '../domain/repositories/ILockFileRepository';
import { createMockPackmindGateway, MockTree } from './createMockGateways';
import { IPackmindGateway } from '../domain/repositories/IPackmindGateway';
import { IOutput } from '../domain/repositories/IOutput';

/** Each override is a whole sub-mock - see the note in `createMockGateways`. */
/** `packmindGateway` is a tree in its own right, so it keeps its nested mocks. */
export type MockPackmindRepositoriesTree = Omit<
  MockTree<IPackmindRepositories>,
  'packmindGateway'
> & { packmindGateway: MockTree<IPackmindGateway> };

export type MockRepositoriesOverrides = Partial<MockPackmindRepositoriesTree>;

/**
 * `IPackmindRepositories` is all data members, so `mockInterface` demands them
 * rather than building the tree itself. Mock a single repository with
 * `mockInterface<IFooRepository>()` directly; this factory is only for the whole
 * tree.
 */
export function createMockPackmindRepositories(
  overrides?: MockRepositoriesOverrides,
): MockPackmindRepositoriesTree {
  return {
    packmindGateway: createMockPackmindGateway(),
    configFileRepository: mockInterface<IConfigFileRepository>(),
    lockFileRepository: mockInterface<ILockFileRepository>(),
    output: createMockOutput(),
    ...overrides,
  };
}

/** Kept for the seeded default; stub anything else on the returned mock. */
export function createMockOutput(): jest.Mocked<IOutput> {
  const output = mockInterface<IOutput>();
  // Callers expect the loader to actually run the work it wraps.
  output.withLoader.mockImplementation((_msg, loader) => loader());
  return output;
}
