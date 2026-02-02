import { IPackmindRepositories } from '../domain/repositories/IPackmindRepositories';
import { ConfigFileRepository } from '../infra/repositories/ConfigFileRepository';
import { createMockPackmindGateway } from './createMockGateways';

export function createMockPackmindRepositories(
  repositories?: Partial<IPackmindRepositories>,
): jest.Mocked<IPackmindRepositories> {
  return {
    packmindGateway: createMockPackmindGateway(repositories?.packmindGateway),
    configFileRepository: createMockConfigFileRepository(
      repositories?.configFileRepository,
    ),
    ...repositories,
  };
}

export function createMockConfigFileRepository(
  configFileRepository?: Partial<ConfigFileRepository>,
): jest.Mocked<ConfigFileRepository> {
  return {
    writeConfig: jest.fn(),
    configExists: jest.fn(),
    readConfig: jest.fn(),
    findDescendantConfigs: jest.fn(),
    readHierarchicalConfig: jest.fn(),
    findAllConfigsInTree: jest.fn(),
    computeRelativeTargetPath: jest.fn(),
    ...configFileRepository,
  };
}
