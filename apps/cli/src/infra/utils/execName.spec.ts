import { isLegacyExecName, resolveExecName } from './execName';

/**
 * The runtime shapes below were measured, not guessed:
 *
 * - `bun build --compile` binary, invoked through a `packmind-cli` symlink to
 *   the real `packmind` file: `process.argv0` is the invoked path, `argv[0]` is
 *   the literal string `bun` and `argv[1]` is `/$bunfs/root/<outfile>`, where
 *   `<outfile>` is the compile-time output name from `bun-build.ts` (the
 *   shipped Linux binary embeds `/$bunfs/root/packmind-cli-linux-x64`).
 * - The same binary run as a plain runtime (`BUN_BE_BUN=1`) reports `argv[0]`
 *   as the realpath-resolved file, so invoking the `packmind` symlink still
 *   yields `.../packmind-cli` there — `argv[0]` never carries the typed name.
 * - npm bin shim: `argv0` is the runtime and `argv[1]` is the shim path.
 */
const BUNFS_ENTRY = '/$bunfs/root/packmind-cli-linux-x64';

describe('resolveExecName', () => {
  describe('when running as a compiled standalone binary', () => {
    it('reads the canonical name from argv0', () => {
      expect(
        resolveExecName(
          ['bun', BUNFS_ENTRY, 'lint'],
          '/home/dev/.packmind/bin/packmind',
        ),
      ).toBe('packmind');
    });

    it('reads the legacy name from argv0 when invoked through a symlink', () => {
      expect(
        resolveExecName(['bun', BUNFS_ENTRY, 'lint'], './packmind-cli'),
      ).toBe('packmind-cli');
    });

    it('reads the legacy name from a bare argv0', () => {
      expect(resolveExecName(['bun', BUNFS_ENTRY], 'packmind-cli')).toBe(
        'packmind-cli',
      );
    });

    it('ignores the realpath-resolved argv[0] in favour of argv0', () => {
      expect(
        resolveExecName(
          ['/home/dev/.packmind/bin/packmind-cli'],
          '/home/dev/.packmind/bin/packmind',
        ),
      ).toBe('packmind');
    });

    it('strips the Windows .exe extension', () => {
      expect(
        resolveExecName([], 'C:\\Users\\dev\\.packmind\\bin\\packmind.exe'),
      ).toBe('packmind');
    });

    it('strips the Windows .exe extension from the legacy name', () => {
      expect(
        resolveExecName([], 'C:\\Users\\dev\\.packmind\\bin\\packmind-cli.exe'),
      ).toBe('packmind-cli');
    });

    it('matches case-insensitively and returns the canonical spelling', () => {
      expect(
        resolveExecName([], 'C:\\Users\\dev\\.packmind\\bin\\PACKMIND-CLI.EXE'),
      ).toBe('packmind-cli');
    });
  });

  describe('when the embedded bunfs entrypoint carries a known name', () => {
    it('ignores a bunfs argv[1] named after the legacy executable', () => {
      expect(
        resolveExecName(
          ['bun', '/$bunfs/root/packmind-cli', 'lint'],
          '/home/dev/.packmind/bin/packmind',
        ),
      ).toBe('packmind');
    });

    it('ignores a bunfs argv[1] when argv0 is unrecognised', () => {
      expect(resolveExecName(['bun', '/$bunfs/root/packmind-cli'], 'bun')).toBe(
        'packmind',
      );
    });

    it('ignores a bunfs argv[0]', () => {
      expect(resolveExecName(['/$bunfs/root/packmind-cli'], 'bun')).toBe(
        'packmind',
      );
    });
  });

  describe('when running through an npm bin shim', () => {
    it('reads the canonical name from argv[1]', () => {
      expect(
        resolveExecName(
          ['/usr/local/bin/node', '/usr/local/bin/packmind', 'lint'],
          'node',
        ),
      ).toBe('packmind');
    });

    it('reads the legacy name from argv[1]', () => {
      expect(
        resolveExecName(
          ['/usr/local/bin/node', '/usr/local/bin/packmind-cli', 'lint'],
          'node',
        ),
      ).toBe('packmind-cli');
    });

    it('reads the name when the runtime is bun', () => {
      expect(
        resolveExecName(
          ['/home/dev/.bun/bin/bun', '/usr/local/bin/packmind'],
          'bun',
        ),
      ).toBe('packmind');
    });
  });

  describe('when the invoked name cannot be recognised', () => {
    it('falls back to the canonical name for a direct script run', () => {
      expect(
        resolveExecName(
          ['/usr/local/bin/node', '/repo/dist/apps/cli/main.cjs', 'lint'],
          'node',
        ),
      ).toBe('packmind');
    });

    it('falls back to the canonical name for a renamed binary', () => {
      expect(resolveExecName([], '/home/dev/bin/pm')).toBe('packmind');
    });

    it('falls back to the canonical name on an empty argv', () => {
      expect(resolveExecName([], '')).toBe('packmind');
    });
  });

  it('prefers argv0 over argv[0] and argv[1] when several are known names', () => {
    expect(
      resolveExecName(
        ['/home/dev/.packmind/bin/packmind', '/usr/local/bin/packmind'],
        '/home/dev/.packmind/bin/packmind-cli',
      ),
    ).toBe('packmind-cli');
  });

  it('prefers argv[0] over argv[1] when argv0 is unrecognised', () => {
    expect(
      resolveExecName(
        ['/home/dev/.packmind/bin/packmind-cli', '/usr/local/bin/packmind'],
        'node',
      ),
    ).toBe('packmind-cli');
  });
});

describe('isLegacyExecName', () => {
  it('is true when a compiled binary is invoked as packmind-cli', () => {
    expect(isLegacyExecName(['bun', BUNFS_ENTRY], './packmind-cli')).toBe(true);
  });

  it('is false when a compiled binary is invoked as packmind', () => {
    expect(
      isLegacyExecName(
        ['bun', BUNFS_ENTRY],
        '/home/dev/.packmind/bin/packmind',
      ),
    ).toBe(false);
  });

  it('is true when the npm shim is packmind-cli', () => {
    expect(
      isLegacyExecName(
        ['/usr/local/bin/node', '/usr/local/bin/packmind-cli'],
        'node',
      ),
    ).toBe(true);
  });

  it('is false when the invoked name is unknown', () => {
    expect(
      isLegacyExecName(['/usr/local/bin/node', '/repo/main.cjs'], 'node'),
    ).toBe(false);
  });
});
