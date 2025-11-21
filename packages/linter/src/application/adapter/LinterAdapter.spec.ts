import {
  IAccountsPort,
  IAccountsPortName,
  IDeploymentPort,
  IDeploymentPortName,
  IExecuteLinterProgramsUseCase,
  IGitPort,
  IGitPortName,
  ISpacesPort,
  ISpacesPortName,
  IStandardsPort,
  IStandardsPortName,
} from '@packmind/types';
import { ILinterDelayedJobs } from '../../domain/jobs/ILinterDelayedJobs';
import { ILinterRepositories } from '../../domain/repositories/ILinterRepositories';
import { DetectionProgramService } from '../services/DetectionProgramService';
import { LinterAdapter } from './LinterAdapter';

describe('LinterAdapter', () => {
  let adapter: LinterAdapter;
  let mockDetectionProgramService: DetectionProgramService;
  let mockRepositories: ILinterRepositories;
  let mockStandardsPort: IStandardsPort;
  let mockGitPort: IGitPort;
  let mockAccountsPort: IAccountsPort;
  let mockLinterDelayedJobs: ILinterDelayedJobs;
  let mockDeploymentsPort: IDeploymentPort;
  let mockSpacesPort: ISpacesPort;

  beforeEach(() => {
    // Create mocks
    mockDetectionProgramService = {} as DetectionProgramService;
    mockRepositories = {
      getDetectionProgramRepository: jest.fn(),
      getActiveDetectionProgramRepository: jest.fn(),
      getRuleDetectionAssessmentRepository: jest.fn(),
      getDetectionHeuristicsRepository: jest.fn(),
    } as unknown as ILinterRepositories;

    mockStandardsPort = {} as IStandardsPort;
    mockGitPort = {} as IGitPort;
    mockAccountsPort = {} as IAccountsPort;
    mockLinterDelayedJobs = {
      generateProgramDelayedJob: {},
      assessRuleDetectionDelayedJob: {},
    } as ILinterDelayedJobs;
    mockDeploymentsPort = {} as IDeploymentPort;
    mockSpacesPort = {} as ISpacesPort;

    // Create adapter
    adapter = new LinterAdapter({
      hexaFactory: {
        getDetectionProgramService: () => mockDetectionProgramService,
        getRepositories: () => mockRepositories,
      },
      executeLinterProgramsUseCase: {} as IExecuteLinterProgramsUseCase,
    });
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

    describe('when all required ports are set', () => {
      it('returns true', async () => {
        await adapter.initialize({
          [IGitPortName]: mockGitPort,
          [IStandardsPortName]: mockStandardsPort,
          [IAccountsPortName]: mockAccountsPort,
          llmPort: null,
          linterDelayedJobs: mockLinterDelayedJobs,
        });

        expect(adapter.isReady()).toBe(true);
      });
    });

    describe('when missing required port', () => {
      it('returns false', async () => {
        const adapterPartial = new LinterAdapter({
          hexaFactory: {
            getDetectionProgramService: () => mockDetectionProgramService,
            getRepositories: () => mockRepositories,
          },
          executeLinterProgramsUseCase: {} as IExecuteLinterProgramsUseCase,
        });

        // Don't initialize - should be false
        expect(adapterPartial.isReady()).toBe(false);
      });
    });
  });

  describe('initialize', () => {
    describe('when required ports not provided', () => {
      it('throws', async () => {
        await expect(
          adapter.initialize({
            [IGitPortName]: mockGitPort,
            // Missing IStandardsPortName and IAccountsPortName
            linterDelayedJobs: mockLinterDelayedJobs,
          } as Parameters<typeof adapter.initialize>[0]),
        ).rejects.toThrow('LinterAdapter: Required ports not provided');
      });
    });

    it('initializes successfully with all required ports', async () => {
      await expect(
        adapter.initialize({
          [IGitPortName]: mockGitPort,
          [IStandardsPortName]: mockStandardsPort,
          [IAccountsPortName]: mockAccountsPort,
          llmPort: null,
          linterDelayedJobs: mockLinterDelayedJobs,
        }),
      ).resolves.not.toThrow();

      expect(adapter.isReady()).toBe(true);
    });

    it('initializes successfully with optional ports', async () => {
      await expect(
        adapter.initialize({
          [IGitPortName]: mockGitPort,
          [IStandardsPortName]: mockStandardsPort,
          [IAccountsPortName]: mockAccountsPort,
          [IDeploymentPortName]: mockDeploymentsPort,
          [ISpacesPortName]: mockSpacesPort,
          llmPort: null,
          linterDelayedJobs: mockLinterDelayedJobs,
        }),
      ).resolves.not.toThrow();

      expect(adapter.isReady()).toBe(true);
    });
  });

  describe('getPort', () => {
    it('returns the adapter as port interface', async () => {
      await adapter.initialize({
        [IGitPortName]: mockGitPort,
        [IStandardsPortName]: mockStandardsPort,
        [IAccountsPortName]: mockAccountsPort,
        llmPort: null,
        linterDelayedJobs: mockLinterDelayedJobs,
      });

      expect(adapter.getPort()).toBe(adapter);
    });
  });
});
