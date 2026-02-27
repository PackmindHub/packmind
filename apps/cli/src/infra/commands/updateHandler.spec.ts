import {
  updateHandler,
  IUpdateHandlerDependencies,
  getPlatformAssetSuffix,
  fetchLatestVersionFromNpm,
  fetchLatestVersionFromGitHub,
} from './updateHandler';
import * as consoleLogger from '../utils/consoleLogger';

jest.mock('../utils/consoleLogger', () => ({
  logInfoConsole: jest.fn(),
  logSuccessConsole: jest.fn(),
  logErrorConsole: jest.fn(),
  logConsole: jest.fn(),
}));

const mockConsoleLogger = consoleLogger as jest.Mocked<typeof consoleLogger>;

describe('updateHandler', () => {
  let deps: IUpdateHandlerDependencies;
  let mockFetch: jest.MockedFunction<typeof fetch>;
  const processExitSpy = jest
    .spyOn(process, 'exit')
    .mockImplementation(() => undefined as never);

  beforeEach(() => {
    jest.clearAllMocks();

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

    it('returns windows-x64.exe for win32 x64', () => {
      expect(getPlatformAssetSuffix('win32', 'x64')).toBe('windows-x64.exe');
    });

    it('throws for unsupported platform', () => {
      expect(() => getPlatformAssetSuffix('freebsd', 'x64')).toThrow(
        'Unsupported platform: freebsd',
      );
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

    it('fetches from npm registry', async () => {
      deps.isExecutableMode = false;
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ version: '0.19.0' }),
      } as Response);

      try {
        await updateHandler(deps);
      } catch {
        // execSync will throw in test environment
      }

      expect(mockFetch).toHaveBeenCalledWith(
        'https://registry.npmjs.org/@packmind/cli/latest',
      );
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
