import { extractDebugFlag, isDebug, setDebug, DEBUG_FLAG } from './debugMode';

describe('debugMode', () => {
  afterEach(() => {
    setDebug(false);
  });

  describe('extractDebugFlag', () => {
    describe('when the flag is absent', () => {
      it('reports debug as disabled', () => {
        expect(extractDebugFlag(['skills', 'list']).debug).toBe(false);
      });

      it('keeps the arguments untouched', () => {
        expect(extractDebugFlag(['skills', 'list']).args).toEqual([
          'skills',
          'list',
        ]);
      });
    });

    describe('when the flag trails a subcommand', () => {
      it('reports debug as enabled', () => {
        expect(extractDebugFlag(['skills', 'list', DEBUG_FLAG]).debug).toBe(
          true,
        );
      });

      it('strips it from the arguments', () => {
        expect(extractDebugFlag(['skills', 'list', DEBUG_FLAG]).args).toEqual([
          'skills',
          'list',
        ]);
      });
    });

    describe('when the flag sits between other arguments', () => {
      it('strips it while preserving the order of the rest', () => {
        expect(
          extractDebugFlag(['install', DEBUG_FLAG, '--space', 'demo']).args,
        ).toEqual(['install', '--space', 'demo']);
      });
    });

    describe('when the flag appears several times', () => {
      it('strips every occurrence', () => {
        expect(
          extractDebugFlag([DEBUG_FLAG, 'whoami', DEBUG_FLAG]).args,
        ).toEqual(['whoami']);
      });
    });

    describe('when the flag follows a bare --', () => {
      it('leaves it in place as a positional', () => {
        expect(extractDebugFlag(['lint', '--', DEBUG_FLAG]).args).toEqual([
          'lint',
          '--',
          DEBUG_FLAG,
        ]);
      });

      it('reports debug as disabled', () => {
        expect(extractDebugFlag(['lint', '--', DEBUG_FLAG]).debug).toBe(false);
      });
    });
  });

  describe('isDebug', () => {
    describe('when nothing enabled it', () => {
      it('is disabled', () => {
        expect(isDebug()).toBe(false);
      });
    });

    describe('when setDebug enabled it', () => {
      it('is enabled', () => {
        setDebug(true);

        expect(isDebug()).toBe(true);
      });
    });
  });
});
