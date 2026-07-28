/**
 * Minimal shape of the non-standard File and Directory Entries API. Typed
 * structurally because the DOM lib types for it are still prefixed and
 * inconsistent across browsers.
 */
type FileSystemEntryLike = {
  isFile: boolean;
  isDirectory: boolean;
  /** Absolute path from the drop root, e.g. `/documentation/references/guide.md`. */
  fullPath: string;
  file?: (cb: (file: File) => void, err: (e: unknown) => void) => void;
  createReader?: () => {
    readEntries: (
      cb: (entries: FileSystemEntryLike[]) => void,
      err: (e: unknown) => void,
    ) => void;
  };
};

const readFile = (entry: FileSystemEntryLike): Promise<File> =>
  new Promise((resolve, reject) => {
    entry.file?.((file) => {
      // Stamped so collectSkillsFromFiles can group dropped files exactly the
      // way it groups files chosen through the directory picker.
      Object.defineProperty(file, 'webkitRelativePath', {
        value: entry.fullPath.replace(/^\/+/, ''),
        configurable: true,
      });
      resolve(file);
    }, reject);
  });

const readDirectory = (
  entry: FileSystemEntryLike,
): Promise<FileSystemEntryLike[]> =>
  new Promise((resolve, reject) => {
    const reader = entry.createReader?.();
    if (!reader) {
      resolve([]);
      return;
    }

    // The reader hands back a bounded batch per call (100 entries in Chrome),
    // so it has to be drained until it returns an empty one.
    const all: FileSystemEntryLike[] = [];
    const readBatch = () => {
      reader.readEntries((entries) => {
        if (entries.length === 0) {
          resolve(all);
          return;
        }
        all.push(...entries);
        readBatch();
      }, reject);
    };
    readBatch();
  });

const walk = async (entry: FileSystemEntryLike): Promise<File[]> => {
  if (entry.isFile) {
    return [await readFile(entry)];
  }
  if (entry.isDirectory) {
    const children = await readDirectory(entry);
    const nested = await Promise.all(children.map(walk));
    return nested.flat();
  }
  return [];
};

/**
 * Flattens the items of a drop event into the files they contain, recursing
 * through dropped folders.
 */
export async function readDroppedEntries(
  items: DataTransferItemList,
): Promise<File[]> {
  // Array.from, not spread: DataTransferItemList is array-like but not reliably
  // iterable. And the entries have to be taken synchronously — the item list is
  // invalidated once the drop handler yields.
  const entries = Array.from(items)
    .map((item) => item.webkitGetAsEntry() as FileSystemEntryLike | null)
    .filter((entry): entry is FileSystemEntryLike => entry !== null);

  const collected = await Promise.all(entries.map(walk));
  return collected.flat();
}
