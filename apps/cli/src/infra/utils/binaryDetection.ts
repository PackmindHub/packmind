import * as path from 'path';

/**
 * Known binary file extensions that should always be treated as binary.
 * This supplements the null-byte detection for files where null bytes
 * may not appear in the first 8000 bytes.
 */
export const BINARY_EXTENSIONS = new Set([
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

/**
 * Detects if a file is binary based on its extension.
 */
export function isBinaryExtension(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
}

/**
 * Detects if a buffer contains binary content using Git's algorithm:
 * A file is considered binary if it contains a null byte (0x00) in the first 8000 bytes.
 */
export function isBinaryBuffer(buffer: Buffer): boolean {
  return buffer.subarray(0, 8000).includes(0x00);
}

/**
 * Detects if a file is binary using multiple strategies:
 * 1. Check if the file extension is a known binary type
 * 2. Check for null bytes in the first 8000 bytes (Git's algorithm)
 */
export function isBinaryFile(filePath: string, buffer: Buffer): boolean {
  return isBinaryExtension(filePath) || isBinaryBuffer(buffer);
}
