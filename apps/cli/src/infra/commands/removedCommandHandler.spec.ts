import {
  NotifyErrorFunction,
  removedTrackHandler,
  RemovedTrackHandlerDependencies,
  removedUntrackHandler,
} from './removedCommandHandler';

describe('removedCommandHandler', () => {
  let notifyError: jest.MockedFunction<NotifyErrorFunction>;
  const processExitSpy = jest
    .spyOn(process, 'exit')
    .mockImplementation(() => undefined as never);

  beforeEach(() => {
    notifyError = jest.fn();
  });

  afterEach(() => jest.clearAllMocks());

  describe('removedTrackHandler', () => {
    let deps: RemovedTrackHandlerDependencies;

    beforeEach(() => {
      deps = { update: false, remove: false, notifyError };
    });

    describe('when no flag is passed', () => {
      beforeEach(() => {
        removedTrackHandler(deps);
      });

      it('names the removed command', () => {
        expect(notifyError).toHaveBeenCalledWith(
          'Command "packmind track" has been removed.',
          expect.anything(),
        );
      });

      it('points at the git track command', () => {
        expect(notifyError).toHaveBeenCalledWith(expect.any(String), {
          content: 'Use the "git track" command instead:',
          exampleCommand: 'packmind git track',
        });
      });

      // Following the old spelling must not look like it worked.
      it('exits with code 1', () => {
        expect(processExitSpy).toHaveBeenCalledWith(1);
      });
    });

    describe('when --update is passed', () => {
      beforeEach(() => {
        deps.update = true;
        removedTrackHandler(deps);
      });

      it('carries the flag over to the suggested command', () => {
        expect(notifyError).toHaveBeenCalledWith(expect.any(String), {
          content: 'Use the "git track" command instead:',
          exampleCommand: 'packmind git track --update',
        });
      });
    });

    describe('when --branch is passed', () => {
      beforeEach(() => {
        deps.branch = 'main';
        removedTrackHandler(deps);
      });

      it('carries the branch over to the suggested command', () => {
        expect(notifyError).toHaveBeenCalledWith(expect.any(String), {
          content: 'Use the "git track" command instead:',
          exampleCommand: 'packmind git track --branch main',
        });
      });
    });

    describe('when both --update and --branch are passed', () => {
      beforeEach(() => {
        deps.update = true;
        deps.branch = 'main';
        removedTrackHandler(deps);
      });

      it('carries both over in the order the command expects', () => {
        expect(notifyError).toHaveBeenCalledWith(expect.any(String), {
          content: 'Use the "git track" command instead:',
          exampleCommand: 'packmind git track --update --branch main',
        });
      });
    });

    // Removal moved to its own command, so this spelling has a different
    // replacement from every other one.
    describe('when --remove is passed', () => {
      beforeEach(() => {
        deps.remove = true;
        removedTrackHandler(deps);
      });

      it('names the removed spelling', () => {
        expect(notifyError).toHaveBeenCalledWith(
          'Command "packmind track --remove" has been removed.',
          expect.anything(),
        );
      });

      it('points at the git untrack command', () => {
        expect(notifyError).toHaveBeenCalledWith(expect.any(String), {
          content: 'Use the "git untrack" command instead:',
          exampleCommand: 'packmind git untrack',
        });
      });

      it('exits with code 1', () => {
        expect(processExitSpy).toHaveBeenCalledWith(1);
      });
    });

    describe('when --remove is combined with the tracking flags', () => {
      beforeEach(() => {
        deps.remove = true;
        deps.update = true;
        deps.branch = 'main';
        removedTrackHandler(deps);
      });

      // `git untrack` takes no branch, so carrying the flags over would
      // suggest a command that does not parse.
      it('does not carry the tracking flags over', () => {
        expect(notifyError).toHaveBeenCalledWith(expect.any(String), {
          content: 'Use the "git untrack" command instead:',
          exampleCommand: 'packmind git untrack',
        });
      });
    });
  });

  describe('removedUntrackHandler', () => {
    beforeEach(() => {
      removedUntrackHandler({ notifyError });
    });

    it('names the removed command', () => {
      expect(notifyError).toHaveBeenCalledWith(
        'Command "packmind untrack" has been removed.',
        expect.anything(),
      );
    });

    it('points at the git untrack command', () => {
      expect(notifyError).toHaveBeenCalledWith(expect.any(String), {
        content: 'Use the "git untrack" command instead:',
        exampleCommand: 'packmind git untrack',
      });
    });

    it('exits with code 1', () => {
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });
});
