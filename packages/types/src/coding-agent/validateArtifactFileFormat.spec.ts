import { validateArtifactFileFormat } from './validateArtifactFileFormat';

describe('validateArtifactFileFormat', () => {
  describe('when artifact type is command', () => {
    it('accepts .md files', () => {
      expect(
        validateArtifactFileFormat('.claude/commands/foo.md', 'command'),
      ).toEqual({ valid: true });
    });

    it('accepts .prompt.md files', () => {
      expect(
        validateArtifactFileFormat('.github/prompts/foo.prompt.md', 'command'),
      ).toEqual({ valid: true });
    });

    it('accepts case-insensitive .MD', () => {
      expect(
        validateArtifactFileFormat('.claude/commands/foo.MD', 'command'),
      ).toEqual({ valid: true });
    });

    it('rejects .py files', () => {
      const result = validateArtifactFileFormat(
        '.claude/commands/foo.py',
        'command',
      );
      expect(result.valid).toBe(false);
    });

    it('rejects .txt files', () => {
      const result = validateArtifactFileFormat(
        '.claude/commands/foo.txt',
        'command',
      );
      expect(result.valid).toBe(false);
    });

    it('rejects extensionless files', () => {
      const result = validateArtifactFileFormat(
        '.claude/commands/foo',
        'command',
      );
      expect(result.valid).toBe(false);
    });
  });

  describe('when artifact type is standard', () => {
    it('accepts .md files', () => {
      expect(
        validateArtifactFileFormat('.claude/rules/foo.md', 'standard'),
      ).toEqual({ valid: true });
    });

    it('rejects .py files', () => {
      const result = validateArtifactFileFormat(
        '.packmind/standards/foo.py',
        'standard',
      );
      expect(result.valid).toBe(false);
    });
  });

  describe('when artifact type is skill', () => {
    it('returns valid for directory paths', () => {
      expect(
        validateArtifactFileFormat('.claude/skills/my-skill', 'skill'),
      ).toEqual({ valid: true });
    });

    it('returns valid even for non-.md paths', () => {
      expect(
        validateArtifactFileFormat(
          '.claude/skills/my-skill/helper.py',
          'skill',
        ),
      ).toEqual({ valid: true });
    });
  });
});
