import { PackmindLogger } from '@packmind/logger';
import { PackmindEventEmitterService } from '@packmind/node-utils';
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
import { EnhancedAccountsServices } from '../services/EnhancedAccountsServices';
import { AccountsAdapter } from './AccountsAdapter';

describe('AccountsAdapter', () => {
  let adapter: AccountsAdapter;
  let mockLogger: PackmindLogger;
  let mockServices: EnhancedAccountsServices;
  let mockSpacesPort: ISpacesPort;
  let mockGitPort: IGitPort;
  let mockStandardsPort: IStandardsPort;
  let mockDeploymentPort: IDeploymentPort;
  let mockEventEmitterService: jest.Mocked<PackmindEventEmitterService>;

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
    mockEventEmitterService = {
      emit: jest.fn().mockReturnValue(true),
    } as unknown as jest.Mocked<PackmindEventEmitterService>;

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
        eventEmitterService: mockEventEmitterService,
      });
      expect(adapter.isReady()).toBe(true);
    });
  });

  describe('initialize', () => {
    describe('when called with no ports', () => {
      it('throws an error', async () => {
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
      });

      it('sets adapter as ready', async () => {
        try {
          await adapter.initialize(
            {} as {
              [ISpacesPortName]: ISpacesPort;
              [IGitPortName]: IGitPort;
              [IStandardsPortName]: IStandardsPort;
              [IDeploymentPortName]: IDeploymentPort;
            },
          );
        } catch {
          // Expected to throw
        }

        expect(adapter.isReady()).toBe(true);
      });
    });

    describe('when called with all ports', () => {
      it('does not throw', async () => {
        await expect(
          adapter.initialize({
            [ISpacesPortName]: mockSpacesPort,
            [IGitPortName]: mockGitPort,
            [IStandardsPortName]: mockStandardsPort,
            [IDeploymentPortName]: mockDeploymentPort,
            eventEmitterService: mockEventEmitterService,
          }),
        ).resolves.not.toThrow();
      });

      it('sets adapter as ready', async () => {
        await adapter.initialize({
          [ISpacesPortName]: mockSpacesPort,
          [IGitPortName]: mockGitPort,
          [IStandardsPortName]: mockStandardsPort,
          [IDeploymentPortName]: mockDeploymentPort,
          eventEmitterService: mockEventEmitterService,
        });

        expect(adapter.isReady()).toBe(true);
      });
    });
  });

  describe('getPort', () => {
    it('returns the adapter as port interface', async () => {
      await adapter.initialize({
        [ISpacesPortName]: mockSpacesPort,
        [IGitPortName]: mockGitPort,
        [IStandardsPortName]: mockStandardsPort,
        [IDeploymentPortName]: mockDeploymentPort,
        eventEmitterService: mockEventEmitterService,
      });
      expect(adapter.getPort()).toBe(adapter);
    });
  });
});
