import { PackmindLogger } from '@packmind/logger';
import {
  IGitPort,
  IGitPortName,
  IStandardsPort,
  IStandardsPortName,
} from '@packmind/types';
import { CodingAgentAdapter } from './CodingAgentAdapter';
import { CodingAgentServices } from '../services/CodingAgentServices';
import { ICodingAgentRepositories } from '../../domain/repositories/ICodingAgentRepositories';

describe('CodingAgentAdapter', () => {
  let adapter: CodingAgentAdapter;
  let mockLogger: PackmindLogger;
  let mockStandardsPort: IStandardsPort;
  let mockGitPort: IGitPort;
  let mockServices: CodingAgentServices;
  let mockRepositories: ICodingAgentRepositories;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    } as unknown as PackmindLogger;

    mockStandardsPort = {} as IStandardsPort;
    mockGitPort = {} as IGitPort;

    mockRepositories = {
      getDeployerRegistry: jest.fn(),
    } as unknown as ICodingAgentRepositories;

    mockServices = {
      getDeployerService: jest.fn(),
      prepareRecipesDeployment: jest.fn(),
      prepareStandardsDeployment: jest.fn(),
    } as unknown as CodingAgentServices;

    adapter = new CodingAgentAdapter(mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('isReady', () => {
    it('returns false when adapter not initialized', () => {
      expect(adapter.isReady()).toBe(false);
    });

    it('returns true when all required ports and services are set', () => {
      adapter.initialize({
        ports: {
          [IStandardsPortName]: mockStandardsPort,
          [IGitPortName]: mockGitPort,
        },
        services: mockServices,
        repositories: mockRepositories,
      });

      expect(adapter.isReady()).toBe(true);
    });
  });

  describe('initialize', () => {
    it('throws when required ports not provided', () => {
      expect(() => {
        adapter.initialize({
          ports: {
            [IStandardsPortName]: mockStandardsPort,
            [IGitPortName]: undefined,
          } as unknown as {
            [IStandardsPortName]: IStandardsPort;
            [IGitPortName]: IGitPort;
          },
          services: mockServices,
          repositories: mockRepositories,
        });
      }).toThrow('CodingAgentAdapter: Required ports/services not provided');
    });

    it('throws when services not provided', () => {
      expect(() => {
        adapter.initialize({
          ports: {
            [IStandardsPortName]: mockStandardsPort,
            [IGitPortName]: mockGitPort,
          },
          services: undefined as unknown as CodingAgentServices,
          repositories: mockRepositories,
        });
      }).toThrow('CodingAgentAdapter: Required ports/services not provided');
    });

    it('throws when repositories not provided', () => {
      expect(() => {
        adapter.initialize({
          ports: {
            [IStandardsPortName]: mockStandardsPort,
            [IGitPortName]: mockGitPort,
          },
          services: mockServices,
          repositories: undefined as unknown as ICodingAgentRepositories,
        });
      }).toThrow('CodingAgentAdapter: Required ports/services not provided');
    });

    it('creates use cases when all dependencies provided', () => {
      expect(() => {
        adapter.initialize({
          ports: {
            [IStandardsPortName]: mockStandardsPort,
            [IGitPortName]: mockGitPort,
          },
          services: mockServices,
          repositories: mockRepositories,
        });
      }).not.toThrow();

      expect(adapter.isReady()).toBe(true);
    });
  });

  describe('getPort', () => {
    it('returns the adapter as port interface', () => {
      adapter.initialize({
        ports: {
          [IStandardsPortName]: mockStandardsPort,
          [IGitPortName]: mockGitPort,
        },
        services: mockServices,
        repositories: mockRepositories,
      });

      expect(adapter.getPort()).toBe(adapter);
    });
  });

  describe('getDeployerRegistry', () => {
    it('returns deployer registry from repositories', () => {
      const mockRegistry = { getDeployer: jest.fn() };
      mockRepositories.getDeployerRegistry = jest
        .fn()
        .mockReturnValue(mockRegistry);

      adapter.initialize({
        ports: {
          [IStandardsPortName]: mockStandardsPort,
          [IGitPortName]: mockGitPort,
        },
        services: mockServices,
        repositories: mockRepositories,
      });

      const result = adapter.getDeployerRegistry();

      expect(result).toBe(mockRegistry);
      expect(mockRepositories.getDeployerRegistry).toHaveBeenCalled();
    });
  });
});
