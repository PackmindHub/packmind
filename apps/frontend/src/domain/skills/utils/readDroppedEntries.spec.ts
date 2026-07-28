import { collectSkillsFromFiles } from './collectSkillsFromFiles';
import { readDroppedEntries } from './readDroppedEntries';

/**
 * `webkitGetAsEntry` does not exist in jsdom, so these fakes stand in for the
 * real entries. `fullPath` is absolute and carries the whole path from the drop
 * root, exactly as the browser reports it — that is what the util turns into
 * `webkitRelativePath`, so faking it as a bare file name would hide a broken
 * path from the tests.
 */
type FakeEntry = {
  isFile: boolean;
  isDirectory: boolean;
  fullPath: string;
  file?: (cb: (file: File) => void) => void;
  createReader?: () => {
    readEntries: (cb: (entries: FakeEntry[]) => void) => void;
  };
};

function fileEntry(fullPath: string): FakeEntry {
  return {
    isFile: true,
    isDirectory: false,
    fullPath,
    file: (cb) => cb(new File(['x'], fullPath.split('/').pop() as string)),
  };
}

/** Hands back each batch in turn, then an empty one, as the real reader does. */
function dirEntry(fullPath: string, ...batches: FakeEntry[][]): FakeEntry {
  return {
    isFile: false,
    isDirectory: true,
    fullPath,
    createReader: () => {
      const remaining = [...batches];
      return {
        readEntries: (cb) => cb(remaining.shift() ?? []),
      };
    },
  };
}

function drop(...entries: (FakeEntry | null)[]): DataTransferItemList {
  return entries.map((entry) => ({
    webkitGetAsEntry: () => entry,
  })) as unknown as DataTransferItemList;
}

const relativePathsOf = (files: File[]): string[] =>
  files.map(
    (file) =>
      (file as File & { webkitRelativePath: string }).webkitRelativePath,
  );

describe('readDroppedEntries', () => {
  describe('when a directory is dropped', () => {
    it('returns the files it contains', async () => {
      const files = await readDroppedEntries(
        drop(
          dirEntry('/documentation', [fileEntry('/documentation/SKILL.md')]),
        ),
      );

      expect(files).toHaveLength(1);
    });

    it('stamps the path relative to the drop root on each file', async () => {
      const files = await readDroppedEntries(
        drop(
          dirEntry('/documentation', [fileEntry('/documentation/SKILL.md')]),
        ),
      );

      expect(relativePathsOf(files)).toEqual(['documentation/SKILL.md']);
    });
  });

  describe('when a directory has subdirectories', () => {
    const dropped = () =>
      drop(
        dirEntry('/documentation', [
          fileEntry('/documentation/SKILL.md'),
          dirEntry('/documentation/references', [
            fileEntry('/documentation/references/guide.md'),
          ]),
        ]),
      );

    it('returns the files from every level', async () => {
      expect(await readDroppedEntries(dropped())).toHaveLength(2);
    });

    it('keeps the nested paths intact', async () => {
      expect(relativePathsOf(await readDroppedEntries(dropped()))).toEqual([
        'documentation/SKILL.md',
        'documentation/references/guide.md',
      ]);
    });

    it('produces files that group into a single valid skill', async () => {
      const skills = collectSkillsFromFiles(
        await readDroppedEntries(dropped()),
      );

      expect(skills).toEqual([
        expect.objectContaining({ name: 'documentation' }),
      ]);
    });
  });

  describe('when the reader returns entries in several batches', () => {
    it('reads until it is handed an empty batch', async () => {
      const files = await readDroppedEntries(
        drop(
          dirEntry(
            '/documentation',
            [fileEntry('/documentation/SKILL.md')],
            [fileEntry('/documentation/reference.md')],
          ),
        ),
      );

      expect(files).toHaveLength(2);
    });
  });

  describe('when several items are dropped at once', () => {
    it('returns the files of all of them', async () => {
      const files = await readDroppedEntries(
        drop(
          dirEntry('/documentation', [fileEntry('/documentation/SKILL.md')]),
          dirEntry('/onboarding', [fileEntry('/onboarding/SKILL.md')]),
        ),
      );

      expect(relativePathsOf(files)).toEqual([
        'documentation/SKILL.md',
        'onboarding/SKILL.md',
      ]);
    });
  });

  describe('when a single file is dropped', () => {
    it('returns it', async () => {
      const files = await readDroppedEntries(drop(fileEntry('/SKILL.md')));

      expect(relativePathsOf(files)).toEqual(['SKILL.md']);
    });
  });

  describe('when the dropped directory is empty', () => {
    it('returns no files', async () => {
      expect(await readDroppedEntries(drop(dirEntry('/empty')))).toEqual([]);
    });
  });

  describe('when an item yields no entry', () => {
    it('skips it', async () => {
      expect(await readDroppedEntries(drop(null))).toEqual([]);
    });
  });

  describe('when nothing is dropped', () => {
    it('returns no files', async () => {
      expect(await readDroppedEntries(drop())).toEqual([]);
    });
  });
});
