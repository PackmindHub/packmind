import { parseLenientStandard } from './parseLenientStandard';

describe('parseLenientStandard', () => {
  describe('when content is empty or whitespace-only', () => {
    it('returns null for empty string', () => {
      const result = parseLenientStandard('', 'my-standard.md');

      expect(result).toBeNull();
    });

    it('returns null for whitespace-only content', () => {
      const result = parseLenientStandard('   \n  \n  ', 'my-standard.md');

      expect(result).toBeNull();
    });
  });

  describe('when first non-empty line starts with # heading', () => {
    it('uses heading text as name and remaining content as description', () => {
      const content = '# My Standard\n\nSome description here';

      const result = parseLenientStandard(content, 'my-standard.md');

      expect(result).toEqual({
        name: 'My Standard',
        description: 'Some description here',
      });
    });

    it('trims whitespace from name and description', () => {
      const content = '#   Spaced Name   \n\n  Description with spaces  \n';

      const result = parseLenientStandard(content, 'my-standard.md');

      expect(result).toEqual({
        name: 'Spaced Name',
        description: 'Description with spaces',
      });
    });

    it('handles heading with empty description', () => {
      const content = '# Just a Name\n';

      const result = parseLenientStandard(content, 'my-standard.md');

      expect(result).toEqual({
        name: 'Just a Name',
        description: '',
      });
    });

    it('skips leading blank lines before heading', () => {
      const content = '\n\n# My Standard\n\nDescription';

      const result = parseLenientStandard(content, 'my-standard.md');

      expect(result).toEqual({
        name: 'My Standard',
        description: 'Description',
      });
    });

    it('preserves multi-line description', () => {
      const content = '# My Standard\n\nLine one\nLine two\n\nLine three';

      const result = parseLenientStandard(content, 'my-standard.md');

      expect(result).toEqual({
        name: 'My Standard',
        description: 'Line one\nLine two\n\nLine three',
      });
    });
  });

  describe('when no heading is present', () => {
    it('uses filename stem as name and full content as description', () => {
      const content = 'Just some content without a heading';

      const result = parseLenientStandard(content, 'my-standard.md');

      expect(result).toEqual({
        name: 'my-standard',
        description: 'Just some content without a heading',
      });
    });

    it('extracts stem from file path with directories', () => {
      const content = 'Some content';

      const result = parseLenientStandard(content, '/path/to/cool-standard.md');

      expect(result).toEqual({
        name: 'cool-standard',
        description: 'Some content',
      });
    });

    it('handles file without extension', () => {
      const content = 'Some content';

      const result = parseLenientStandard(content, 'my-standard');

      expect(result).toEqual({
        name: 'my-standard',
        description: 'Some content',
      });
    });

    it('trims content used as description', () => {
      const content = '  \n  Some content  \n  ';

      const result = parseLenientStandard(content, 'my-standard.md');

      expect(result).toEqual({
        name: 'my-standard',
        description: 'Some content',
      });
    });
  });
});
