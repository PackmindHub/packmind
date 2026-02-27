import { execSync } from 'child_process';
import {
  createWriteStream,
  chmodSync,
  renameSync,
  unlinkSync,
  statSync,
} from 'fs';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import semver from 'semver';
import {
  logConsole,
  logInfoConsole,
  logSuccessConsole,
  logErrorConsole,
} from '../utils/consoleLogger';

const GITHUB_REPO = 'PackmindHub/packmind';
const NPM_PACKAGE = '@packmind/cli';

export interface UpdateHandlerDependencies {
  currentVersion: string;
  isExecutableMode: boolean;
  executablePath: string;
  platform: string;
  arch: string;
  fetchFn: typeof fetch;
}

interface GithubRelease {
  tag_name: string;
}

interface NpmPackageInfo {
  version: string;
}

export function getPlatformAssetSuffix(platform: string, arch: string): string {
  const osMap: Record<string, string> = {
    linux: 'linux',
    darwin: 'macos',
    win32: 'windows',
  };
  const osName = osMap[platform];
  if (!osName) {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  // macOS x64 uses baseline variant (matching install.sh)
  const archName =
    platform === 'darwin' && arch === 'x64' ? 'x64-baseline' : arch;
  const ext = platform === 'win32' ? '.exe' : '';

  return `${osName}-${archName}${ext}`;
}

export async function fetchLatestVersionFromNpm(
  fetchFn: typeof fetch,
): Promise<string> {
  const res = await fetchFn(`https://registry.npmjs.org/${NPM_PACKAGE}/latest`);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch from npm registry: ${res.status} ${res.statusText}`,
    );
  }
  const data = (await res.json()) as NpmPackageInfo;
  return data.version;
}

export async function fetchLatestVersionFromGitHub(
  fetchFn: typeof fetch,
): Promise<string> {
  const res = await fetchFn(
    `https://api.github.com/repos/${GITHUB_REPO}/releases?per_page=20`,
    {
      headers: { Accept: 'application/vnd.github.v3+json' },
    },
  );
  if (!res.ok) {
    throw new Error(
      `Failed to fetch from GitHub API: ${res.status} ${res.statusText}`,
    );
  }
  const releases = (await res.json()) as GithubRelease[];
  const cliRelease = releases.find((r) =>
    r.tag_name?.startsWith('release-cli/'),
  );
  if (!cliRelease) {
    throw new Error('No CLI release found on GitHub');
  }
  return cliRelease.tag_name.replace('release-cli/', '');
}

async function downloadExecutable(
  fetchFn: typeof fetch,
  version: string,
  platformSuffix: string,
  targetPath: string,
): Promise<void> {
  const assetName = `packmind-cli-${platformSuffix}-${version}`;
  const url = `https://github.com/${GITHUB_REPO}/releases/download/release-cli/${version}/${assetName}`;

  logInfoConsole(`Downloading ${assetName}...`);
  const res = await fetchFn(url, { redirect: 'follow' });
  if (!res.ok) {
    throw new Error(
      `Failed to download executable: ${res.status} ${res.statusText}\nURL: ${url}`,
    );
  }

  if (!res.body) {
    throw new Error('No response body received');
  }

  const nodeReadable = Readable.fromWeb(res.body as never);
  const fileStream = createWriteStream(targetPath);
  await pipeline(nodeReadable, fileStream);

  // Validate file size (should be > 1MB for a valid binary)
  const stats = statSync(targetPath);
  if (stats.size < 1_000_000) {
    unlinkSync(targetPath);
    throw new Error(
      `Downloaded file is too small (${stats.size} bytes). The download may have failed.`,
    );
  }

  logInfoConsole(
    `Downloaded successfully (${(stats.size / 1_048_576).toFixed(1)} MB)`,
  );
}

function updateViaNpm(version: string): void {
  logInfoConsole(`Updating via npm to version ${version}...`);
  execSync(`npm install -g ${NPM_PACKAGE}@${version}`, {
    stdio: 'inherit',
  });
}

async function updateViaExecutableReplace(
  deps: UpdateHandlerDependencies,
  version: string,
): Promise<void> {
  const platformSuffix = getPlatformAssetSuffix(deps.platform, deps.arch);
  const currentPath = deps.executablePath;
  const tempPath = currentPath + '.update-tmp';

  try {
    await downloadExecutable(deps.fetchFn, version, platformSuffix, tempPath);

    // Atomic replace: rename temp file over current executable
    renameSync(tempPath, currentPath);

    // Ensure executable permissions on non-Windows
    if (deps.platform !== 'win32') {
      chmodSync(currentPath, 0o755);
    }
  } catch (error) {
    // Clean up temp file on failure
    try {
      unlinkSync(tempPath);
    } catch {
      // Temp file may not exist
    }
    throw error;
  }
}

export async function updateHandler(
  deps: UpdateHandlerDependencies,
): Promise<void> {
  logInfoConsole(
    `Current version: ${deps.currentVersion} (${deps.isExecutableMode ? 'standalone executable' : 'npm package'})`,
  );

  // Fetch latest version from the appropriate source
  let latestVersion: string;
  try {
    latestVersion = deps.isExecutableMode
      ? await fetchLatestVersionFromGitHub(deps.fetchFn)
      : await fetchLatestVersionFromNpm(deps.fetchFn);
  } catch (error) {
    logErrorConsole(
      `Failed to check for updates: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
    return;
  }

  // Compare versions using semver
  if (!semver.gt(latestVersion, deps.currentVersion)) {
    logSuccessConsole(`Already up to date (v${deps.currentVersion})`);
    return;
  }

  logConsole('');
  logInfoConsole(
    `New version available: ${deps.currentVersion} -> ${latestVersion}`,
  );

  try {
    if (deps.isExecutableMode) {
      await updateViaExecutableReplace(deps, latestVersion);
    } else {
      updateViaNpm(latestVersion);
    }

    logConsole('');
    logSuccessConsole(`Updated to v${latestVersion}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes('EACCES') || message.includes('permission denied')) {
      logErrorConsole(
        `Permission denied. Try running with sudo:\n  sudo packmind-cli update`,
      );
    } else {
      logErrorConsole(`Update failed: ${message}`);
    }
    process.exit(1);
  }
}
