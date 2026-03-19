import { resolveArtefactFromPath } from './resolveArtefactFromPath';

describe('resolveArtefactFromPath', () => {
  describe('when path matches a known command pattern', () => {
    it('returns command for Claude (.claude/commands/)', () => {
      const result = resolveArtefactFromPath('.claude/commands/my-command.md');
      expect(result).toEqual({
        artifactType: 'command',
        codingAgent: 'claude',
      });
    });

    it('returns command for Cursor (.cursor/commands/)', () => {
      const result = resolveArtefactFromPath('.cursor/commands/my-command.md');
      expect(result).toEqual({
        artifactType: 'command',
        codingAgent: 'cursor',
      });
    });

    it('returns command for Copilot (.github/prompts/)', () => {
      const result = resolveArtefactFromPath(
        '.github/prompts/my-prompt.prompt.md',
      );
      expect(result).toEqual({
        artifactType: 'command',
        codingAgent: 'copilot',
      });
    });

    it('returns command for Continue (.continue/prompts/)', () => {
      const result = resolveArtefactFromPath('.continue/prompts/my-prompt.md');
      expect(result).toEqual({
        artifactType: 'command',
        codingAgent: 'continue',
      });
    });

    it('returns command for Packmind (.packmind/commands/)', () => {
      const result = resolveArtefactFromPath(
        '.packmind/commands/my-command.md',
      );
      expect(result).toEqual({
        artifactType: 'command',
        codingAgent: 'packmind',
      });
    });
  });

  describe('when path is absolute', () => {
    it('matches Unix absolute paths', () => {
      const result = resolveArtefactFromPath(
        '/home/user/project/.claude/commands/review.md',
      );
      expect(result).toEqual({
        artifactType: 'command',
        codingAgent: 'claude',
      });
    });

    it('matches Windows absolute paths', () => {
      const result = resolveArtefactFromPath(
        'C:\\Users\\user\\project\\.cursor\\commands\\review.md',
      );
      expect(result).toEqual({
        artifactType: 'command',
        codingAgent: 'cursor',
      });
    });
  });

  describe('when path uses Windows backslashes', () => {
    it('normalizes backslashes and matches', () => {
      const result = resolveArtefactFromPath(
        '.claude\\commands\\my-command.md',
      );
      expect(result).toEqual({
        artifactType: 'command',
        codingAgent: 'claude',
      });
    });

    it('handles mixed separators', () => {
      const result = resolveArtefactFromPath(
        'project/.github\\prompts\\my-prompt.prompt.md',
      );
      expect(result).toEqual({
        artifactType: 'command',
        codingAgent: 'copilot',
      });
    });
  });

  describe('when path matches a known standard pattern', () => {
    it('returns standard for Claude (.claude/rules/packmind/)', () => {
      const result = resolveArtefactFromPath(
        '.claude/rules/packmind/standard-ts.md',
      );
      expect(result).toEqual({
        artifactType: 'standard',
        codingAgent: 'claude',
      });
    });

    it('returns standard for Cursor (.cursor/rules/packmind/)', () => {
      const result = resolveArtefactFromPath(
        '.cursor/rules/packmind/standard-ts.md',
      );
      expect(result).toEqual({
        artifactType: 'standard',
        codingAgent: 'cursor',
      });
    });

    it('returns standard for Copilot (.github/instructions/)', () => {
      const result = resolveArtefactFromPath(
        '.github/instructions/packmind-standard.md',
      );
      expect(result).toEqual({
        artifactType: 'standard',
        codingAgent: 'copilot',
      });
    });

    it('returns standard for Continue (.continue/rules/packmind/)', () => {
      const result = resolveArtefactFromPath(
        '.continue/rules/packmind/standard-ts.md',
      );
      expect(result).toEqual({
        artifactType: 'standard',
        codingAgent: 'continue',
      });
    });

    it('returns standard for Packmind (.packmind/standards/)', () => {
      const result = resolveArtefactFromPath(
        '.packmind/standards/my-standard.md',
      );
      expect(result).toEqual({
        artifactType: 'standard',
        codingAgent: 'packmind',
      });
    });

    it('returns standard for Claude (.claude/rules/) without packmind/ subdir', () => {
      const result = resolveArtefactFromPath('.claude/rules/my-rule.md');
      expect(result).toEqual({
        artifactType: 'standard',
        codingAgent: 'claude',
      });
    });
  });

  describe('when standard path is absolute', () => {
    it('matches Unix absolute paths', () => {
      const result = resolveArtefactFromPath(
        '/home/user/project/.packmind/standards/my-standard.md',
      );
      expect(result).toEqual({
        artifactType: 'standard',
        codingAgent: 'packmind',
      });
    });

    it('matches Windows absolute paths', () => {
      const result = resolveArtefactFromPath(
        'C:\\Users\\user\\project\\.claude\\rules\\packmind\\standard-ts.md',
      );
      expect(result).toEqual({
        artifactType: 'standard',
        codingAgent: 'claude',
      });
    });
  });

  describe('when path matches a known skill pattern', () => {
    it('returns skill for Claude (.claude/skills/)', () => {
      const result = resolveArtefactFromPath(
        '.claude/skills/my-skill/SKILL.md',
      );
      expect(result).toEqual({
        artifactType: 'skill',
        codingAgent: 'claude',
      });
    });

    it('returns skill for Cursor (.cursor/skills/)', () => {
      const result = resolveArtefactFromPath(
        '.cursor/skills/my-skill/SKILL.md',
      );
      expect(result).toEqual({
        artifactType: 'skill',
        codingAgent: 'cursor',
      });
    });

    it('returns skill for Copilot (.github/skills/)', () => {
      const result = resolveArtefactFromPath(
        '.github/skills/my-skill/SKILL.md',
      );
      expect(result).toEqual({
        artifactType: 'skill',
        codingAgent: 'copilot',
      });
    });

    it('matches directory paths without SKILL.md', () => {
      const result = resolveArtefactFromPath('.claude/skills/my-skill/');
      expect(result).toEqual({
        artifactType: 'skill',
        codingAgent: 'claude',
      });
    });

    it('does not match Continue (empty skill path)', () => {
      const result = resolveArtefactFromPath(
        '.continue/skills/my-skill/SKILL.md',
      );
      expect(result).toBeNull();
    });

    it('does not match Packmind (empty skill path)', () => {
      const result = resolveArtefactFromPath(
        '.packmind/skills/my-skill/SKILL.md',
      );
      expect(result).toBeNull();
    });

    it('returns skill for GitLab Duo (.gitlab/duo/skills/)', () => {
      const result = resolveArtefactFromPath(
        '.gitlab/duo/skills/some-skill/SKILL.md',
      );
      expect(result).toEqual({
        artifactType: 'skill',
        codingAgent: 'gitlab_duo',
      });
    });
  });

  describe('when skill path is absolute', () => {
    it('matches Unix absolute paths', () => {
      const result = resolveArtefactFromPath(
        '/home/user/project/.claude/skills/my-skill/SKILL.md',
      );
      expect(result).toEqual({
        artifactType: 'skill',
        codingAgent: 'claude',
      });
    });

    it('matches Windows absolute paths', () => {
      const result = resolveArtefactFromPath(
        'C:\\Users\\user\\project\\.cursor\\skills\\my-skill\\SKILL.md',
      );
      expect(result).toEqual({
        artifactType: 'skill',
        codingAgent: 'cursor',
      });
    });
  });

  describe('when gitlab_duo has empty command/standard paths', () => {
    it('does not match gitlab_duo for commands', () => {
      const result = resolveArtefactFromPath(
        '.gitlab/duo/commands/some-command.md',
      );
      expect(result).toBeNull();
    });

    it('does not match gitlab_duo for standards', () => {
      const result = resolveArtefactFromPath(
        '.gitlab/duo/standards/some-standard.md',
      );
      expect(result).toBeNull();
    });
  });

  describe('when path does not match any known pattern', () => {
    it('returns null for an unrelated file', () => {
      const result = resolveArtefactFromPath('src/index.ts');
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
