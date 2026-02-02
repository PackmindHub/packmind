import { IPackmindRepositories } from '../domain/repositories/IPackmindRepositories';
import { IConfigFileRepository } from '../domain/repositories/IConfigFileRepository';
import { createMockPackmindGateway } from './createMockGateways';
import { IPackmindGateway } from '../domain/repositories/IPackmindGateway';

type MockRepositoriesOverrides = {
  packmindGateway?: jest.Mocked<IPackmindGateway>;
  configFileRepository?: Partial<jest.Mocked<IConfigFileRepository>>;
};

export function createMockPackmindRepositories(
  overrides?: MockRepositoriesOverrides,
): jest.Mocked<IPackmindRepositories> {
  return {
    packmindGateway: overrides?.packmindGateway ?? createMockPackmindGateway(),
    configFileRepository: createMockConfigFileRepository(
      overrides?.configFileRepository,
    ),
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
