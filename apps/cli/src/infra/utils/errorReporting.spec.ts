import { withErrorReporting } from './errorReporting';
import { appendErrorLog } from './errorLog';

jest.mock('./errorLog', () => {
  const actual = jest.requireActual('./errorLog');
  return { ...actual, appendErrorLog: jest.fn() };
});

const mockAppendErrorLog = appendErrorLog as jest.MockedFunction<
  typeof appendErrorLog
>;

describe('withErrorReporting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when an async method rejects', () => {
    class Facade {
      async listSkills(): Promise<never> {
        throw new Error('listing skills blew up');
      }
    }

    let thrown: unknown;

    beforeEach(async () => {
      const facade = withErrorReporting(new Facade());
      try {
        await facade.listSkills();
      } catch (error) {
        thrown = error;
      }
    });

    it('records the message', () => {
      expect(mockAppendErrorLog.mock.calls[0][0].message).toBe(
        'listing skills blew up',
      );
    });

    it('records a stack', () => {
      expect(mockAppendErrorLog.mock.calls[0][0].diagnostics).toContain(
        '  Stack:',
      );
    });

    it('re-throws so the caller still decides what to do', () => {
      expect(thrown).toBeInstanceOf(Error);
    });
  });

  describe('when a synchronous method throws', () => {
    class Facade {
      configExists(): boolean {
        throw new Error('config unreadable');
      }
    }

    it('records it too', () => {
      const facade = withErrorReporting(new Facade());

      expect(() => facade.configExists()).toThrow('config unreadable');
      expect(mockAppendErrorLog.mock.calls[0][0].message).toBe(
        'config unreadable',
      );
    });
  });

  describe('when the same error passes two wrapped layers', () => {
    class Inner {
      async run(): Promise<never> {
        throw new Error('one failure');
      }
    }

    it('records it once', async () => {
      const inner = withErrorReporting(new Inner());
      const outer = withErrorReporting({
        run: () => inner.run(),
      });

      await expect(outer.run()).rejects.toThrow('one failure');
      expect(mockAppendErrorLog).toHaveBeenCalledTimes(1);
    });
  });

  describe('when a method succeeds', () => {
    it('returns its value untouched', async () => {
      const facade = withErrorReporting({
        listSkills: async () => ['a', 'b'],
      });

      await expect(facade.listSkills()).resolves.toEqual(['a', 'b']);
    });

    it('records nothing', async () => {
      const facade = withErrorReporting({ listSkills: async () => ['a'] });

      await facade.listSkills();

      expect(mockAppendErrorLog).not.toHaveBeenCalled();
    });
  });

  describe('when a property is not a function', () => {
    it('passes it through', () => {
      expect(withErrorReporting({ name: 'packmind' }).name).toBe('packmind');
    });
  });
});
