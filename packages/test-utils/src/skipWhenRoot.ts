/**
 * Returns true when the current process runs as root (uid 0).
 *
 * Tests that rely on filesystem permission enforcement (e.g. `chmod 0o000` to
 * make a file unreadable) are no-ops under root, which bypasses permission
 * bits. Such tests pass locally (non-root) but fail spuriously in container/CI
 * environments that run as root. Gate them with this helper:
 *
 *     (skipWhenRoot() ? it.skip : it)('throws when unreadable', async () => {
 *       // ...
 *     });
 *
 * `process.getuid` is undefined on Windows, where this returns false.
 */
export function skipWhenRoot(): boolean {
  return typeof process.getuid === 'function' && process.getuid() === 0;
}
