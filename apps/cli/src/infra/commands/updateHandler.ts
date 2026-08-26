import path from 'path';
import { execSync } from 'child_process';
import {
  createWriteStream,
  chmodSync,
  renameSync,
  unlinkSync,
  statSync,
  lstatSync,
  realpathSync,
  symlinkSync,
} from 'fs';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import semver from 'semver';
import {
  logConsole,
  logInfoConsole,
  logSuccessConsole,
  logErrorConsole,
  logWarningConsole,
} from '../utils/consoleLogger';
import {
  CANONICAL_EXEC_NAME,
  EXEC_NAME,
  LEGACY_EXEC_NAME,
  isLegacyExecName,
} from '../utils/execName';

const GITHUB_REPO = 'PackmindHub/packmind';
const NPM_PACKAGE = '@packmind/cli';
/**
 * Basename of the published GitHub release assets. Decoupled from
 * {@link CANONICAL_EXEC_NAME}: the assets keep the legacy basename so existing
 * installs can keep self-updating against the exact same URLs.
 * Authority: `.github/workflows/publish-cli-release.yml` + `install.sh`.
 */
const RELEASE_ASSET_BASENAME = 'packmind-cli';

export interface IUpdateHandlerDependencies {
  currentVersion: string;
  isExecutableMode: boolean;
  executablePath: string;
  scriptPath?: string;
  platform: string;
  arch: string;
  fetchFn: typeof fetch;
  checkOnly?: boolean;
}

interface IGithubRelease {
  tag_name: string;
}

interface INpmPackageInfo {
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

  return `${osName}-${archName}`;
}

/**
 * Builds the name of the published release asset for a platform/version.
 *
 * The `.exe` extension comes LAST, after the version — that is what the release
 * workflow publishes (`packmind-cli-windows-x64-<version>.exe`) and what
 * install.sh downloads. Putting it on the platform suffix instead produced
 * `packmind-cli-windows-x64.exe-<version>`, a URL that has never existed, so
 * `update` 404'd on every Windows run.
 *
 * Non-Windows names are unchanged: `packmind-cli-<platform>-<version>`.
 */
export function getReleaseAssetName(
  platform: string,
  arch: string,
  version: string,
): string {
  const platformSuffix = getPlatformAssetSuffix(platform, arch);
  const ext = platform === 'win32' ? '.exe' : '';

  return `${RELEASE_ASSET_BASENAME}-${platformSuffix}-${version}${ext}`;
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
  const data = (await res.json()) as INpmPackageInfo;
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
  const releases = (await res.json()) as IGithubRelease[];
  const cliReleases = releases
    .filter((r) => r.tag_name?.startsWith('release-cli/'))
    .map((r) => ({
      ...r,
      version: r.tag_name.replace('release-cli/', ''),
    }))
    .filter((r) => semver.valid(r.version))
    .sort((a, b) => semver.rcompare(a.version, b.version));

  if (cliReleases.length === 0) {
    throw new Error('No CLI release found on GitHub');
  }
  return cliReleases[0].version;
}

async function downloadExecutable(
  fetchFn: typeof fetch,
  version: string,
  assetName: string,
  targetPath: string,
): Promise<void> {
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

/**
 * Splits on both separators so a Windows-style path resolves the same way
 * whatever platform this code runs on.
 */
function basenameOf(candidate: string): string {
  return candidate.split(/[/\\]/).pop() ?? '';
}

/**
 * Whether `executablePath` was installed under one of the two names the
 * installer manages (`packmind` / `packmind-cli`, `.exe` aware).
 *
 * Anything else is a binary the user placed and named themselves — typically a
 * downloaded release asset such as `packmind-cli-linux-x64-0.33.0`.
 */
function isManagedExecFileName(executablePath: string): boolean {
  const basename = basenameOf(executablePath).replace(/\.exe$/i, '');
  return basename === CANONICAL_EXEC_NAME || basename === LEGACY_EXEC_NAME;
}

/**
 * Resolves where an update must be written.
 *
 * For an installer-managed binary this is the canonical `packmind` executable
 * next to whatever name the user launched, so `update` maintains a single
 * executable even when invoked through the deprecated `packmind-cli` name.
 *
 * For any other basename the invoked file is updated IN PLACE. Redirecting
 * unconditionally meant a standalone download run as
 * `./packmind-cli-linux-x64-0.33.0 update` (which the getting-started docs
 * present as a supported layout, the `mv` into PATH being optional) wrote a
 * stray `packmind` beside it and left the invoked binary on its old version
 * forever, while still printing a success line.
 */
export function resolveUpdateTargetPath(
  executablePath: string,
  platform: string,
): string {
  if (!isManagedExecFileName(executablePath)) {
    return executablePath;
  }

  const ext = platform === 'win32' ? '.exe' : '';
  return path.join(
    path.dirname(executablePath),
    `${CANONICAL_EXEC_NAME}${ext}`,
  );
}

/**
 * Removes `targetPath` when it is a symlink.
 *
 * Pre-inversion installs have `packmind` as a symlink to the real
 * `packmind-cli` binary; renaming onto a symlink writes *through* it and would
 * overwrite the legacy binary instead of installing at the canonical name.
 */
function unlinkIfSymlink(targetPath: string): void {
  try {
    if (lstatSync(targetPath).isSymbolicLink()) {
      unlinkSync(targetPath);
    }
  } catch {
    // Nothing there yet (fresh install), or not inspectable: nothing to unlink.
  }
}

/**
 * Maintains the deprecated `packmind-cli` name as a symlink to the canonical
 * `packmind` executable (mirrors install.sh behavior).
 *
 * TRANSITIONAL: this alias only exists so scripts pinned to the old name keep
 * working through the deprecation cycle. Delete this function and its caller
 * once `packmind-cli` is dropped.
 */
export function createLegacyExecAlias(
  canonicalPath: string,
  platform: string,
  runningExecutablePath?: string,
): boolean {
  const dir = path.dirname(canonicalPath);
  const ext = platform === 'win32' ? '.exe' : '';
  const canonicalName = `${CANONICAL_EXEC_NAME}${ext}`;
  const legacyName = `${LEGACY_EXEC_NAME}${ext}`;
  const legacyPath = path.join(dir, legacyName);

  // Windows cannot delete a running .exe: an install made before the rename
  // self-updates while running *as* packmind-cli.exe, so leave it alone rather
  // than failing an otherwise successful update.
  if (
    platform === 'win32' &&
    runningExecutablePath &&
    basenameOf(runningExecutablePath).toLowerCase() === legacyName.toLowerCase()
  ) {
    logInfoConsole(
      `Kept ${legacyPath} as-is: Windows cannot replace a running executable.\n` +
        `Re-run the installer, or delete ${legacyName} manually, to finish switching to ${canonicalName}.`,
    );
    return false;
  }

  // Build the new link under a temporary name and rename it into place, so a
  // failure can never leave the deprecated name deleted with nothing behind it.
  // Unlinking first (the previous behavior) removed the very file that existing
  // user scripts invoke, then swallowed the symlink failure silently.
  const stagedPath = `${legacyPath}.new-alias`;
  try {
    removeIfPresent(stagedPath);
    symlinkSync(canonicalName, stagedPath);
    renameSync(stagedPath, legacyPath);
    logInfoConsole(`Created legacy alias: ${legacyPath} -> ${canonicalName}`);
    return true;
  } catch {
    // Non-critical, but never silent: symlink creation can fail (no symlink
    // support, Windows without the privilege) and the legacy name then stays
    // whatever it already was. Same wording/severity as install.sh.
    removeIfPresent(stagedPath);
    logWarningConsole(
      `Could not create legacy alias: ${legacyPath} -> ${canonicalName} (non-critical)`,
    );
    return false;
  }
}

function removeIfPresent(targetPath: string): void {
  try {
    unlinkSync(targetPath);
  } catch {
    // Nothing there: nothing to remove.
  }
}

function updateViaNpm(version: string): void {
  logInfoConsole(`Updating via npm to version ${version}...`);
  execSync(`npm install -g ${NPM_PACKAGE}@${version}`, {
    stdio: 'inherit',
  });
}

/**
 * Announces (or refuses) the replacement of a file the update is about to write
 * over at a path *other* than the invoked binary.
 *
 * Without this, redirecting to the canonical name overwrote whatever else
 * happened to be called `packmind` in that directory with no message at all.
 */
function checkTargetBeforeReplacing(
  targetPath: string,
  executablePath: string,
): void {
  if (targetPath === executablePath) {
    // Updating in place: the file being replaced is the one that was invoked.
    return;
  }

  let entry: ReturnType<typeof lstatSync>;
  try {
    entry = lstatSync(targetPath);
  } catch {
    // Nothing there yet: nothing to replace.
    return;
  }

  if (entry.isSymbolicLink()) {
    // Old-layout alias; unlinkIfSymlink handles it.
    return;
  }

  if (!entry.isFile()) {
    throw new Error(
      `Cannot install at ${targetPath}: it already exists and is not a file.`,
    );
  }

  logWarningConsole(`Replacing the existing file at ${targetPath}`);
}

interface IExecutableUpdateOutcome {
  /** The file that was actually written. */
  targetPath: string;
  /** Whether the binary the user just invoked now resolves to the new version. */
  invokedExecutableUpdated: boolean;
}

async function updateViaExecutableReplace(
  deps: IUpdateHandlerDependencies,
  version: string,
): Promise<IExecutableUpdateOutcome> {
  const assetName = getReleaseAssetName(deps.platform, deps.arch, version);
  // Update the canonical executable for an installer-managed binary; any other
  // name is updated in place.
  const targetPath = resolveUpdateTargetPath(
    deps.executablePath,
    deps.platform,
  );
  const tempPath = targetPath + '.update-tmp';

  try {
    checkTargetBeforeReplacing(targetPath, deps.executablePath);

    await downloadExecutable(deps.fetchFn, version, assetName, tempPath);

    // Drop a leftover old-layout symlink so the rename cannot write through it
    unlinkIfSymlink(targetPath);

    // Atomic replace: rename temp file over the canonical executable
    renameSync(tempPath, targetPath);

    // Ensure executable permissions on non-Windows
    if (deps.platform !== 'win32') {
      chmodSync(targetPath, 0o755);
    }

    // Keep the deprecated name working (mirrors install.sh behavior), but only
    // for an installer-managed layout: a user-named standalone binary must not
    // grow a `packmind-cli` alias beside it.
    const aliasCreated =
      isManagedExecFileName(deps.executablePath) &&
      createLegacyExecAlias(targetPath, deps.platform, deps.executablePath);

    const legacyName = `${LEGACY_EXEC_NAME}${deps.platform === 'win32' ? '.exe' : ''}`;
    const invokedIsLegacyName =
      basenameOf(deps.executablePath).toLowerCase() ===
      legacyName.toLowerCase();

    return {
      targetPath,
      invokedExecutableUpdated:
        targetPath === deps.executablePath ||
        (aliasCreated && invokedIsLegacyName),
    };
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

export function isLocalNpmPackage(scriptPath?: string): boolean {
  if (!scriptPath) return false;
  return scriptPath.includes(path.join('node_modules', '@packmind', 'cli'));
}

export function isHomebrewInstall(executablePath: string): boolean {
  try {
    const realPath = realpathSync(executablePath);
    return realPath.includes('/Cellar/');
  } catch {
    return false;
  }
}

export async function updateHandler(
  deps: IUpdateHandlerDependencies,
): Promise<void> {
  const execBasename = path.basename(deps.executablePath).replace(/\.exe$/, '');
  const jsRuntimes = ['node', 'bun', 'deno'];
  if (jsRuntimes.includes(execBasename)) {
    if (isLocalNpmPackage(deps.scriptPath)) {
      logErrorConsole(
        'Your CLI version is managed by your local package.json.\n' +
          'To update, run: npm update @packmind/cli',
      );
    } else {
      logErrorConsole(
        'The update command is not available when running the CLI via a JavaScript runtime.\n' +
          'To update, use the standalone executable or run: npm install -g @packmind/cli@latest',
      );
    }
    process.exit(1);
    return;
  }

  if (isHomebrewInstall(deps.executablePath)) {
    // The Homebrew formula lives in a separate repo (PackmindHub/homebrew-cli),
    // so the tap's package name stays `packmind-cli` until that repo renames it.
    logInfoConsole(
      'This CLI was installed via Homebrew.\n' +
        'To update, run: brew upgrade packmind-cli',
    );
    process.exit(0);
    return;
  }

  logInfoConsole(
    `Current version: ${deps.currentVersion} (${deps.isExecutableMode ? 'standalone executable' : 'npm package'})`,
  );

  // The startup warning already says the name is deprecated and to switch, so
  // don't repeat that here. What is new at this point is which executable
  // `update` actually maintains.
  if (isLegacyExecName()) {
    logInfoConsole(
      `The '${CANONICAL_EXEC_NAME}' executable is the one being updated; '${LEGACY_EXEC_NAME}' points to it.`,
    );
  }

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

  if (deps.checkOnly) {
    process.exit(1);
    return;
  }

  try {
    if (!deps.isExecutableMode) {
      updateViaNpm(latestVersion);
      logConsole('');
      logSuccessConsole(`Updated to v${latestVersion}`);
      return;
    }

    const outcome = await updateViaExecutableReplace(deps, latestVersion);

    logConsole('');
    if (outcome.invokedExecutableUpdated) {
      logSuccessConsole(`Updated to v${latestVersion}`);
    } else {
      // Be precise about which file advanced: claiming a plain success while
      // the invoked binary keeps reporting the old version reads as a bug.
      const invokedName = basenameOf(deps.executablePath);
      const targetName = basenameOf(outcome.targetPath);
      logSuccessConsole(`Updated ${targetName} to v${latestVersion}`);
      logWarningConsole(
        `${invokedName} was NOT updated and still runs v${deps.currentVersion}.\n` +
          `Run '${CANONICAL_EXEC_NAME}' from now on, or re-run the installer to replace ${invokedName}.`,
      );
    }
    logInfoConsole(`Binary location: ${outcome.targetPath}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes('EACCES') || message.includes('permission denied')) {
      logErrorConsole(
        `Permission denied. Try running with sudo:\n  sudo ${EXEC_NAME} update`,
      );
    } else {
      logErrorConsole(`Update failed: ${message}`);
    }
    process.exit(1);
  }
}
