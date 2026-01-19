import { normalizePath, pathStartsWith } from './pathUtils';

describe('pathUtils', () => {
  describe('normalizePath', () => {
    it('converts Windows backslashes to forward slashes', () => {
      const windowsPath = 'C:\\Users\\user\\project\\src\\file.ts';
      const result = normalizePath(windowsPath);
      expect(result).toBe('C:/Users/user/project/src/file.ts');
    });

    it('preserves Unix-style paths with forward slashes', () => {
      const unixPath = '/Users/user/project/src/file.ts';
      const result = normalizePath(unixPath);
      expect(result).toBe('/Users/user/project/src/file.ts');
    });

    it('handles mixed separators', () => {
      const mixedPath = 'C:/Users\\user/project\\src/file.ts';
      const result = normalizePath(mixedPath);
      expect(result).toBe('C:/Users/user/project/src/file.ts');
    });

    it('handles empty string', () => {
      const result = normalizePath('');
      expect(result).toBe('');
    });
  });

  describe('pathStartsWith', () => {
    describe('when file path starts with prefix', () => {
      it('returns true for Windows paths with backslashes', () => {
        const filePath = 'C:\\Users\\user\\project\\src\\file.ts';
        const prefix = 'C:\\Users\\user\\project';
        const result = pathStartsWith(filePath, prefix);
        expect(result).toBe(true);
      });

      it('returns true for Unix paths with forward slashes', () => {
        const filePath = '/Users/user/project/src/file.ts';
        const prefix = '/Users/user/project';
        const result = pathStartsWith(filePath, prefix);
        expect(result).toBe(true);
      });

      it('returns true for mixed separators', () => {
        const filePath = 'C:\\Users\\user\\project\\src\\file.ts';
        const prefix = 'C:/Users/user/project';
        const result = pathStartsWith(filePath, prefix);
        expect(result).toBe(true);
      });

      describe('when paths are identical', () => {
        it('returns true', () => {
          const path = 'C:\\Users\\user\\project';
          const result = pathStartsWith(path, path);
          expect(result).toBe(true);
        });

        it('returns true with different separators', () => {
          const filePath = 'C:\\Users\\user\\project';
          const prefix = 'C:/Users/user/project';
          const result = pathStartsWith(filePath, prefix);
          expect(result).toBe(true);
        });
      });
    });

    describe('when file path does not start with prefix', () => {
      it('returns false for different paths', () => {
        const filePath = 'C:\\Users\\user\\another\\src\\file.ts';
        const prefix = 'C:\\Users\\user\\project';
        const result = pathStartsWith(filePath, prefix);
        expect(result).toBe(false);
      });

      describe('when prefix is longer than file path', () => {
        it('returns false', () => {
          const filePath = 'C:\\Users\\user';
          const prefix = 'C:\\Users\\user\\project';
          const result = pathStartsWith(filePath, prefix);
          expect(result).toBe(false);
        });
      });

      it('returns false for partial directory name match', () => {
        const filePath = 'C:\\Users\\user\\project-other\\src\\file.ts';
        const prefix = 'C:\\Users\\user\\project';
        const result = pathStartsWith(filePath, prefix);
        expect(result).toBe(false);
      });
    });
  });
});
