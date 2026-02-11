import { formatContentDiff } from './diffFormatter';

jest.mock('chalk', () => ({
  green: (text: string) => `[green]${text}[/green]`,
  red: (text: string) => `[red]${text}[/red]`,
}));

describe('formatContentDiff', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when content has additions', () => {
    it('returns green-prefixed added lines', () => {
      const result = formatContentDiff('', 'new line');

      expect(result.lines).toEqual(['[green]    + new line[/green]']);
    });

    it('reports hasChanges as true', () => {
      const result = formatContentDiff('', 'new line');

      expect(result.hasChanges).toBe(true);
    });
  });

  describe('when content has removals', () => {
    it('returns red-prefixed removed lines', () => {
      const result = formatContentDiff('old line', '');

      expect(result.lines).toEqual(['[red]    - old line[/red]']);
    });

    it('reports hasChanges as true', () => {
      const result = formatContentDiff('old line', '');

      expect(result.hasChanges).toBe(true);
    });
  });

  describe('when content has mixed changes', () => {
    it('returns both removed and added lines', () => {
      const result = formatContentDiff('old line\n', 'new line\n');

      expect(result.lines).toEqual([
        '[red]    - old line[/red]',
        '[green]    + new line[/green]',
      ]);
    });
  });

  describe('when content is identical', () => {
    it('returns empty lines', () => {
      const result = formatContentDiff('same content', 'same content');

      expect(result.lines).toEqual([]);
    });

    it('reports hasChanges as false', () => {
      const result = formatContentDiff('same content', 'same content');

      expect(result.hasChanges).toBe(false);
    });
  });

  describe('when content has multiline changes', () => {
    it('returns each line individually', () => {
      const result = formatContentDiff('', 'line 1\nline 2\nline 3\n');

      expect(result.lines).toEqual([
        '[green]    + line 1[/green]',
        '[green]    + line 2[/green]',
        '[green]    + line 3[/green]',
      ]);
    });
  });
});
