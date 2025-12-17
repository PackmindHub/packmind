import { removeTrailingSlash } from './urlUtils';

describe('removeTrailingSlash', () => {
  describe('when URL has trailing slash', () => {
    it('removes the trailing slash', () => {
      expect(removeTrailingSlash('https://example.com/')).toBe(
        'https://example.com',
      );
    });
  });

  describe('when URL has no trailing slash', () => {
    it('returns unchanged URL', () => {
      expect(removeTrailingSlash('https://example.com')).toBe(
        'https://example.com',
      );
    });
  });

  describe('when URL has path with trailing slash', () => {
    it('removes the trailing slash', () => {
      expect(removeTrailingSlash('https://example.com/path/')).toBe(
        'https://example.com/path',
      );
    });
  });

  describe('when URL has path without trailing slash', () => {
    it('returns unchanged URL', () => {
      expect(removeTrailingSlash('https://example.com/path')).toBe(
        'https://example.com/path',
      );
    });
  });

  describe('when URL is root with trailing slash', () => {
    it('removes the trailing slash', () => {
      expect(removeTrailingSlash('https://example.com/')).toBe(
        'https://example.com',
      );
    });
  });

  describe('when URL is localhost', () => {
    describe('when URL has trailing slash', () => {
      it('removes the trailing slash', () => {
        expect(removeTrailingSlash('http://localhost:8081/')).toBe(
          'http://localhost:8081',
        );
      });
    });

    describe('when URL has no trailing slash', () => {
      it('returns unchanged URL', () => {
        expect(removeTrailingSlash('http://localhost:8081')).toBe(
          'http://localhost:8081',
        );
      });
    });
  });

  describe('when URL is empty string', () => {
    it('returns empty string', () => {
      expect(removeTrailingSlash('')).toBe('');
    });
  });

  describe('when URL is only slash', () => {
    it('returns empty string', () => {
      expect(removeTrailingSlash('/')).toBe('');
    });
  });
});
