import { parseStandardMd } from './parseStandardMd';

describe('parseStandardMd', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('extracts name and description from valid standard markdown', () => {
    const content = '# My Standard\n\nSome description\n\n## Rules\n* Rule 1';

    const result = parseStandardMd(content);

    expect(result).toEqual({
      name: 'My Standard',
      description: 'Some description',
    });
  });

  it('extracts multi-line description', () => {
    const content = '# My Standard\n\nLine one\nLine two\n\n## Rules\n* Rule 1';

    const result = parseStandardMd(content);

    expect(result).toEqual({
      name: 'My Standard',
      description: 'Line one\nLine two',
    });
  });

  describe('when no content between name and rules', () => {
    it('returns empty description', () => {
      const content = '# My Standard\n\n## Rules\n* Rule 1';

      const result = parseStandardMd(content);

      expect(result).toEqual({ name: 'My Standard', description: '' });
    });
  });

  describe('when no ## heading exists', () => {
    it('returns all remaining content as description', () => {
      const content = '# My Standard\n\nJust a description with no rules';

      const result = parseStandardMd(content);

      expect(result).toEqual({
        name: 'My Standard',
        description: 'Just a description with no rules',
      });
    });
  });

  describe('when no H1 heading found', () => {
    it('returns null', () => {
      const content = '## Only H2\n\nSome content';

      const result = parseStandardMd(content);

      expect(result).toBeNull();
    });
  });

  describe('when name has whitespace', () => {
    it('trims whitespace from name', () => {
      const content = '#   Spaced Name   \n\nDescription';

      const result = parseStandardMd(content);

      expect(result).toEqual({
        name: 'Spaced Name',
        description: 'Description',
      });
    });
  });
});
