import { IPackmindRepositories } from '../domain/repositories/IPackmindRepositories';
import { IConfigFileRepository } from '../domain/repositories/IConfigFileRepository';
import { ILockFileRepository } from '../domain/repositories/ILockFileRepository';
import { createMockPackmindGateway } from './createMockGateways';
import { IPackmindGateway } from '../domain/repositories/IPackmindGateway';
import { IOutput } from '../domain/repositories/IOutput';

type MockRepositoriesOverrides = {
  packmindGateway?: jest.Mocked<IPackmindGateway>;
  configFileRepository?: Partial<jest.Mocked<IConfigFileRepository>>;
  lockFileRepository?: Partial<jest.Mocked<ILockFileRepository>>;
  output?: Partial<jest.Mocked<IOutput>>;
};

export function createMockPackmindRepositories(
  overrides?: MockRepositoriesOverrides,
): jest.Mocked<IPackmindRepositories> {
  return {
    packmindGateway: overrides?.packmindGateway ?? createMockPackmindGateway(),
    configFileRepository: createMockConfigFileRepository(
      overrides?.configFileRepository,
    ),
    lockFileRepository: createMockLockFileRepository(
      overrides?.lockFileRepository,
    ),
    output: createMockOutputRepository(overrides?.output),
  };
}

export function createMockConfigFileRepository(
  overrides?: Partial<jest.Mocked<IConfigFileRepository>>,
): jest.Mocked<IConfigFileRepository> {
  return {
    writeConfig: jest.fn(),
    configExists: jest.fn(),
    readConfig: jest.fn(),
    findDescendantConfigs: jest.fn(),
    readHierarchicalConfig: jest.fn(),
    findAllConfigsInTree: jest.fn(),
    ...overrides,
  };
}

export function createMockLockFileRepository(
  overrides?: Partial<jest.Mocked<ILockFileRepository>>,
): jest.Mocked<ILockFileRepository> {
  return {
    read: jest.fn(),
    ...overrides,
  };
}

export function createMockOutputRepository(
  overrides?: Partial<jest.Mocked<IOutput>>,
): jest.Mocked<IOutput> {
  return {
    notifyError: jest.fn(),
    notifyWarning: jest.fn(),
    notifySuccess: jest.fn(),
    showLoader: jest.fn(),
    listArtefacts: jest.fn(),
    listScopedArtefacts: jest.fn(),
    showArtefact: jest.fn(),
    withLoader: jest.fn().mockImplementation((msg, callback) => callback()),
    ...overrides,
  };
}
