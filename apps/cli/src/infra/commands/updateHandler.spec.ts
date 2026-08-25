import {
  updateHandler,
  IUpdateHandlerDependencies,
  getPlatformAssetSuffix,
  getReleaseAssetName,
  fetchLatestVersionFromNpm,
  fetchLatestVersionFromGitHub,
  isLocalNpmPackage,
  isHomebrewInstall,
  createLegacyExecAlias,
  resolveUpdateTargetPath,
} from './updateHandler';
import * as consoleLogger from '../utils/consoleLogger';
import * as fs from 'fs';
import * as childProcess from 'child_process';
import { Writable } from 'stream';

jest.mock('../utils/consoleLogger', () => ({
  logInfoConsole: jest.fn(),
  logSuccessConsole: jest.fn(),
  logErrorConsole: jest.fn(),
  logWarningConsole: jest.fn(),
  logConsole: jest.fn(),
}));

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  realpathSync: jest.fn((p: string) => p),
  symlinkSync: jest.fn(),
  unlinkSync: jest.fn(),
  lstatSync: jest.fn(),
  statSync: jest.fn(),
  renameSync: jest.fn(),
  chmodSync: jest.fn(),
  createWriteStream: jest.fn(),
}));

// The npm-mode update shells out to `npm install -g`. Without this mock the
// suite really installed the package globally on the developer's machine,
// downgrading their CLI to whatever version the test mocked.
jest.mock('child_process', () => ({
  ...jest.requireActual('child_process'),
  execSync: jest.fn(),
}));

// A downloaded-asset response whose body streams a few bytes.
function downloadResponse(): Response {
  return {
    ok: true,
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(16));
        controller.close();
      },
    }),
  } as unknown as Response;
}

function discardingWriteStream(): Writable {
  return new Writable({
    write(_chunk, _encoding, callback) {
      callback();
    },
  });
}

const mockConsoleLogger = consoleLogger as jest.Mocked<typeof consoleLogger>;

describe('updateHandler', () => {
  let deps: IUpdateHandlerDependencies;
  let mockFetch: jest.MockedFunction<typeof fetch>;
  const processExitSpy = jest
    .spyOn(process, 'exit')
    .mockImplementation(() => undefined as never);

  beforeEach(() => {
    // clearAllMocks() keeps implementations, so a suite that makes one of these
    // throw would otherwise leak that behavior into every later suite.
    (fs.symlinkSync as jest.Mock).mockReset();
    (fs.unlinkSync as jest.Mock).mockReset();
    (fs.renameSync as jest.Mock).mockReset();
    (fs.chmodSync as jest.Mock).mockReset();
    (childProcess.execSync as jest.Mock).mockReset();

    (fs.realpathSync as jest.Mock).mockImplementation((p: string) => p);
    // Fresh install by default: nothing at the target path yet
    (fs.lstatSync as jest.Mock).mockImplementation(() => {
      throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    });
    (fs.statSync as jest.Mock).mockReturnValue({ size: 2_000_000 });
    (fs.createWriteStream as jest.Mock).mockImplementation(() =>
      discardingWriteStream(),
    );

    mockFetch = jest.fn();
    deps = {
      currentVersion: '0.18.0',
      isExecutableMode: false,
      executablePath: '/usr/local/bin/packmind-cli',
      platform: 'darwin',
      arch: 'arm64',
      fetchFn: mockFetch,
    };
  });
  afterEach(() => jest.clearAllMocks());

  describe('getPlatformAssetSuffix', () => {
    it('returns macos-arm64 for darwin arm64', () => {
      expect(getPlatformAssetSuffix('darwin', 'arm64')).toBe('macos-arm64');
    });

    it('returns macos-x64-baseline for darwin x64', () => {
      expect(getPlatformAssetSuffix('darwin', 'x64')).toBe(
        'macos-x64-baseline',
      );
    });

    it('returns linux-x64 for linux x64', () => {
      expect(getPlatformAssetSuffix('linux', 'x64')).toBe('linux-x64');
    });

    it('returns linux-arm64 for linux arm64', () => {
      expect(getPlatformAssetSuffix('linux', 'arm64')).toBe('linux-arm64');
    });

    it('returns windows-x64 for win32 x64', () => {
      expect(getPlatformAssetSuffix('win32', 'x64')).toBe('windows-x64');
    });

    it('throws for unsupported platform', () => {
      expect(() => getPlatformAssetSuffix('freebsd', 'x64')).toThrow(
        'Unsupported platform: freebsd',
      );
    });
  });

  describe('getReleaseAssetName', () => {
    // These are the names published by .github/workflows/publish-cli-release.yml
    // and downloaded by apps/cli/scripts/install.sh. They are the contract:
    // every existing install self-updates against these exact strings.
    it.each([
      ['linux', 'x64', 'packmind-cli-linux-x64-0.19.0'],
      ['linux', 'arm64', 'packmind-cli-linux-arm64-0.19.0'],
      ['darwin', 'arm64', 'packmind-cli-macos-arm64-0.19.0'],
      ['darwin', 'x64', 'packmind-cli-macos-x64-baseline-0.19.0'],
    ])('names the %s %s asset without an extension', (platform, arch, name) => {
      expect(getReleaseAssetName(platform, arch, '0.19.0')).toBe(name);
    });

    describe('on win32', () => {
      // The .exe must come LAST, after the version. Appending it to the
      // platform suffix produced `packmind-cli-windows-x64.exe-0.19.0`, which
      // is never published, so every Windows update 404'd.
      it.each([
        ['x64', 'packmind-cli-windows-x64-0.19.0.exe'],
        ['arm64', 'packmind-cli-windows-arm64-0.19.0.exe'],
      ])('puts .exe after the version for %s', (arch, name) => {
        expect(getReleaseAssetName('win32', arch, '0.19.0')).toBe(name);
      });
    });
  });

  describe('fetchLatestVersionFromNpm', () => {
    it('returns version from npm registry', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ version: '0.19.0' }),
      } as Response);

      const version = await fetchLatestVersionFromNpm(mockFetch);

      expect(version).toBe('0.19.0');
    });

    it('queries the correct npm registry URL', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ version: '0.19.0' }),
      } as Response);

      await fetchLatestVersionFromNpm(mockFetch);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://registry.npmjs.org/@packmind/cli/latest',
      );
    });

    it('throws on non-ok response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      await expect(fetchLatestVersionFromNpm(mockFetch)).rejects.toThrow(
        'Failed to fetch from npm registry: 404 Not Found',
      );
    });
  });

  describe('fetchLatestVersionFromGitHub', () => {
    it('returns the first CLI release version', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [
          { tag_name: 'release-cli/0.19.0' },
          { tag_name: 'release-app/1.2.0' },
          { tag_name: 'release-cli/0.18.0' },
        ],
      } as Response);

      const version = await fetchLatestVersionFromGitHub(mockFetch);

      expect(version).toBe('0.19.0');
    });

    describe('when no CLI release exists', () => {
      it('throws an error', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => [{ tag_name: 'release-app/1.0.0' }],
        } as Response);

        await expect(fetchLatestVersionFromGitHub(mockFetch)).rejects.toThrow(
          'No CLI release found on GitHub',
        );
      });
    });

    it('throws on non-ok response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      } as Response);

      await expect(fetchLatestVersionFromGitHub(mockFetch)).rejects.toThrow(
        'Failed to fetch from GitHub API: 403 Forbidden',
      );
    });
  });

  describe('isLocalNpmPackage', () => {
    describe('when path contains node_modules/@packmind/cli', () => {
      it('returns true', () => {
        expect(
          isLocalNpmPackage(
            '/home/user/project/node_modules/@packmind/cli/dist/main.cjs',
          ),
        ).toBe(true);
      });
    });

    it('returns false for global npm installation path', () => {
      expect(isLocalNpmPackage('/usr/local/bin/node')).toBe(false);
    });

    it('returns false for standalone executable', () => {
      expect(isLocalNpmPackage('/usr/local/bin/packmind-cli')).toBe(false);
    });

    describe('when no path is provided', () => {
      it('returns false', () => {
        expect(isLocalNpmPackage(undefined)).toBe(false);
      });
    });
  });

  describe('isHomebrewInstall', () => {
    it('returns true for macOS ARM Homebrew Cellar path', () => {
      (fs.realpathSync as jest.Mock).mockReturnValue(
        '/opt/homebrew/Cellar/packmind-cli/0.19.0/bin/packmind-cli',
      );
      expect(isHomebrewInstall('/opt/homebrew/bin/packmind-cli')).toBe(true);
    });

    it('returns true for macOS Intel Homebrew Cellar path', () => {
      (fs.realpathSync as jest.Mock).mockReturnValue(
        '/usr/local/Cellar/packmind-cli/0.19.0/bin/packmind-cli',
      );
      expect(isHomebrewInstall('/usr/local/bin/packmind-cli')).toBe(true);
    });

    it('returns false for standalone executable', () => {
      (fs.realpathSync as jest.Mock).mockReturnValue(
        '/usr/local/bin/packmind-cli',
      );
      expect(isHomebrewInstall('/usr/local/bin/packmind-cli')).toBe(false);
    });

    it('returns false for user-local executable', () => {
      (fs.realpathSync as jest.Mock).mockReturnValue(
        '/home/user/.local/bin/packmind-cli',
      );
      expect(isHomebrewInstall('/home/user/.local/bin/packmind-cli')).toBe(
        false,
      );
    });

    describe('when realpathSync throws', () => {
      it('returns false', () => {
        (fs.realpathSync as jest.Mock).mockImplementation(() => {
          throw new Error('ENOENT');
        });
        expect(isHomebrewInstall('/nonexistent/path')).toBe(false);
      });
    });
  });

  describe('Homebrew guard', () => {
    beforeEach(async () => {
      (fs.realpathSync as jest.Mock).mockReturnValue(
        '/opt/homebrew/Cellar/packmind-cli/0.19.0/bin/packmind-cli',
      );
      deps.executablePath = '/opt/homebrew/bin/packmind-cli';
      await updateHandler(deps);
    });

    it('exits with code 0', () => {
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    it('logs the brew upgrade message', () => {
      expect(mockConsoleLogger.logInfoConsole).toHaveBeenCalledWith(
        'This CLI was installed via Homebrew.\n' +
          'To update, run: brew upgrade packmind-cli',
      );
    });

    it('does not fetch', () => {
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('JS runtime guard', () => {
    describe.each(['node', 'bun', 'deno'])(
      'when executablePath is %s (non-local)',
      (runtime) => {
        beforeEach(async () => {
          deps.executablePath = `/usr/local/bin/${runtime}`;
          await updateHandler(deps);
        });

        it('exits with code 1', () => {
          expect(processExitSpy).toHaveBeenCalledWith(1);
        });

        it('logs the generic error message', () => {
          expect(mockConsoleLogger.logErrorConsole).toHaveBeenCalledWith(
            'The update command is not available when running the CLI via a JavaScript runtime.\n' +
              'To update, use the standalone executable or run: npm install -g @packmind/cli@latest',
          );
        });

        it('does not fetch', () => {
          expect(mockFetch).not.toHaveBeenCalled();
        });
      },
    );

    describe.each(['node', 'bun', 'deno'])(
      'when executablePath is %s (local npm package)',
      (runtime) => {
        beforeEach(async () => {
          deps.executablePath = `/usr/local/bin/${runtime}`;
          deps.scriptPath = `/home/user/project/node_modules/@packmind/cli/dist/main.cjs`;
          await updateHandler(deps);
        });

        it('exits with code 1', () => {
          expect(processExitSpy).toHaveBeenCalledWith(1);
        });

        it('logs the local package.json message', () => {
          expect(mockConsoleLogger.logErrorConsole).toHaveBeenCalledWith(
            'Your CLI version is managed by your local package.json.\n' +
              'To update, run: npm update @packmind/cli',
          );
        });

        it('does not fetch', () => {
          expect(mockFetch).not.toHaveBeenCalled();
        });
      },
    );

    describe('when executablePath is node.exe', () => {
      beforeEach(async () => {
        deps.executablePath = '/usr/local/bin/node.exe';
        await updateHandler(deps);
      });

      it('exits with code 1', () => {
        expect(processExitSpy).toHaveBeenCalledWith(1);
      });
    });

    describe('when executablePath is packmind-cli', () => {
      beforeEach(async () => {
        deps.executablePath = '/usr/local/bin/packmind-cli';
        deps.currentVersion = '0.19.0';
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ version: '0.19.0' }),
        } as Response);
        await updateHandler(deps);
      });

      it('does not log an error', () => {
        expect(mockConsoleLogger.logErrorConsole).not.toHaveBeenCalled();
      });
    });
  });

  describe('updateHandler - npm mode', () => {
    describe('when current version matches latest', () => {
      beforeEach(async () => {
        deps.currentVersion = '0.19.0';
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ version: '0.19.0' }),
        } as Response);

        await updateHandler(deps);
      });

      it('reports already up to date', () => {
        expect(mockConsoleLogger.logSuccessConsole).toHaveBeenCalledWith(
          'Already up to date (v0.19.0)',
        );
      });
    });

    describe('when current version is newer than latest', () => {
      beforeEach(async () => {
        deps.currentVersion = '0.20.0';
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ version: '0.19.0' }),
        } as Response);

        await updateHandler(deps);
      });

      it('reports already up to date', () => {
        expect(mockConsoleLogger.logSuccessConsole).toHaveBeenCalledWith(
          'Already up to date (v0.20.0)',
        );
      });
    });

    describe('when an update is available', () => {
      beforeEach(async () => {
        deps.isExecutableMode = false;
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ version: '0.19.0' }),
        } as Response);

        await updateHandler(deps);
      });

      it('fetches from npm registry', () => {
        expect(mockFetch).toHaveBeenCalledWith(
          'https://registry.npmjs.org/@packmind/cli/latest',
        );
      });

      it('installs the new version globally via npm', () => {
        expect(childProcess.execSync).toHaveBeenCalledWith(
          'npm install -g @packmind/cli@0.19.0',
          { stdio: 'inherit' },
        );
      });

      it('reports the update', () => {
        expect(mockConsoleLogger.logSuccessConsole).toHaveBeenCalledWith(
          'Updated to v0.19.0',
        );
      });
    });

    describe('when version check fails', () => {
      beforeEach(async () => {
        mockFetch.mockRejectedValue(new Error('Network error'));
        await updateHandler(deps);
      });

      it('exits with code 1', () => {
        expect(processExitSpy).toHaveBeenCalledWith(1);
      });

      it('logs the error message', () => {
        expect(mockConsoleLogger.logErrorConsole).toHaveBeenCalledWith(
          'Failed to check for updates: Network error',
        );
      });
    });
  });

  describe('updateHandler - check-only mode', () => {
    describe('when an update is available', () => {
      beforeEach(async () => {
        deps.checkOnly = true;
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ version: '0.19.0' }),
        } as Response);

        await updateHandler(deps);
      });

      it('logs the available version', () => {
        expect(mockConsoleLogger.logInfoConsole).toHaveBeenCalledWith(
          'New version available: 0.18.0 -> 0.19.0',
        );
      });

      it('exits with code 1', () => {
        expect(processExitSpy).toHaveBeenCalledWith(1);
      });

      it('does not attempt to update', () => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });
    });

    describe('when already up to date', () => {
      beforeEach(async () => {
        deps.checkOnly = true;
        deps.currentVersion = '0.19.0';
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ version: '0.19.0' }),
        } as Response);

        await updateHandler(deps);
      });

      it('reports already up to date', () => {
        expect(mockConsoleLogger.logSuccessConsole).toHaveBeenCalledWith(
          'Already up to date (v0.19.0)',
        );
      });
    });
  });

  describe('resolveUpdateTargetPath', () => {
    it('targets packmind next to the invoked binary', () => {
      expect(
        resolveUpdateTargetPath('/home/user/.packmind/bin/packmind', 'linux'),
      ).toBe('/home/user/.packmind/bin/packmind');
    });

    describe('when invoked under the legacy name', () => {
      it('still targets packmind', () => {
        expect(
          resolveUpdateTargetPath(
            '/home/user/.packmind/bin/packmind-cli',
            'linux',
          ),
        ).toBe('/home/user/.packmind/bin/packmind');
      });
    });

    it('appends .exe on win32', () => {
      expect(
        resolveUpdateTargetPath(
          'C:/Users/u/.packmind/bin/packmind-cli.exe',
          'win32',
        ),
      ).toBe('C:/Users/u/.packmind/bin/packmind.exe');
    });

    describe('when the binary was invoked under an unrecognised name', () => {
      // The getting-started guide presents running the downloaded asset
      // directly as a supported layout (moving it into PATH is "Optional"), so
      // this name reaches `update` in the wild. Redirecting it would write a
      // stray `packmind` and leave the invoked binary on its old version.
      it('updates the invoked binary in place', () => {
        expect(
          resolveUpdateTargetPath(
            '/home/user/Downloads/packmind-cli-linux-x64-0.33.0',
            'linux',
          ),
        ).toBe('/home/user/Downloads/packmind-cli-linux-x64-0.33.0');
      });

      it('does not append .exe on win32 either', () => {
        expect(
          resolveUpdateTargetPath(
            'C:/Users/u/Downloads/packmind-cli-windows-x64-0.33.0.exe',
            'win32',
          ),
        ).toBe('C:/Users/u/Downloads/packmind-cli-windows-x64-0.33.0.exe');
      });
    });
  });

  describe('createLegacyExecAlias', () => {
    beforeEach(() => {
      (fs.unlinkSync as jest.Mock).mockReset();
      (fs.symlinkSync as jest.Mock).mockReset();
    });

    describe('on a POSIX install', () => {
      beforeEach(() => {
        createLegacyExecAlias(
          '/home/user/.packmind/bin/packmind',
          'linux',
          '/home/user/.packmind/bin/packmind',
        );
      });

      it('stages the symlink under a temporary name', () => {
        expect(fs.symlinkSync).toHaveBeenCalledWith(
          'packmind',
          '/home/user/.packmind/bin/packmind-cli.new-alias',
        );
      });

      it('renames the staged link over packmind-cli', () => {
        expect(fs.renameSync).toHaveBeenCalledWith(
          '/home/user/.packmind/bin/packmind-cli.new-alias',
          '/home/user/.packmind/bin/packmind-cli',
        );
      });

      // The point of staging: packmind-cli is the name existing user scripts
      // call, so it must never be removed before a replacement exists.
      it('never unlinks packmind-cli itself', () => {
        expect(fs.unlinkSync).not.toHaveBeenCalledWith(
          '/home/user/.packmind/bin/packmind-cli',
        );
      });

      it('returns true', () => {
        expect(
          createLegacyExecAlias(
            '/home/user/.packmind/bin/packmind',
            'linux',
            '/home/user/.packmind/bin/packmind',
          ),
        ).toBe(true);
      });
    });

    describe('when invoked through the legacy name on POSIX', () => {
      it('still replaces packmind-cli with a symlink', () => {
        createLegacyExecAlias(
          '/home/user/.packmind/bin/packmind',
          'linux',
          '/home/user/.packmind/bin/packmind-cli',
        );

        expect(fs.renameSync).toHaveBeenCalledWith(
          '/home/user/.packmind/bin/packmind-cli.new-alias',
          '/home/user/.packmind/bin/packmind-cli',
        );
      });
    });

    describe('on win32', () => {
      it('uses the .exe extension', () => {
        createLegacyExecAlias(
          'C:/bin/packmind.exe',
          'win32',
          'C:/bin/packmind.exe',
        );

        expect(fs.symlinkSync).toHaveBeenCalledWith(
          'packmind.exe',
          'C:/bin/packmind-cli.exe.new-alias',
        );
      });
    });

    describe('when the legacy binary is the running executable on win32', () => {
      beforeEach(() => {
        createLegacyExecAlias(
          'C:/bin/packmind.exe',
          'win32',
          'C:\\bin\\packmind-cli.exe',
        );
      });

      it('does not remove the running executable', () => {
        expect(fs.unlinkSync).not.toHaveBeenCalled();
      });

      it('does not create the alias', () => {
        expect(fs.symlinkSync).not.toHaveBeenCalled();
      });

      it('tells the user how to finish the switch', () => {
        expect(mockConsoleLogger.logInfoConsole).toHaveBeenCalledWith(
          expect.stringContaining(
            'Windows cannot replace a running executable',
          ),
        );
      });

      it('reports that the alias was not created', () => {
        expect(
          createLegacyExecAlias(
            'C:/bin/packmind.exe',
            'win32',
            'C:\\bin\\packmind-cli.exe',
          ),
        ).toBe(false);
      });
    });

    describe('when unlink throws (no leftover staged link)', () => {
      beforeEach(() => {
        (fs.unlinkSync as jest.Mock).mockImplementation(() => {
          throw new Error('ENOENT');
        });
      });

      it('does not fail', () => {
        expect(() =>
          createLegacyExecAlias('/usr/local/bin/packmind', 'linux'),
        ).not.toThrow();
      });

      it('still creates the alias', () => {
        createLegacyExecAlias('/usr/local/bin/packmind', 'linux');

        expect(fs.symlinkSync).toHaveBeenCalled();
      });
    });

    describe('when symlink creation fails', () => {
      beforeEach(() => {
        (fs.symlinkSync as jest.Mock).mockImplementation(() => {
          throw new Error('EPERM');
        });
      });

      it('does not fail', () => {
        expect(() =>
          createLegacyExecAlias('/usr/local/bin/packmind', 'linux'),
        ).not.toThrow();
      });

      // Same wording and severity as install.sh: the failure must not be
      // silent, because packmind-cli is the name existing scripts invoke.
      it('warns that the alias could not be created', () => {
        createLegacyExecAlias('/usr/local/bin/packmind', 'linux');

        expect(mockConsoleLogger.logWarningConsole).toHaveBeenCalledWith(
          'Could not create legacy alias: /usr/local/bin/packmind-cli -> packmind (non-critical)',
        );
      });

      it('does not unlink packmind-cli', () => {
        createLegacyExecAlias('/usr/local/bin/packmind', 'linux');

        expect(fs.unlinkSync).not.toHaveBeenCalledWith(
          '/usr/local/bin/packmind-cli',
        );
      });

      it('does not rename anything', () => {
        createLegacyExecAlias('/usr/local/bin/packmind', 'linux');

        expect(fs.renameSync).not.toHaveBeenCalled();
      });

      it('reports that the alias was not created', () => {
        expect(createLegacyExecAlias('/usr/local/bin/packmind', 'linux')).toBe(
          false,
        );
      });
    });
  });

  describe('updateHandler - executable replace', () => {
    const originalArgv = process.argv;

    beforeEach(() => {
      deps.isExecutableMode = true;
      deps.platform = 'linux';
      deps.arch = 'x64';
      deps.executablePath = '/home/user/.packmind/bin/packmind';
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ tag_name: 'release-cli/0.19.0' }],
        } as Response)
        .mockResolvedValueOnce(downloadResponse());
    });

    afterEach(() => {
      process.argv = originalArgv;
    });

    describe('on a fresh install', () => {
      beforeEach(async () => {
        await updateHandler(deps);
      });

      it('downloads the unchanged release asset name', () => {
        expect(mockFetch).toHaveBeenLastCalledWith(
          'https://github.com/PackmindHub/packmind/releases/download/release-cli/0.19.0/packmind-cli-linux-x64-0.19.0',
          { redirect: 'follow' },
        );
      });

      it('renames the download onto packmind', () => {
        expect(fs.renameSync).toHaveBeenCalledWith(
          '/home/user/.packmind/bin/packmind.update-tmp',
          '/home/user/.packmind/bin/packmind',
        );
      });

      it('does not unlink the target', () => {
        expect(fs.unlinkSync).not.toHaveBeenCalledWith(
          '/home/user/.packmind/bin/packmind',
        );
      });

      it('makes packmind executable', () => {
        expect(fs.chmodSync).toHaveBeenCalledWith(
          '/home/user/.packmind/bin/packmind',
          0o755,
        );
      });

      it('points packmind-cli at packmind', () => {
        expect(fs.renameSync).toHaveBeenCalledWith(
          '/home/user/.packmind/bin/packmind-cli.new-alias',
          '/home/user/.packmind/bin/packmind-cli',
        );
      });

      it('reports the canonical binary location', () => {
        expect(mockConsoleLogger.logInfoConsole).toHaveBeenCalledWith(
          'Binary location: /home/user/.packmind/bin/packmind',
        );
      });
    });

    describe('when migrating an old-layout install', () => {
      beforeEach(async () => {
        // packmind is still a symlink pointing at the real packmind-cli binary
        (fs.lstatSync as jest.Mock).mockReturnValue({
          isSymbolicLink: () => true,
        });
        await updateHandler(deps);
      });

      it('unlinks the packmind symlink', () => {
        expect(fs.unlinkSync).toHaveBeenCalledWith(
          '/home/user/.packmind/bin/packmind',
        );
      });

      it('unlinks it before renaming the download into place', () => {
        const unlinkOrder = (fs.unlinkSync as jest.Mock).mock
          .invocationCallOrder[0];
        const renameOrder = (fs.renameSync as jest.Mock).mock
          .invocationCallOrder[0];

        expect(unlinkOrder).toBeLessThan(renameOrder);
      });

      it('still installs at the canonical name', () => {
        expect(fs.renameSync).toHaveBeenCalledWith(
          '/home/user/.packmind/bin/packmind.update-tmp',
          '/home/user/.packmind/bin/packmind',
        );
      });

      it('inverts the alias so packmind-cli points at packmind', () => {
        expect(fs.renameSync).toHaveBeenCalledWith(
          '/home/user/.packmind/bin/packmind-cli.new-alias',
          '/home/user/.packmind/bin/packmind-cli',
        );
      });
    });

    describe('when invoked under the legacy name', () => {
      beforeEach(async () => {
        deps.executablePath = '/home/user/.packmind/bin/packmind-cli';
        process.argv = ['/home/user/.packmind/bin/packmind-cli', 'update'];
        await updateHandler(deps);
      });

      it('names the canonical executable as the one being updated', () => {
        expect(mockConsoleLogger.logInfoConsole).toHaveBeenCalledWith(
          expect.stringContaining(
            "The 'packmind' executable is the one being updated",
          ),
        );
      });

      it('updates packmind rather than the invoked binary', () => {
        expect(fs.renameSync).toHaveBeenCalledWith(
          '/home/user/.packmind/bin/packmind.update-tmp',
          '/home/user/.packmind/bin/packmind',
        );
      });

      it('reports a successful update', () => {
        expect(mockConsoleLogger.logSuccessConsole).toHaveBeenCalledWith(
          'Updated to v0.19.0',
        );
      });
    });

    describe('when the running executable is packmind-cli.exe on win32', () => {
      beforeEach(async () => {
        deps.platform = 'win32';
        deps.executablePath = 'C:/Users/u/.packmind/bin/packmind-cli.exe';
        await updateHandler(deps);
      });

      // The published Windows asset carries the extension AFTER the version.
      // This URL is the whole point of the fix: the previous one
      // (…/packmind-cli-windows-x64.exe-0.19.0) does not exist.
      it('downloads the published windows asset URL', () => {
        expect(mockFetch).toHaveBeenLastCalledWith(
          'https://github.com/PackmindHub/packmind/releases/download/release-cli/0.19.0/packmind-cli-windows-x64-0.19.0.exe',
          { redirect: 'follow' },
        );
      });

      it('installs packmind.exe', () => {
        expect(fs.renameSync).toHaveBeenCalledWith(
          'C:/Users/u/.packmind/bin/packmind.exe.update-tmp',
          'C:/Users/u/.packmind/bin/packmind.exe',
        );
      });

      it('does not chmod on win32', () => {
        expect(fs.chmodSync).not.toHaveBeenCalled();
      });

      it('does not unlink the running packmind-cli.exe', () => {
        expect(fs.unlinkSync).not.toHaveBeenCalled();
      });

      it('does not create a legacy alias', () => {
        expect(fs.symlinkSync).not.toHaveBeenCalled();
      });

      // packmind-cli.exe is typically a real copy on Windows, so it stays on
      // the old version. Printing a bare "Updated to vX" here contradicted the
      // adjacent hint and the version the user would keep seeing.
      it('reports which executable actually advanced', () => {
        expect(mockConsoleLogger.logSuccessConsole).toHaveBeenCalledWith(
          'Updated packmind.exe to v0.19.0',
        );
      });

      it('warns that the invoked executable was not updated', () => {
        expect(mockConsoleLogger.logWarningConsole).toHaveBeenCalledWith(
          'packmind-cli.exe was NOT updated and still runs v0.18.0.\n' +
            "Run 'packmind' from now on, or re-run the installer to replace packmind-cli.exe.",
        );
      });

      it('does not claim a plain success', () => {
        expect(mockConsoleLogger.logSuccessConsole).not.toHaveBeenCalledWith(
          'Updated to v0.19.0',
        );
      });
    });

    describe('when packmind.exe itself is the running executable on win32', () => {
      beforeEach(async () => {
        deps.platform = 'win32';
        deps.executablePath = 'C:/Users/u/.packmind/bin/packmind.exe';
        await updateHandler(deps);
      });

      it('downloads the published windows asset URL', () => {
        expect(mockFetch).toHaveBeenLastCalledWith(
          'https://github.com/PackmindHub/packmind/releases/download/release-cli/0.19.0/packmind-cli-windows-x64-0.19.0.exe',
          { redirect: 'follow' },
        );
      });

      it('installs packmind.exe', () => {
        expect(fs.renameSync).toHaveBeenCalledWith(
          'C:/Users/u/.packmind/bin/packmind.exe.update-tmp',
          'C:/Users/u/.packmind/bin/packmind.exe',
        );
      });

      it('reports a plain success, since the invoked file advanced', () => {
        expect(mockConsoleLogger.logSuccessConsole).toHaveBeenCalledWith(
          'Updated to v0.19.0',
        );
      });
    });

    describe('when the binary was invoked under an unrecognised name', () => {
      beforeEach(async () => {
        deps.executablePath =
          '/home/user/Downloads/packmind-cli-linux-x64-0.18.0';
        await updateHandler(deps);
      });

      it('replaces the invoked binary in place', () => {
        expect(fs.renameSync).toHaveBeenCalledWith(
          '/home/user/Downloads/packmind-cli-linux-x64-0.18.0.update-tmp',
          '/home/user/Downloads/packmind-cli-linux-x64-0.18.0',
        );
      });

      it('does not write a stray packmind next to it', () => {
        expect(fs.renameSync).not.toHaveBeenCalledWith(
          expect.anything(),
          '/home/user/Downloads/packmind',
        );
      });

      it('does not create a legacy alias beside it', () => {
        expect(fs.symlinkSync).not.toHaveBeenCalled();
      });

      it('reports the invoked binary as the updated one', () => {
        expect(mockConsoleLogger.logInfoConsole).toHaveBeenCalledWith(
          'Binary location: /home/user/Downloads/packmind-cli-linux-x64-0.18.0',
        );
      });

      it('reports a plain success, since the invoked file advanced', () => {
        expect(mockConsoleLogger.logSuccessConsole).toHaveBeenCalledWith(
          'Updated to v0.19.0',
        );
      });
    });

    describe('when an unrelated regular file already sits at the target', () => {
      beforeEach(async () => {
        deps.executablePath = '/home/user/.packmind/bin/packmind-cli';
        (fs.lstatSync as jest.Mock).mockReturnValue({
          isSymbolicLink: () => false,
          isFile: () => true,
        });
        await updateHandler(deps);
      });

      it('says it is replacing that file instead of doing it silently', () => {
        expect(mockConsoleLogger.logWarningConsole).toHaveBeenCalledWith(
          'Replacing the existing file at /home/user/.packmind/bin/packmind',
        );
      });
    });

    describe('when the target path is not a file', () => {
      beforeEach(async () => {
        deps.executablePath = '/home/user/.packmind/bin/packmind-cli';
        (fs.lstatSync as jest.Mock).mockReturnValue({
          isSymbolicLink: () => false,
          isFile: () => false,
        });
        await updateHandler(deps);
      });

      it('refuses to install over it', () => {
        expect(mockConsoleLogger.logErrorConsole).toHaveBeenCalledWith(
          'Update failed: Cannot install at /home/user/.packmind/bin/packmind: it already exists and is not a file.',
        );
      });

      it('installs nothing', () => {
        expect(fs.renameSync).not.toHaveBeenCalled();
      });

      it('does not download the asset', () => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('updateHandler - executable mode', () => {
    it('fetches from GitHub releases API', async () => {
      deps.isExecutableMode = true;
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ tag_name: 'release-cli/0.19.0' }],
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found',
        } as Response);

      try {
        await updateHandler(deps);
      } catch {
        // download will fail in test environment
      }

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/PackmindHub/packmind/releases?per_page=20',
        { headers: { Accept: 'application/vnd.github.v3+json' } },
      );
    });

    it('logs standalone executable mode', async () => {
      deps.isExecutableMode = true;
      deps.currentVersion = '0.19.0';
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [{ tag_name: 'release-cli/0.19.0' }],
      } as Response);

      await updateHandler(deps);

      expect(mockConsoleLogger.logInfoConsole).toHaveBeenCalledWith(
        'Current version: 0.19.0 (standalone executable)',
      );
    });

    it('logs npm package mode', async () => {
      deps.isExecutableMode = false;
      deps.currentVersion = '0.19.0';
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ version: '0.19.0' }),
      } as Response);

      await updateHandler(deps);

      expect(mockConsoleLogger.logInfoConsole).toHaveBeenCalledWith(
        'Current version: 0.19.0 (npm package)',
      );
    });
  });
});
