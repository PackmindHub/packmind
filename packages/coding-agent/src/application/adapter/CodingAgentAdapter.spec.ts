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

    adapter = new CodingAgentAdapter(
      mockRepositories,
      mockServices,
      mockLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('isReady', () => {
    describe('when adapter not initialized', () => {
      it('returns false', () => {
        expect(adapter.isReady()).toBe(false);
      });
    });

    describe('when all required ports and services are set', () => {
      it('returns true', async () => {
        await adapter.initialize({
          [IStandardsPortName]: mockStandardsPort,
          [IGitPortName]: mockGitPort,
        });

        expect(adapter.isReady()).toBe(true);
      });
    });
  });

  describe('initialize', () => {
    describe('when required ports not provided', () => {
      it('throws', async () => {
        await expect(
          adapter.initialize({
            [IStandardsPortName]: mockStandardsPort,
            [IGitPortName]: undefined,
          } as unknown as {
            [IStandardsPortName]: IStandardsPort;
            [IGitPortName]: IGitPort;
          }),
        ).rejects.toThrow(
          'CodingAgentAdapter: Required ports/services not provided',
        );
      });
    });

    describe('when all dependencies provided', () => {
      it('creates use cases', async () => {
        await expect(
          adapter.initialize({
            [IStandardsPortName]: mockStandardsPort,
            [IGitPortName]: mockGitPort,
          }),
        ).resolves.not.toThrow();

        expect(adapter.isReady()).toBe(true);
      });
    });
  });

  describe('getPort', () => {
    it('returns the adapter as port interface', async () => {
      await adapter.initialize({
        [IStandardsPortName]: mockStandardsPort,
        [IGitPortName]: mockGitPort,
      });

      expect(adapter.getPort()).toBe(adapter);
    });
  });
});
