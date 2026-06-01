import { validateMessage, openEditorForMessage } from './editorMessage';
import * as childProcess from 'child_process';
import * as fs from 'fs';
import * as resolveEditorModule from './resolveEditor';
import { EDITOR_NOT_FOUND_MESSAGE } from './resolveEditor';

jest.mock('child_process');
jest.mock('fs');
jest.mock('./resolveEditor');

describe('validateMessage', () => {
  describe('when message is valid', () => {
    it('returns valid with trimmed message', () => {
      const result = validateMessage('  Hello world  ');

      expect(result).toEqual({ valid: true, message: 'Hello world' });
    });

    it('accepts a message at exactly 1024 characters', () => {
      const message = 'a'.repeat(1024);
      const result = validateMessage(message);

      expect(result).toEqual({ valid: true, message });
    });
  });

  describe('when message is empty', () => {
    it('returns invalid for empty string', () => {
      const result = validateMessage('');

      expect(result).toEqual({
        valid: false,
        error: 'Message cannot be empty.',
      });
    });

    it('returns invalid for whitespace-only string', () => {
      const result = validateMessage('   \n\t  ');

      expect(result).toEqual({
        valid: false,
        error: 'Message cannot be empty.',
      });
    });
  });

  describe('when message exceeds max length', () => {
    it('returns invalid with character count', () => {
      const message = 'a'.repeat(1025);
      const result = validateMessage(message);

      expect(result).toEqual({
        valid: false,
        error: 'Message exceeds maximum length of 1024 characters (got 1025).',
      });
    });
  });
});

describe('openEditorForMessage', () => {
  const mockedSpawnSync = childProcess.spawnSync as jest.Mock;
  const mockedWriteFileSync = fs.writeFileSync as jest.Mock;
  const mockedReadFileSync = fs.readFileSync as jest.Mock;
  const mockedUnlinkSync = fs.unlinkSync as jest.Mock;
  const mockedResolveEditor = resolveEditorModule.resolveEditor as jest.Mock;

  beforeEach(() => {
    mockedResolveEditor.mockReturnValue('nano');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when editor exits successfully', () => {
    beforeEach(() => {
      mockedSpawnSync.mockReturnValue({ status: 0 });
    });

    it('strips comment lines from editor output', () => {
      mockedReadFileSync.mockReturnValue(
        '# This is a comment\nActual message\n# Another comment\n',
      );

      expect(openEditorForMessage()).toBe('Actual message');
    });

    it('trims whitespace from result', () => {
      mockedReadFileSync.mockReturnValue('\n  My message  \n\n');

      expect(openEditorForMessage()).toBe('My message');
    });

    it('cleans up temp file', () => {
      mockedReadFileSync.mockReturnValue('message');

      openEditorForMessage();

      expect(mockedUnlinkSync).toHaveBeenCalledTimes(1);
    });

    describe('when no prefill is given', () => {
      it('writes the default template to the temp file', () => {
        mockedReadFileSync.mockReturnValue('message');

        openEditorForMessage();

        expect(mockedWriteFileSync).toHaveBeenCalledWith(
          expect.stringContaining('packmind-msg-'),
          expect.stringContaining('# Enter a message'),
          'utf-8',
        );
      });
    });

    describe('when prefill is provided', () => {
      it('writes the prefill verbatim', () => {
        mockedReadFileSync.mockReturnValue('updated content');

        openEditorForMessage('original content\n# kept comment');

        expect(mockedWriteFileSync).toHaveBeenCalledWith(
          expect.stringContaining('packmind-msg-'),
          'original content\n# kept comment',
          'utf-8',
        );
      });
    });

    it('uses the editor returned by resolveEditor', () => {
      mockedResolveEditor.mockReturnValue('vim');
      mockedReadFileSync.mockReturnValue('message');

      openEditorForMessage();

      expect(mockedSpawnSync).toHaveBeenCalledWith(
        'vim',
        expect.any(Array),
        expect.any(Object),
      );
    });
  });

  describe('when editor exits with non-zero status', () => {
    beforeEach(() => {
      mockedSpawnSync.mockReturnValue({ status: 1 });
    });

    it('throws an error', () => {
      expect(() => openEditorForMessage()).toThrow(
        'Editor exited with status 1',
      );
    });

    it('cleans up temp file even on error', () => {
      try {
        openEditorForMessage();
      } catch {
        // expected
      }

      expect(mockedUnlinkSync).toHaveBeenCalledTimes(1);
    });
  });

  describe('when no editor can be resolved', () => {
    beforeEach(() => {
      mockedResolveEditor.mockImplementation(() => {
        throw new Error(EDITOR_NOT_FOUND_MESSAGE);
      });
    });

    it('propagates the EDITOR_NOT_FOUND_MESSAGE from the resolver', () => {
      expect(() => openEditorForMessage()).toThrow(EDITOR_NOT_FOUND_MESSAGE);
    });

    it('does not spawn the editor', () => {
      try {
        openEditorForMessage();
      } catch {
        // expected
      }

      expect(mockedSpawnSync).not.toHaveBeenCalled();
    });

    it('does not write to the filesystem', () => {
      try {
        openEditorForMessage();
      } catch {
        // expected
      }

      expect(mockedWriteFileSync).not.toHaveBeenCalled();
    });

    it('does not delete from the filesystem', () => {
      try {
        openEditorForMessage();
      } catch {
        // expected
      }

      expect(mockedUnlinkSync).not.toHaveBeenCalled();
    });
  });
});
