import { IPackmindRepositories } from '../domain/repositories/IPackmindRepositories';
import { IConfigFileRepository } from '../domain/repositories/IConfigFileRepository';
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
  configFileRepository?: Partial<IConfigFileRepository>,
): jest.Mocked<IConfigFileRepository> {
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
