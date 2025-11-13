import { PackmindLogger } from '@packmind/logger';
import {
  IDeploymentPort,
  IDeploymentPortName,
  IGitPort,
  IGitPortName,
  ISpacesPort,
  ISpacesPortName,
  IStandardsPort,
  IStandardsPortName,
} from '@packmind/types';
import { AccountsAdapter } from './AccountsAdapter';
import { EnhancedAccountsServices } from '../services/EnhancedAccountsServices';

describe('AccountsAdapter', () => {
  let adapter: AccountsAdapter;
  let mockLogger: PackmindLogger;
  let mockServices: EnhancedAccountsServices;
  let mockSpacesPort: ISpacesPort;
  let mockGitPort: IGitPort;
  let mockStandardsPort: IStandardsPort;
  let mockDeploymentPort: IDeploymentPort;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    } as unknown as PackmindLogger;

    mockSpacesPort = {} as ISpacesPort;
    mockGitPort = {} as IGitPort;
    mockStandardsPort = {} as IStandardsPort;
    mockDeploymentPort = {} as IDeploymentPort;

    mockServices = {
      getUserService: jest.fn(),
      getOrganizationService: jest.fn(),
      getLoginRateLimiterService: jest.fn(),
      getInvitationService: jest.fn(),
      getPasswordResetTokenService: jest.fn(),
      getApiKeyService: jest.fn(),
    } as unknown as EnhancedAccountsServices;

    adapter = new AccountsAdapter(mockServices, mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('isReady', () => {
    it('returns false before initialization (all ports optional)', () => {
      expect(adapter.isReady()).toBe(false);
    });

    it('returns true after initialization with all ports', async () => {
      await adapter.initialize({
        [ISpacesPortName]: mockSpacesPort,
        [IGitPortName]: mockGitPort,
        [IStandardsPortName]: mockStandardsPort,
        [IDeploymentPortName]: mockDeploymentPort,
      });
      expect(adapter.isReady()).toBe(true);
    });
  });

  describe('initialize', () => {
    it('throw with no ports', async () => {
      await expect(
        adapter.initialize(
          {} as {
            [ISpacesPortName]: ISpacesPort;
            [IGitPortName]: IGitPort;
            [IStandardsPortName]: IStandardsPort;
            [IDeploymentPortName]: IDeploymentPort;
          },
        ),
      ).rejects.toThrow();

      expect(adapter.isReady()).toBe(true);
    });
    it('initializes successfully with all ports', async () => {
      await expect(
        adapter.initialize({
          [ISpacesPortName]: mockSpacesPort,
          [IGitPortName]: mockGitPort,
          [IStandardsPortName]: mockStandardsPort,
          [IDeploymentPortName]: mockDeploymentPort,
        }),
      ).resolves.not.toThrow();

      expect(adapter.isReady()).toBe(true);
    });
  });

  describe('getPort', () => {
    it('returns the adapter as port interface', async () => {
      await adapter.initialize({
        [ISpacesPortName]: mockSpacesPort,
        [IGitPortName]: mockGitPort,
        [IStandardsPortName]: mockStandardsPort,
        [IDeploymentPortName]: mockDeploymentPort,
      });
      expect(adapter.getPort()).toBe(adapter);
    });
  });
});
