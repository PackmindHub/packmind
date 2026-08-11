import { untrackHandler, UntrackHandlerDependencies } from './untrackHandler';
import { TrackRepositoryFunction } from './trackHandler';
import { NotLoggedInError } from '../../domain/errors/NotLoggedInError';
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

describe('untrackHandler', () => {
  let mockTrackRepository: jest.MockedFunction<TrackRepositoryFunction>;
  let deps: UntrackHandlerDependencies;
  const processExitSpy = jest
    .spyOn(process, 'exit')
    .mockImplementation(() => undefined as never);

  beforeEach(() => {
    mockTrackRepository = jest.fn();
    deps = {
      baseDirectory: '/repo',
      trackRepository: mockTrackRepository,
      isTTY: true,
      confirmPrompt: jest.fn().mockResolvedValue(true),
    };
  });

  afterEach(() => jest.clearAllMocks());

  // The unit of tracking is the repository, so `untrack` never sends a branch.
  it('asks for removal without naming a branch', async () => {
    mockTrackRepository.mockResolvedValue({ status: 'cancelled' });

    await untrackHandler(deps);

    expect(mockTrackRepository).toHaveBeenCalledWith(
      expect.objectContaining({ remove: true, update: false }),
    );
  });

  describe('when tracking is removed', () => {
    beforeEach(async () => {
      mockTrackRepository.mockResolvedValue({
        status: 'removed',
        owner: 'my-orga',
        repo: 'my-repo',
        branch: 'main',
      });
      await untrackHandler(deps);
    });

    it('exits with code 0', () => {
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    it('promises the history is kept', () => {
      expect(mockConsoleLogger.logSuccessConsole).toHaveBeenCalledWith(
        expect.stringContaining('kept'),
      );
    });
  });

  describe('when the repository was never tracked', () => {
    beforeEach(async () => {
      mockTrackRepository.mockResolvedValue({
        status: 'not-tracked',
        owner: 'my-orga',
        repo: 'my-repo',
        organizationName: 'PickMand',
      });
      await untrackHandler(deps);
    });

    it('exits with code 0', () => {
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    it('warns naming the organization', () => {
      expect(mockConsoleLogger.logWarningConsole).toHaveBeenCalledWith(
        "Repository is not tracked in 'PickMand' organization",
      );
    });
  });

  describe('when the removal is cancelled', () => {
    beforeEach(async () => {
      mockTrackRepository.mockResolvedValue({ status: 'cancelled' });
      await untrackHandler(deps);
    });

    it('exits with code 0', () => {
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    it('reports that no changes were made', () => {
      expect(mockConsoleLogger.logInfoConsole).toHaveBeenCalledWith(
        'No changes made. The tracked branch is unchanged.',
      );
    });
  });

  describe('when the caller is not an organization admin', () => {
    beforeEach(async () => {
      const error: Error & { statusCode?: number } = new Error(
        'User 947009df-5a1d-45e8-ab1b-c996320eb000 must be an admin of organization ce0eda86-2018-437a-b91d-14feedd72e89 to perform this action',
      );
      error.statusCode = 403;
      mockTrackRepository.mockRejectedValue(error);
      await untrackHandler(deps);
    });

    it('explains that admin rights are required', () => {
      expect(mockConsoleLogger.logErrorConsole).toHaveBeenCalledWith(
        'Only organization admins can change which repository Packmind tracks. Ask an admin of your organization to run this command.',
      );
    });

    it('exits with code 1', () => {
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('when the user is not logged in', () => {
    beforeEach(async () => {
      mockTrackRepository.mockRejectedValue(new NotLoggedInError());
      await untrackHandler(deps);
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
});
