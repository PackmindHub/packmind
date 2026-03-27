import { stripFrontmatter } from './stripFrontmatter';

describe('stripFrontmatter', () => {
  describe('when content has standard frontmatter', () => {
    it('returns body only', () => {
      const content = `---\ndescription: 'My command'\nagent: 'agent'\n---\n\nThis is the body`;

      expect(stripFrontmatter(content)).toBe('This is the body');
    });
  });

  describe('when content has no frontmatter', () => {
    it('returns content as-is', () => {
      const content = 'Just some plain content';

      expect(stripFrontmatter(content)).toBe('Just some plain content');
    });
  });

  describe('when content has frontmatter but no body', () => {
    it('returns empty string', () => {
      const content = `---\ndescription: 'My command'\n---\n`;

      expect(stripFrontmatter(content)).toBe('');
    });
  });

  describe('when content has --- inside body but not at start', () => {
    it('returns content as-is', () => {
      const content = 'Some text\n---\nMore text';

      expect(stripFrontmatter(content)).toBe('Some text\n---\nMore text');
    });
  });

  describe('when frontmatter has no closing delimiter', () => {
    it('returns content as-is', () => {
      const content = `---\ndescription: 'unclosed'\nno closing`;

      expect(stripFrontmatter(content)).toBe(content);
    });
  });

  describe('when content is empty', () => {
    it('returns empty string', () => {
      expect(stripFrontmatter('')).toBe('');
    });
  });

  describe('when content starts with --- but no newline after', () => {
    it('returns content as-is', () => {
      const content = '---something';

      expect(stripFrontmatter(content)).toBe('---something');
    });
  });

  describe('when content has CRLF line endings', () => {
    it('strips frontmatter correctly', () => {
      const content = `---\r\ndescription: 'My command'\r\nagent: 'agent'\r\n---\r\n\r\nThis is the body`;

      expect(stripFrontmatter(content)).toBe('This is the body');
    });
  });
});
