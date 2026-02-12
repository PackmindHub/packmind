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

  describe('when content has multiline frontmatter fields', () => {
    it('returns body only', () => {
      const content = `---\ndescription: |\n  This is a long\n  multiline description\nagent: 'agent'\n---\n\nBody content here`;

      expect(stripFrontmatter(content)).toBe('Body content here');
    });
  });

  describe('when frontmatter has no closing delimiter', () => {
    it('returns content as-is', () => {
      const content = `---\ndescription: 'unclosed'\nno closing`;

      expect(stripFrontmatter(content)).toBe(content);
    });
  });
});
