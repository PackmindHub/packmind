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
    it('returns $VISUAL when set', () => {
      process.env.VISUAL = 'code --wait';

      expect(resolveEditor('linux')).toBe('code --wait');
      expect(mockedWhichSync).not.toHaveBeenCalled();
    });

    it('prefers $VISUAL over $EDITOR when both are set', () => {
      process.env.VISUAL = 'code --wait';
      process.env.EDITOR = 'nano';

      expect(resolveEditor('linux')).toBe('code --wait');
    });

    it('returns $EDITOR when $VISUAL is not set', () => {
      process.env.EDITOR = 'nano';

      expect(resolveEditor('linux')).toBe('nano');
      expect(mockedWhichSync).not.toHaveBeenCalled();
    });

    it('ignores empty $VISUAL and $EDITOR values', () => {
      process.env.VISUAL = '';
      process.env.EDITOR = '';
      mockedWhichSync.mockReturnValue('/usr/bin/nano');

      expect(resolveEditor('linux')).toBe('nano');
    });
  });

  describe('Windows fallback', () => {
    it('returns notepad when found on PATH', () => {
      mockedWhichSync.mockImplementation((cmd: string) => {
        if (cmd === 'notepad') return 'C:\\Windows\\System32\\notepad.exe';
        throw new Error('not found');
      });

      expect(resolveEditor('win32')).toBe('notepad');
    });

    it('throws actionable error when notepad is not found', () => {
      mockedWhichSync.mockImplementation(() => {
        throw new Error('not found');
      });

      expect(() => resolveEditor('win32')).toThrow(EDITOR_NOT_FOUND_MESSAGE);
    });
  });

  describe('Unix fallback', () => {
    it('returns nano when found first', () => {
      mockedWhichSync.mockImplementation((cmd: string) => {
        if (cmd === 'nano') return '/usr/bin/nano';
        throw new Error('not found');
      });

      expect(resolveEditor('linux')).toBe('nano');
    });

    it('falls through to vim when nano is missing', () => {
      mockedWhichSync.mockImplementation((cmd: string) => {
        if (cmd === 'nano') throw new Error('not found');
        if (cmd === 'vim') return '/usr/bin/vim';
        throw new Error('not found');
      });

      expect(resolveEditor('linux')).toBe('vim');
    });

    it('falls through to vi when nano and vim are missing', () => {
      mockedWhichSync.mockImplementation((cmd: string) => {
        if (cmd === 'vi') return '/usr/bin/vi';
        throw new Error('not found');
      });

      expect(resolveEditor('darwin')).toBe('vi');
    });

    it('throws actionable error when no Unix candidate resolves', () => {
      mockedWhichSync.mockImplementation(() => {
        throw new Error('not found');
      });

      expect(() => resolveEditor('darwin')).toThrow(EDITOR_NOT_FOUND_MESSAGE);
    });
  });

  describe('default platform', () => {
    it('falls back to process.platform when no platform is provided', () => {
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
