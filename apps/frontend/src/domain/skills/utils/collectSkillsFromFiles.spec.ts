import {
  collectSkillsFromFiles,
  MAX_FILES_PER_SKILL,
  MAX_FILE_SIZE_BYTES,
  MAX_TOTAL_SIZE_BYTES,
} from './collectSkillsFromFiles';

/**
 * Builds a File the way a directory picker would hand it over: the browser puts
 * the path relative to the picked folder on `webkitRelativePath` and leaves
 * `name` as the bare file name. `size` is stubbed so the limit tests do not have
 * to allocate megabytes of content.
 */
function pickedFile(relativePath: string, size = 10): File {
  const name = relativePath.split('/').pop() as string;
  const file = new File(['x'], name, { type: 'text/markdown' });
  Object.defineProperty(file, 'webkitRelativePath', {
    value: relativePath,
    configurable: true,
  });
  Object.defineProperty(file, 'size', { value: size, configurable: true });
  return file;
}

describe('collectSkillsFromFiles', () => {
  describe('when several skill directories are selected', () => {
    const files = [
      pickedFile('skills/documentation/SKILL.md'),
      pickedFile('skills/documentation/reference.md'),
      pickedFile('skills/onboarding/SKILL.md'),
    ];

    it('returns one skill per directory', () => {
      expect(collectSkillsFromFiles(files).map((skill) => skill.name)).toEqual([
        'documentation',
        'onboarding',
      ]);
    });

    it('groups every file of a skill together', () => {
      expect(collectSkillsFromFiles(files)[0].files).toHaveLength(2);
    });

    it('sums the size of the grouped files', () => {
      expect(collectSkillsFromFiles(files)[0].totalSize).toBe(20);
    });

    it('reports no validation error', () => {
      expect(collectSkillsFromFiles(files)[0].validationError).toBeUndefined();
    });
  });

  describe('when the selected directory is itself the skill', () => {
    const files = [
      pickedFile('documentation/SKILL.md'),
      pickedFile('documentation/reference.md'),
    ];

    it('names the skill after that directory', () => {
      expect(collectSkillsFromFiles(files).map((skill) => skill.name)).toEqual([
        'documentation',
      ]);
    });

    it('reports no validation error', () => {
      expect(collectSkillsFromFiles(files)[0].validationError).toBeUndefined();
    });
  });

  describe('when a skill has files in subdirectories', () => {
    const files = [
      pickedFile('skills/documentation/SKILL.md'),
      pickedFile('skills/documentation/references/guide.md'),
      pickedFile('skills/documentation/scripts/run.sh'),
    ];

    it('does not turn a subdirectory into its own skill', () => {
      expect(collectSkillsFromFiles(files).map((skill) => skill.name)).toEqual([
        'documentation',
      ]);
    });

    it('keeps each path relative to the skill directory', () => {
      expect(
        collectSkillsFromFiles(files)[0].files.map((f) => f.relativePath),
      ).toEqual(['SKILL.md', 'references/guide.md', 'scripts/run.sh']);
    });
  });

  describe('when two skill directories share the same name', () => {
    const files = [
      pickedFile('a/documentation/SKILL.md'),
      pickedFile('b/documentation/SKILL.md'),
    ];

    it('keeps them as separate skills', () => {
      expect(collectSkillsFromFiles(files)).toHaveLength(2);
    });

    it('does not merge their files', () => {
      expect(collectSkillsFromFiles(files)[0].files).toHaveLength(1);
    });
  });

  describe('when a directory has no SKILL.md', () => {
    it('reports the skill as invalid', () => {
      const result = collectSkillsFromFiles([
        pickedFile('skills/broken/readme.md'),
      ]);

      expect(result[0].validationError).toBe('SKILL.md is missing');
    });

    it('still names the skill after the directory', () => {
      const result = collectSkillsFromFiles([
        pickedFile('skills/broken/readme.md'),
      ]);

      expect(result[0].name).toBe('broken');
    });

    it('does not affect a valid skill in the same selection', () => {
      const result = collectSkillsFromFiles([
        pickedFile('skills/documentation/SKILL.md'),
        pickedFile('skills/broken/readme.md'),
      ]);

      expect(
        result.find((s) => s.name === 'documentation')?.validationError,
      ).toBeUndefined();
    });
  });

  describe('when a single file exceeds the maximum file size', () => {
    it('reports the skill as invalid', () => {
      const result = collectSkillsFromFiles([
        pickedFile('skills/big/SKILL.md', MAX_FILE_SIZE_BYTES + 1),
      ]);

      expect(result[0].validationError).toContain('exceeds');
    });

    it('names the offending file', () => {
      const result = collectSkillsFromFiles([
        pickedFile('skills/big/SKILL.md'),
        pickedFile('skills/big/huge.bin', MAX_FILE_SIZE_BYTES + 1),
      ]);

      expect(result[0].validationError).toContain('huge.bin');
    });
  });

  describe('when the files together exceed the maximum total size', () => {
    it('reports the skill as invalid', () => {
      const result = collectSkillsFromFiles([
        pickedFile('skills/big/SKILL.md', MAX_TOTAL_SIZE_BYTES / 2),
        pickedFile('skills/big/extra.md', MAX_TOTAL_SIZE_BYTES / 2 + 1),
      ]);

      expect(result[0].validationError).toContain('total');
    });
  });

  describe('when a skill has more than the maximum number of files', () => {
    it('reports the skill as invalid', () => {
      const files = [pickedFile('skills/many/SKILL.md')];
      for (let i = 0; i < MAX_FILES_PER_SKILL; i++) {
        files.push(pickedFile(`skills/many/file-${i}.md`));
      }

      expect(collectSkillsFromFiles(files)[0].validationError).toContain(
        String(MAX_FILES_PER_SKILL),
      );
    });
  });

  describe('when the selection is empty', () => {
    it('returns no skills', () => {
      expect(collectSkillsFromFiles([])).toEqual([]);
    });
  });

  describe('when the selection contains blacklisted files', () => {
    it('ignores .DS_Store', () => {
      const result = collectSkillsFromFiles([
        pickedFile('skills/documentation/SKILL.md'),
        pickedFile('skills/documentation/.DS_Store'),
      ]);

      expect(result[0].files).toHaveLength(1);
    });

    it('ignores anything under node_modules', () => {
      const result = collectSkillsFromFiles([
        pickedFile('skills/documentation/SKILL.md'),
        pickedFile('skills/documentation/node_modules/pkg/index.js'),
      ]);

      expect(result[0].files).toHaveLength(1);
    });
  });

  describe('when a file has no directory above it', () => {
    it('ignores it, since there is no skill name to derive', () => {
      expect(collectSkillsFromFiles([pickedFile('SKILL.md')])).toEqual([]);
    });
  });
});
