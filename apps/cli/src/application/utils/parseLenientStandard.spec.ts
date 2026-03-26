import { parseLenientStandard } from './parseLenientStandard';

describe('parseLenientStandard', () => {
  describe('when content is empty or whitespace-only', () => {
    it('returns null for empty string', () => {
      const result = parseLenientStandard('');

      expect(result).toBeNull();
    });

    it('returns null for whitespace-only content', () => {
      const result = parseLenientStandard('   \n  \n  ');

      expect(result).toBeNull();
    });
  });

  describe('when first non-empty line starts with # heading', () => {
    it('uses heading text as name and remaining content as description', () => {
      const content = '# My Standard\n\nSome description here';

      const result = parseLenientStandard(content);

      expect(result).toEqual({
        name: 'My Standard',
        description: 'Some description here',
      });
    });

    it('trims whitespace from name and description', () => {
      const content = '#   Spaced Name   \n\n  Description with spaces  \n';

      const result = parseLenientStandard(content);

      expect(result).toEqual({
        name: 'Spaced Name',
        description: 'Description with spaces',
      });
    });

    it('handles heading with empty description', () => {
      const content = '# Just a Name\n';

      const result = parseLenientStandard(content);

      expect(result).toEqual({
        name: 'Just a Name',
        description: '',
      });
    });

    it('skips leading blank lines before heading', () => {
      const content = '\n\n# My Standard\n\nDescription';

      const result = parseLenientStandard(content);

      expect(result).toEqual({
        name: 'My Standard',
        description: 'Description',
      });
    });

    it('preserves multi-line description', () => {
      const content = '# My Standard\n\nLine one\nLine two\n\nLine three';

      const result = parseLenientStandard(content);

      expect(result).toEqual({
        name: 'My Standard',
        description: 'Line one\nLine two\n\nLine three',
      });
    });
  });

  describe('when no heading is present', () => {
    it('returns null for content without a heading', () => {
      const content = 'Just some content without a heading';

      const result = parseLenientStandard(content);

      expect(result).toBeNull();
    });

    it('returns null for content with only sub-headings', () => {
      const content = '## Sub heading\n\nSome content';

      const result = parseLenientStandard(content);

      expect(result).toBeNull();
    });

    it('returns null for bullet-only content', () => {
      const content = '* rule one\n* rule two';

      const result = parseLenientStandard(content);

      expect(result).toBeNull();
    });
  });
});
