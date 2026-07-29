import { DetectedSkill } from './collectSkillsFromFiles';
import { readDeclaredSkillName } from './readDeclaredSkillName';

function skillWithManifest(content: string): DetectedSkill {
  return {
    name: 'folder-name',
    files: [
      { relativePath: 'SKILL.md', file: new File([content], 'SKILL.md') },
    ],
    totalSize: content.length,
  };
}

describe('readDeclaredSkillName', () => {
  describe('when the frontmatter declares a name', () => {
    it('returns it', async () => {
      const name = await readDeclaredSkillName(
        skillWithManifest(
          '---\nname: declared-beta\ndescription: A skill.\n---\n\nBody.\n',
        ),
      );

      expect(name).toBe('declared-beta');
    });

    it('reads it regardless of field order', async () => {
      const name = await readDeclaredSkillName(
        skillWithManifest(
          '---\ndescription: A skill.\nname: declared-beta\n---\n\nBody.\n',
        ),
      );

      expect(name).toBe('declared-beta');
    });

    it('unquotes a quoted value', async () => {
      const name = await readDeclaredSkillName(
        skillWithManifest('---\nname: "declared-beta"\n---\n\nBody.\n'),
      );

      expect(name).toBe('declared-beta');
    });

    it('trims surrounding whitespace', async () => {
      const name = await readDeclaredSkillName(
        skillWithManifest('---\nname:    declared-beta   \n---\n\nBody.\n'),
      );

      expect(name).toBe('declared-beta');
    });

    it('reads it from CRLF content', async () => {
      const name = await readDeclaredSkillName(
        skillWithManifest('---\r\nname: declared-beta\r\n---\r\n\r\nBody.\r\n'),
      );

      expect(name).toBe('declared-beta');
    });

    it('does not confuse a name in the body for the declared one', async () => {
      const name = await readDeclaredSkillName(
        skillWithManifest(
          '---\nname: declared-beta\n---\n\nname: not-this-one\n',
        ),
      );

      expect(name).toBe('declared-beta');
    });
  });

  describe('when there is no name to read', () => {
    it('returns nothing for frontmatter without a name', async () => {
      const name = await readDeclaredSkillName(
        skillWithManifest('---\ndescription: A skill.\n---\n\nBody.\n'),
      );

      expect(name).toBeUndefined();
    });

    it('returns nothing for a manifest with no frontmatter', async () => {
      const name = await readDeclaredSkillName(
        skillWithManifest('# just a heading\n'),
      );

      expect(name).toBeUndefined();
    });

    it('returns nothing for an unterminated frontmatter block', async () => {
      const name = await readDeclaredSkillName(
        skillWithManifest('---\nname: declared-beta\n\nBody.\n'),
      );

      expect(name).toBeUndefined();
    });

    it('returns nothing for an empty manifest', async () => {
      const name = await readDeclaredSkillName(skillWithManifest(''));

      expect(name).toBeUndefined();
    });

    it('returns nothing for an empty name', async () => {
      const name = await readDeclaredSkillName(
        skillWithManifest('---\nname: "   "\n---\n\nBody.\n'),
      );

      expect(name).toBeUndefined();
    });

    it('returns nothing for malformed YAML', async () => {
      const name = await readDeclaredSkillName(
        skillWithManifest('---\nname: [unclosed\n---\n\nBody.\n'),
      );

      expect(name).toBeUndefined();
    });

    it('returns nothing for a non-string name', async () => {
      const name = await readDeclaredSkillName(
        skillWithManifest('---\nname: 42\n---\n\nBody.\n'),
      );

      expect(name).toBeUndefined();
    });
  });

  describe('when the skill has no SKILL.md', () => {
    it('returns nothing', async () => {
      const name = await readDeclaredSkillName({
        name: 'broken',
        files: [
          { relativePath: 'readme.md', file: new File(['x'], 'readme.md') },
        ],
        totalSize: 1,
      });

      expect(name).toBeUndefined();
    });
  });
});
