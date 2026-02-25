import { validateMessage, openEditorForMessage } from './editorMessage';
import * as childProcess from 'child_process';
import * as fs from 'fs';

jest.mock('child_process');
jest.mock('fs');

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

      const result = openEditorForMessage();

      expect(result).toBe('Actual message');
    });

    it('trims whitespace from result', () => {
      mockedReadFileSync.mockReturnValue('\n  My message  \n\n');

      const result = openEditorForMessage();

      expect(result).toBe('My message');
    });

    it('cleans up temp file', () => {
      mockedReadFileSync.mockReturnValue('message');

      openEditorForMessage();

      expect(mockedUnlinkSync).toHaveBeenCalledTimes(1);
    });

    it('writes template to temp file', () => {
      mockedReadFileSync.mockReturnValue('message');

      openEditorForMessage();

      expect(mockedWriteFileSync).toHaveBeenCalledWith(
        expect.stringContaining('packmind-msg-'),
        expect.stringContaining('# Enter a message'),
        'utf-8',
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

  describe('when EDITOR env variable is set', () => {
    const originalEditor = process.env.EDITOR;

    beforeEach(() => {
      process.env.EDITOR = 'nano';
      mockedSpawnSync.mockReturnValue({ status: 0 });
      mockedReadFileSync.mockReturnValue('message');
    });

    afterEach(() => {
      process.env.EDITOR = originalEditor;
    });

    it('uses the EDITOR env variable', () => {
      openEditorForMessage();

      expect(mockedSpawnSync).toHaveBeenCalledWith(
        'nano',
        expect.any(Array),
        expect.any(Object),
      );
    });
  });
});
