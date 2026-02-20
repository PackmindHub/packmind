const DEFAULT_PERMISSIONS = 'rw-r--r--';

/**
 * Returns true when Unix-style file permissions are meaningful on the current platform.
 * Windows does not support Unix permission bits (execute, group, other).
 */
export function supportsUnixPermissions(): boolean {
  return process.platform !== 'win32';
}

/**
 * Converts a numeric file mode (from fs.stat) to a Unix-style permission string.
 * Example: 0o100755 → 'rwxr-xr-x'
 */
export function modeToPermissionString(mode: number): string {
  const perms = mode & 0o777;
  const chars = 'rwx';
  let result = '';
  for (let i = 8; i >= 0; i--) {
    result += perms & (1 << i) ? chars[(8 - i) % 3] : '-';
  }
  return result;
}

/**
 * Reads file permissions as a Unix-style string.
 * On Windows, returns a sensible default since stat.mode doesn't carry Unix permission bits.
 */
export function modeToPermissionStringOrDefault(mode: number): string {
  if (!supportsUnixPermissions()) {
    return DEFAULT_PERMISSIONS;
  }
  return modeToPermissionString(mode);
}

/**
 * Converts a Unix-style permission string back to a numeric file mode.
 * Example: 'rwxr-xr-x' → 0o755
 */
export function parsePermissionString(permString: string): number {
  let mode = 0;
  for (let i = 0; i < 9; i++) {
    if (permString[i] !== '-') {
      mode |= 1 << (8 - i);
    }
  }
  return mode;
}
