import { DetectedSkill } from './collectSkillsFromFiles';

export type SkillUploadFile = {
  path: string;
  content: string;
  permissions: string;
  isBase64: boolean;
};

/**
 * The browser cannot read POSIX modes, so every uploaded file gets the same
 * default the CLI falls back to on platforms without permission bits
 * (DEFAULT_PERMISSIONS in apps/cli/src/infra/utils/permissions.ts).
 */
const DEFAULT_PERMISSIONS = 'rw-r--r--';

/**
 * Git's rule, and the one the CLI applies: binary if a null byte appears in the
 * first 8000 bytes. Scanning further would make the web path classify files the
 * CLI calls text, and the same file would then be stored differently depending
 * on which client uploaded it.
 */
const BINARY_SNIFF_LENGTH = 8000;

/**
 * Mirrors BINARY_EXTENSIONS in apps/cli/src/infra/utils/binaryDetection.ts. Both
 * feed the same upload endpoint, so the two lists must stay identical — a file
 * classified as text by one client and binary by the other produces a spurious
 * new skill version on every re-upload.
 */
const BINARY_EXTENSIONS = new Set([
  // Images
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.bmp',
  '.ico',
  '.webp',
  '.tiff',
  '.tif',
  '.heic',
  '.heif',
  '.avif',
  // Documents
  '.pdf',
  // Archives
  '.zip',
  '.tar',
  '.gz',
  '.rar',
  '.7z',
  '.bz2',
  '.xz',
  // Audio
  '.mp3',
  '.wav',
  '.ogg',
  '.flac',
  '.m4a',
  '.aac',
  // Video
  '.mp4',
  '.avi',
  '.mkv',
  '.mov',
  '.webm',
  '.wmv',
  // Executables/Libraries
  '.exe',
  '.dll',
  '.so',
  '.dylib',
  // Fonts
  '.ttf',
  '.otf',
  '.woff',
  '.woff2',
  '.eot',
  // Other binary formats
  '.bin',
  '.dat',
  '.db',
  '.sqlite',
  '.sqlite3',
]);

/** Follows Node's `path.extname`, so a dotfile has no extension. */
const extensionOf = (path: string): string => {
  const base = path.split('/').pop() ?? '';
  const dot = base.lastIndexOf('.');
  return dot <= 0 ? '' : base.slice(dot).toLowerCase();
};

const isBinaryExtension = (path: string): boolean =>
  BINARY_EXTENSIONS.has(extensionOf(path));

const isBinaryContent = (bytes: Uint8Array): boolean =>
  bytes.subarray(0, BINARY_SNIFF_LENGTH).includes(0x00);

const toBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
};

/** Same as normalizeLineEndings in @packmind/node-utils, which is node-only. */
const normalizeLineEndings = (content: string): string =>
  content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

/**
 * FileReader rather than `Blob.arrayBuffer()`: the latter is a newer addition
 * that not every runtime the app is tested in provides, while FileReader is
 * available everywhere.
 */
const readAsBytes = (file: File): Promise<Uint8Array> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () =>
      reject(reader.error ?? new Error(`Could not read "${file.name}"`));
    reader.readAsArrayBuffer(file);
  });

/**
 * Reads a detected skill's files into the payload the upload endpoint expects.
 *
 * Promise.all is fine here: these are local reads with no request involved. The
 * skills themselves are still uploaded one at a time.
 */
export async function readSkillFileContents(
  skill: DetectedSkill,
): Promise<SkillUploadFile[]> {
  return Promise.all(
    skill.files.map(async ({ relativePath, file }) => {
      const bytes = await readAsBytes(file);
      const isBinary =
        isBinaryExtension(relativePath) || isBinaryContent(bytes);

      return {
        path: relativePath,
        content: isBinary
          ? toBase64(bytes)
          : normalizeLineEndings(new TextDecoder().decode(bytes)),
        permissions: DEFAULT_PERMISSIONS,
        isBase64: isBinary,
      };
    }),
  );
}
