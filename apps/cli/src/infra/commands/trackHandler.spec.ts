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
  logWarningConsole: jest.fn(),
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
    trackingRemovedAt: null,
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

    it('suggests moving tracking to the checked-out branch', () => {
      expect(mockConsoleLogger.logErrorConsole).toHaveBeenCalledWith(
        expect.stringContaining('Run packmind git track --update to move it'),
      );
    });

    it('exits with code 1', () => {
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  // `--update` alone targets the checked-out branch, so suggesting it after an
  // explicit `--branch` would move tracking to the wrong branch.
  describe('when an explicit branch is already tracked on another branch', () => {
    beforeEach(async () => {
      deps.branch = 'dev';
      mockTrackRepository.mockResolvedValue({
        status: 'already-tracked-other-branch',
        owner: 'my-orga',
        repo: 'my-repo',
        branch: 'dev',
        trackedBranch: 'main',
      });
      await trackHandler(deps);
    });

    it('suggests moving tracking to the requested branch', () => {
      expect(mockConsoleLogger.logErrorConsole).toHaveBeenCalledWith(
        expect.stringContaining(
          'Run packmind git track --update --branch dev to move it to dev.',
        ),
      );
    });

    it('exits with code 1', () => {
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  // Unified exit codes: 0 when the desired state holds, 1 when it cannot be
  // reached. `--update` onto the already-tracked branch is a no-op, not a
  // failure — it used to exit 1 while plain `track` exited 0 on the same state.
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

    it('reports the branch is already tracked', () => {
      expect(mockConsoleLogger.logInfoConsole).toHaveBeenCalledWith(
        'Repository my-orga/my-repo is already tracked on branch main.',
      );
    });

    it('exits with code 0', () => {
      expect(processExitSpy).toHaveBeenCalledWith(0);
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
        'Nothing is tracked yet — run packmind init or packmind git track to start tracking.',
      );
    });

    it('exits with code 1', () => {
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('when HEAD is detached', () => {
    beforeEach(async () => {
      mockTrackRepository.mockResolvedValue({
        status: 'detached-head',
        owner: 'my-orga',
        repo: 'my-repo',
      });
      await trackHandler(deps);
    });

    it('logs an error naming both ways out', () => {
      expect(mockConsoleLogger.logErrorConsole).toHaveBeenCalledWith(
        'No branch is checked out for my-orga/my-repo — HEAD is detached. Check a branch out, or name one with packmind git track --branch <name>.',
      );
    });

    it('exits with code 1', () => {
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('when the requested branch does not exist', () => {
    beforeEach(async () => {
      deps.branch = 'mian';
      mockTrackRepository.mockResolvedValue({
        status: 'branch-not-found',
        owner: 'my-orga',
        repo: 'my-repo',
        branch: 'mian',
      });
      await trackHandler(deps);
    });

    it('logs an error naming the branch and how to recover', () => {
      expect(mockConsoleLogger.logErrorConsole).toHaveBeenCalledWith(
        'Branch mian does not exist in my-orga/my-repo. Check the spelling, or run git fetch first if the branch only exists on the remote.',
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

  describe('when the caller is not an organization admin (403)', () => {
    const serverMessage =
      'User 947009df-5a1d-45e8-ab1b-c996320eb000 must be an admin of organization ce0eda86-2018-437a-b91d-14feedd72e89 to perform this action';

    beforeEach(async () => {
      const error: Error & { statusCode?: number } = new Error(serverMessage);
      error.statusCode = 403;
      mockTrackRepository.mockRejectedValue(error);
      await trackHandler(deps);
    });

    it('explains that admin rights are required', () => {
      expect(mockConsoleLogger.logErrorConsole).toHaveBeenCalledWith(
        'Only organization admins can change which repository Packmind tracks. Ask an admin of your organization to run this command.',
      );
    });

    // The server names the user and the organization by UUID, which is useless
    // to someone at a terminal.
    it('does not leak the server identifiers', () => {
      expect(mockConsoleLogger.logErrorConsole).not.toHaveBeenCalledWith(
        expect.stringContaining('947009df'),
      );
    });

    it('exits with code 1', () => {
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });
});
