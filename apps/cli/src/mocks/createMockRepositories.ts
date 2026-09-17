import { mockInterface } from '@packmind/test-utils';
import { IPackmindRepositories } from '../domain/repositories/IPackmindRepositories';
import { IConfigFileRepository } from '../domain/repositories/IConfigFileRepository';
import { ILockFileRepository } from '../domain/repositories/ILockFileRepository';
import { createMockPackmindGateway } from './createMockGateways';
import { IPackmindGateway } from '../domain/repositories/IPackmindGateway';
import { IOutput } from '../domain/repositories/IOutput';

/** Each override is a whole sub-mock - see the note on `MockServicesOverrides`. */
type MockRepositoriesOverrides = {
  packmindGateway?: jest.Mocked<IPackmindGateway>;
  configFileRepository?: jest.Mocked<IConfigFileRepository>;
  lockFileRepository?: jest.Mocked<ILockFileRepository>;
  output?: jest.Mocked<IOutput>;
};

/**
 * `IPackmindRepositories` is all data members, so `mockInterface` demands them
 * rather than building the tree itself. See the note on `createMockServices`.
 */
export function createMockPackmindRepositories(
  overrides?: MockRepositoriesOverrides,
): jest.Mocked<IPackmindRepositories> {
  return {
    packmindGateway: overrides?.packmindGateway ?? createMockPackmindGateway(),
    configFileRepository:
      overrides?.configFileRepository ?? createMockConfigFileRepository(),
    lockFileRepository:
      overrides?.lockFileRepository ?? createMockLockFileRepository(),
    output: overrides?.output ?? createMockOutput(),
  };
}

export function createMockConfigFileRepository(
  overrides?: Partial<jest.Mocked<IConfigFileRepository>>,
): jest.Mocked<IConfigFileRepository> {
  return Object.assign(mockInterface<IConfigFileRepository>(), overrides);
}

export function createMockLockFileRepository(
  overrides?: Partial<jest.Mocked<ILockFileRepository>>,
): jest.Mocked<ILockFileRepository> {
  return Object.assign(mockInterface<ILockFileRepository>(), overrides);
}

export function createMockOutput(
  overrides?: Partial<jest.Mocked<IOutput>>,
): jest.Mocked<IOutput> {
  const output = mockInterface<IOutput>();
  // Callers expect the loader to actually run the work it wraps.
  output.withLoader.mockImplementation((_msg, loader) => loader());
  return Object.assign(output, overrides);
}
