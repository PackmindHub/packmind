import { resolveArtefactFromPath } from './resolveArtefactFromPath';

describe('resolveArtefactFromPath', () => {
  describe('when path matches a known command pattern', () => {
    it('returns command for Claude (.claude/commands/)', () => {
      const result = resolveArtefactFromPath('.claude/commands/my-command.md');
      expect(result).toEqual({ artifactType: 'command' });
    });

    it('returns command for Cursor (.cursor/commands/)', () => {
      const result = resolveArtefactFromPath('.cursor/commands/my-command.md');
      expect(result).toEqual({ artifactType: 'command' });
    });

    it('returns command for Copilot (.github/prompts/)', () => {
      const result = resolveArtefactFromPath(
        '.github/prompts/my-prompt.prompt.md',
      );
      expect(result).toEqual({ artifactType: 'command' });
    });

    it('returns command for Continue (.continue/prompts/)', () => {
      const result = resolveArtefactFromPath('.continue/prompts/my-prompt.md');
      expect(result).toEqual({ artifactType: 'command' });
    });

    it('returns command for Packmind (.packmind/commands/)', () => {
      const result = resolveArtefactFromPath(
        '.packmind/commands/my-command.md',
      );
      expect(result).toEqual({ artifactType: 'command' });
    });
  });

  describe('when path is absolute', () => {
    it('matches Unix absolute paths', () => {
      const result = resolveArtefactFromPath(
        '/home/user/project/.claude/commands/review.md',
      );
      expect(result).toEqual({ artifactType: 'command' });
    });

    it('matches Windows absolute paths', () => {
      const result = resolveArtefactFromPath(
        'C:\\Users\\user\\project\\.cursor\\commands\\review.md',
      );
      expect(result).toEqual({ artifactType: 'command' });
    });
  });

  describe('when path uses Windows backslashes', () => {
    it('normalizes backslashes and matches', () => {
      const result = resolveArtefactFromPath(
        '.claude\\commands\\my-command.md',
      );
      expect(result).toEqual({ artifactType: 'command' });
    });

    it('handles mixed separators', () => {
      const result = resolveArtefactFromPath(
        'project/.github\\prompts\\my-prompt.prompt.md',
      );
      expect(result).toEqual({ artifactType: 'command' });
    });
  });

  describe('when path does not match any known pattern', () => {
    it('returns null for an unrelated file', () => {
      const result = resolveArtefactFromPath('src/index.ts');
      expect(result).toBeNull();
    });

    it('returns null for a partial pattern match', () => {
      const result = resolveArtefactFromPath('.claude/rules/my-rule.md');
      expect(result).toBeNull();
    });

    it('returns null for an empty string', () => {
      const result = resolveArtefactFromPath('');
      expect(result).toBeNull();
    });

    it('returns null for a directory name that looks similar', () => {
      const result = resolveArtefactFromPath(
        '.not-claude/commands/something.md',
      );
      expect(result).toBeNull();
    });
  });
});
