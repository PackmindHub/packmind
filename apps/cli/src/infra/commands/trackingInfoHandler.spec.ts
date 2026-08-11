import {
  GetTrackingInfoFunction,
  trackingInfoHandler,
  TrackingInfoHandlerDependencies,
} from './trackingInfoHandler';
import { NotLoggedInError } from '../../domain/errors/NotLoggedInError';
import * as consoleLogger from '../utils/consoleLogger';

jest.mock('../utils/consoleLogger', () => ({
  logInfoConsole: jest.fn(),
  logSuccessConsole: jest.fn(),
  logErrorConsole: jest.fn(),
  logWarningConsole: jest.fn(),
  logConsole: jest.fn(),
  formatCommand: jest.fn((text: string) => text),
}));

const mockConsoleLogger = consoleLogger as jest.Mocked<typeof consoleLogger>;

describe('trackingInfoHandler', () => {
  let mockGetTrackingInfo: jest.MockedFunction<GetTrackingInfoFunction>;
  let deps: TrackingInfoHandlerDependencies;
  const processExitSpy = jest
    .spyOn(process, 'exit')
    .mockImplementation(() => undefined as never);

  beforeEach(() => {
    mockGetTrackingInfo = jest.fn();
    deps = {
      baseDirectory: '/repo',
      getTrackingInfo: mockGetTrackingInfo,
    };
  });

  afterEach(() => jest.clearAllMocks());

  it('inspects the current working repository', async () => {
    mockGetTrackingInfo.mockResolvedValue({
      status: 'not-tracked',
      owner: 'my-orga',
      repo: 'my-repo',
      currentBranch: 'dev',
    });

    await trackingInfoHandler(deps);

    expect(mockGetTrackingInfo).toHaveBeenCalledWith({ repoPath: '/repo' });
  });

  describe('when the checked-out branch is the tracked one', () => {
    beforeEach(async () => {
      mockGetTrackingInfo.mockResolvedValue({
        status: 'tracked',
        owner: 'my-orga',
        repo: 'my-repo',
        trackedBranch: 'main',
        currentBranch: 'main',
      });
      await trackingInfoHandler(deps);
    });

    it('exits with code 0', () => {
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    it('names the repository and the tracked branch', () => {
      expect(mockConsoleLogger.logInfoConsole).toHaveBeenCalledWith(
        "Packmind tracks my-orga/my-repo on branch 'main'.",
      );
    });

    it('stays silent about branch mismatches', () => {
      expect(mockConsoleLogger.logWarningConsole).not.toHaveBeenCalled();
    });
  });

  describe('when another branch is tracked', () => {
    beforeEach(async () => {
      mockGetTrackingInfo.mockResolvedValue({
        status: 'tracked',
        owner: 'my-orga',
        repo: 'my-repo',
        trackedBranch: 'main',
        currentBranch: 'dev',
      });
      await trackingInfoHandler(deps);
    });

    it('exits with code 0', () => {
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    it('names the repository and the tracked branch', () => {
      expect(mockConsoleLogger.logInfoConsole).toHaveBeenCalledWith(
        "Packmind tracks my-orga/my-repo on branch 'main'.",
      );
    });

    // A silent branch mismatch is exactly what makes distributions disappear.
    it('warns that distributions from here are not recorded', () => {
      expect(mockConsoleLogger.logWarningConsole).toHaveBeenCalledWith(
        "You are on 'dev', so distributions from here are not recorded. Run packmind git track --update to move tracking to 'dev'.",
      );
    });
  });

  describe('when the repository is not tracked', () => {
    beforeEach(async () => {
      mockGetTrackingInfo.mockResolvedValue({
        status: 'not-tracked',
        owner: 'my-orga',
        repo: 'my-repo',
        currentBranch: 'dev',
      });
      await trackingInfoHandler(deps);
    });

    // Reporting the state is the whole job: an untracked repository is an
    // answer, not a failure.
    it('exits with code 0', () => {
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    it('proposes tracking the checked-out branch', () => {
      expect(mockConsoleLogger.logInfoConsole).toHaveBeenCalledWith(
        "my-orga/my-repo is not tracked in Packmind. Run packmind git track to track branch 'dev'.",
      );
    });
  });

  describe('when the user is not logged in', () => {
    beforeEach(async () => {
      mockGetTrackingInfo.mockRejectedValue(new NotLoggedInError());
      await trackingInfoHandler(deps);
    });

    it('surfaces the not-logged-in message', () => {
      expect(mockConsoleLogger.logErrorConsole).toHaveBeenCalledWith(
        new NotLoggedInError().message,
      );
    });

    it('exits with code 1', () => {
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('when the repository has no git remote', () => {
    beforeEach(async () => {
      mockGetTrackingInfo.mockRejectedValue(
        new Error('No git remote configured'),
      );
      await trackingInfoHandler(deps);
    });

    it('surfaces the git error', () => {
      expect(mockConsoleLogger.logErrorConsole).toHaveBeenCalledWith(
        'No git remote configured',
      );
    });

    it('exits with code 1', () => {
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });
});
