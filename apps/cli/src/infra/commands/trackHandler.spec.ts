import { GitRepo, GitRepoId } from '@packmind/types';
import {
  trackHandler,
  TrackHandlerDependencies,
  TrackRepositoryFunction,
} from './trackHandler';
import { NotLoggedInError } from '../../domain/errors/NotLoggedInError';
import { TrackRepositoryConfirmation } from '../../domain/useCases/trackRepository/ITrackRepositoryUseCase';
import * as consoleLogger from '../utils/consoleLogger';

jest.mock('inquirer', () => ({
  __esModule: true,
  default: { prompt: jest.fn() },
}));

jest.mock('../utils/consoleLogger', () => ({
  logInfoConsole: jest.fn(),
  logSuccessConsole: jest.fn(),
  logErrorConsole: jest.fn(),
  logConsole: jest.fn(),
  formatCommand: jest.fn((text: string) => text),
}));

const mockConsoleLogger = consoleLogger as jest.Mocked<typeof consoleLogger>;

function makeGitRepo(branch: string): GitRepo {
  return {
    id: 'repo-id' as GitRepoId,
    owner: 'my-orga',
    repo: 'my-repo',
    branch,
    providerId: 'provider-id' as GitRepo['providerId'],
    isTracked: true,
  };
}

describe('trackHandler', () => {
  let mockTrackRepository: jest.MockedFunction<TrackRepositoryFunction>;
  let deps: TrackHandlerDependencies;
  const processExitSpy = jest
    .spyOn(process, 'exit')
    .mockImplementation(() => undefined as never);

  beforeEach(() => {
    mockTrackRepository = jest.fn();
    deps = {
      update: false,
      baseDirectory: '/repo',
      trackRepository: mockTrackRepository,
      isTTY: true,
      confirmPrompt: jest.fn().mockResolvedValue(true),
    };
  });

  afterEach(() => jest.clearAllMocks());

  describe('when the repository is newly tracked', () => {
    beforeEach(async () => {
      mockTrackRepository.mockResolvedValue({
        status: 'set',
        owner: 'my-orga',
        repo: 'my-repo',
        branch: 'dev',
        gitRepo: makeGitRepo('dev'),
      });
      await trackHandler(deps);
    });

    it('logs a success message', () => {
      expect(mockConsoleLogger.logSuccessConsole).toHaveBeenCalledWith(
        'Packmind now tracks my-orga/my-repo on branch dev.',
      );
    });

    it('exits with code 0', () => {
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });
  });

  describe('when the tracked branch is updated', () => {
    beforeEach(async () => {
      deps.update = true;
      mockTrackRepository.mockResolvedValue({
        status: 'updated',
        owner: 'my-orga',
        repo: 'my-repo',
        branch: 'dev',
        fromBranch: 'main',
        gitRepo: makeGitRepo('dev'),
      });
      await trackHandler(deps);
    });

    it('logs the branch change', () => {
      expect(mockConsoleLogger.logSuccessConsole).toHaveBeenCalledWith(
        'Tracked branch for my-orga/my-repo changed from main to dev.',
      );
    });

    it('exits with code 0', () => {
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });
  });

  describe('when the operation is cancelled', () => {
    beforeEach(async () => {
      mockTrackRepository.mockResolvedValue({ status: 'cancelled' });
      await trackHandler(deps);
    });

    it('reports that no changes were made', () => {
      expect(mockConsoleLogger.logInfoConsole).toHaveBeenCalledWith(
        'No changes made. The tracked branch is unchanged.',
      );
    });

    it('exits with code 0', () => {
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });
  });

  describe('confirmation prompt', () => {
    let capturedConfirm: (
      details: TrackRepositoryConfirmation,
    ) => Promise<boolean>;

    beforeEach(() => {
      mockTrackRepository.mockImplementation(async (command) => {
        capturedConfirm = command.confirm;
        return { status: 'cancelled' };
      });
    });

    const setDetails: TrackRepositoryConfirmation = {
      mode: 'set',
      owner: 'my-orga',
      repo: 'my-repo',
      branch: 'dev',
    };

    describe('when running interactively and the user confirms', () => {
      let confirmResult: boolean;

      beforeEach(async () => {
        (deps.confirmPrompt as jest.Mock).mockResolvedValue(true);
        await trackHandler(deps);
        confirmResult = await capturedConfirm(setDetails);
      });

      it('resolves the confirmation to true', () => {
        expect(confirmResult).toBe(true);
      });

      it('invokes the confirm prompt', () => {
        expect(deps.confirmPrompt).toHaveBeenCalled();
      });
    });

    describe('when running interactively and the user declines', () => {
      it('resolves the confirmation to false', async () => {
        (deps.confirmPrompt as jest.Mock).mockResolvedValue(false);
        await trackHandler(deps);

        await expect(capturedConfirm(setDetails)).resolves.toBe(false);
      });
    });

    describe('when not running interactively', () => {
      let confirmResult: boolean;

      beforeEach(async () => {
        deps.isTTY = false;
        await trackHandler(deps);
        confirmResult = await capturedConfirm(setDetails);
      });

      it('auto-confirms', () => {
        expect(confirmResult).toBe(true);
      });

      it('does not prompt', () => {
        expect(deps.confirmPrompt).not.toHaveBeenCalled();
      });
    });
  });

  describe('when the repository is already tracked on another branch', () => {
    beforeEach(async () => {
      mockTrackRepository.mockResolvedValue({
        status: 'already-tracked-other-branch',
        owner: 'my-orga',
        repo: 'my-repo',
        branch: 'dev',
        trackedBranch: 'main',
      });
      await trackHandler(deps);
    });

    it('logs an error mentioning the tracked branch', () => {
      expect(mockConsoleLogger.logErrorConsole).toHaveBeenCalledWith(
        expect.stringContaining('already tracked on branch main'),
      );
    });

    it('exits with code 1', () => {
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('when update is requested but the same branch is tracked', () => {
    beforeEach(async () => {
      deps.update = true;
      mockTrackRepository.mockResolvedValue({
        status: 'already-tracked-same-branch',
        owner: 'my-orga',
        repo: 'my-repo',
        branch: 'main',
      });
      await trackHandler(deps);
    });

    it('logs an error', () => {
      expect(mockConsoleLogger.logErrorConsole).toHaveBeenCalledWith(
        'Repository my-orga/my-repo is already tracked on branch main.',
      );
    });

    it('exits with code 1', () => {
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('when update is requested but nothing is tracked', () => {
    beforeEach(async () => {
      deps.update = true;
      mockTrackRepository.mockResolvedValue({
        status: 'nothing-tracked',
        owner: 'my-orga',
        repo: 'my-repo',
        branch: 'dev',
      });
      await trackHandler(deps);
    });

    it('logs an error naming both commands', () => {
      expect(mockConsoleLogger.logErrorConsole).toHaveBeenCalledWith(
        expect.stringContaining('Nothing is tracked yet'),
      );
    });

    it('exits with code 1', () => {
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('when the user is not logged in', () => {
    beforeEach(async () => {
      mockTrackRepository.mockRejectedValue(new NotLoggedInError());
      await trackHandler(deps);
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

  describe('when the caller is not an admin', () => {
    beforeEach(async () => {
      const error: Error & { statusCode?: number } = new Error(
        'You must be an organization admin to set the tracked branch',
      );
      error.statusCode = 403;
      mockTrackRepository.mockRejectedValue(error);
      await trackHandler(deps);
    });

    it('surfaces the server message', () => {
      expect(mockConsoleLogger.logErrorConsole).toHaveBeenCalledWith(
        'You must be an organization admin to set the tracked branch',
      );
    });

    it('exits with code 1', () => {
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('when the feature is not available (404)', () => {
    beforeEach(async () => {
      const error: Error & { statusCode?: number } = new Error('Not Found');
      error.statusCode = 404;
      mockTrackRepository.mockRejectedValue(error);
      await trackHandler(deps);
    });

    it('reports the feature is unavailable', () => {
      expect(mockConsoleLogger.logErrorConsole).toHaveBeenCalledWith(
        'Repository tracking is not available for your account.',
      );
    });

    it('exits with code 1', () => {
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });
});
