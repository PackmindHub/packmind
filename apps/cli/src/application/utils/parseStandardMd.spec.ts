import { parseStandardMd } from './parseStandardMd';

describe('parseStandardMd', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('extracts name from valid standard markdown', () => {
    const content = '# My Standard\n\nSome description\n\n## Rules\n* Rule 1';

    const result = parseStandardMd(content);

    expect(result).toEqual({ name: 'My Standard' });
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

      expect(result).toEqual({ name: 'Spaced Name' });
    });
  });
});
