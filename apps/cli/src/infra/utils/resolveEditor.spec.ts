import { resolveEditor, EDITOR_NOT_FOUND_MESSAGE } from './resolveEditor';
import * as which from 'which';

jest.mock('which');

describe('resolveEditor', () => {
  const mockedWhichSync = which.sync as jest.MockedFunction<typeof which.sync>;
  const originalEditor = process.env.EDITOR;
  const originalVisual = process.env.VISUAL;

  beforeEach(() => {
    delete process.env.EDITOR;
    delete process.env.VISUAL;
    mockedWhichSync.mockReset();
  });

  afterAll(() => {
    if (originalEditor === undefined) {
      delete process.env.EDITOR;
    } else {
      process.env.EDITOR = originalEditor;
    }
    if (originalVisual === undefined) {
      delete process.env.VISUAL;
    } else {
      process.env.VISUAL = originalVisual;
    }
  });

  describe('environment variables', () => {
    describe('when $VISUAL is set', () => {
      beforeEach(() => {
        process.env.VISUAL = 'code --wait';
      });

      it('returns $VISUAL', () => {
        expect(resolveEditor('linux')).toBe('code --wait');
      });

      it('does not call which.sync', () => {
        resolveEditor('linux');
        expect(mockedWhichSync).not.toHaveBeenCalled();
      });
    });

    describe('when both $VISUAL and $EDITOR are set', () => {
      it('prefers $VISUAL over $EDITOR', () => {
        process.env.VISUAL = 'code --wait';
        process.env.EDITOR = 'nano';

        expect(resolveEditor('linux')).toBe('code --wait');
      });
    });

    describe('when $VISUAL is not set', () => {
      beforeEach(() => {
        process.env.EDITOR = 'nano';
      });

      it('returns $EDITOR', () => {
        expect(resolveEditor('linux')).toBe('nano');
      });

      it('does not call which.sync', () => {
        resolveEditor('linux');
        expect(mockedWhichSync).not.toHaveBeenCalled();
      });
    });

    it('ignores empty $VISUAL and $EDITOR values', () => {
      process.env.VISUAL = '';
      process.env.EDITOR = '';
      mockedWhichSync.mockReturnValue('/usr/bin/nano');

      expect(resolveEditor('linux')).toBe('nano');
    });
  });

  describe('Windows fallback', () => {
    describe('when notepad is found on PATH', () => {
      it('returns notepad', () => {
        mockedWhichSync.mockImplementation((cmd: string) => {
          if (cmd === 'notepad') return 'C:\\Windows\\System32\\notepad.exe';
          throw new Error('not found');
        });

        expect(resolveEditor('win32')).toBe('notepad');
      });
    });

    describe('when notepad is not found', () => {
      it('throws actionable error', () => {
        mockedWhichSync.mockImplementation(() => {
          throw new Error('not found');
        });

        expect(() => resolveEditor('win32')).toThrow(EDITOR_NOT_FOUND_MESSAGE);
      });
    });
  });

  describe('Unix fallback', () => {
    describe('when nano is found first', () => {
      it('returns nano', () => {
        mockedWhichSync.mockImplementation((cmd: string) => {
          if (cmd === 'nano') return '/usr/bin/nano';
          throw new Error('not found');
        });

        expect(resolveEditor('linux')).toBe('nano');
      });
    });

    describe('when nano is missing', () => {
      it('falls through to vim', () => {
        mockedWhichSync.mockImplementation((cmd: string) => {
          if (cmd === 'nano') throw new Error('not found');
          if (cmd === 'vim') return '/usr/bin/vim';
          throw new Error('not found');
        });

        expect(resolveEditor('linux')).toBe('vim');
      });
    });

    describe('when nano and vim are missing', () => {
      it('falls through to vi', () => {
        mockedWhichSync.mockImplementation((cmd: string) => {
          if (cmd === 'vi') return '/usr/bin/vi';
          throw new Error('not found');
        });

        expect(resolveEditor('darwin')).toBe('vi');
      });
    });

    describe('when no Unix candidate resolves', () => {
      it('throws actionable error', () => {
        mockedWhichSync.mockImplementation(() => {
          throw new Error('not found');
        });

        expect(() => resolveEditor('darwin')).toThrow(EDITOR_NOT_FOUND_MESSAGE);
      });
    });
  });

  describe('default platform', () => {
    describe('when no platform is provided', () => {
      it('falls back to process.platform', () => {
        mockedWhichSync.mockImplementation((cmd: string) => {
          if (process.platform === 'win32') {
            if (cmd === 'notepad') return 'C:\\Windows\\System32\\notepad.exe';
          } else {
            if (cmd === 'nano') return '/usr/bin/nano';
          }
          throw new Error('not found');
        });

        const expected = process.platform === 'win32' ? 'notepad' : 'nano';
        expect(resolveEditor()).toBe(expected);
      });
    });
  });
});
