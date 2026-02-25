import { Readable } from 'stream';
import { readStdin } from './readStdin';

describe('readStdin', () => {
  describe('when input contains valid content', () => {
    it('returns the content as a trimmed string', async () => {
      const input = Readable.from(['{"name":"Test"}']);
      const result = await readStdin(input);
      expect(result).toBe('{"name":"Test"}');
    });

    it('concatenates multiple chunks', async () => {
      const input = Readable.from(['{"name":', '"Test"}']);
      const result = await readStdin(input);
      expect(result).toBe('{"name":"Test"}');
    });

    it('trims whitespace from content', async () => {
      const input = Readable.from(['  {"name":"Test"}  \n']);
      const result = await readStdin(input);
      expect(result).toBe('{"name":"Test"}');
    });
  });

  describe('when input is a TTY', () => {
    it('throws an error', async () => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const input = new Readable({ read() {} }) as Readable & {
        isTTY: boolean;
      };
      input.isTTY = true;

      await expect(readStdin(input)).rejects.toThrow(
        'No piped input detected. Please provide content via stdin or specify a file path.',
      );
    });
  });

  describe('when input is empty', () => {
    it('throws an error', async () => {
      const input = Readable.from(['']);
      await expect(readStdin(input)).rejects.toThrow(
        'Stdin is empty. Please provide JSON content via pipe.',
      );
    });

    it('throws an error for whitespace-only input', async () => {
      const input = Readable.from(['   \n  ']);
      await expect(readStdin(input)).rejects.toThrow(
        'Stdin is empty. Please provide JSON content via pipe.',
      );
    });
  });
});
