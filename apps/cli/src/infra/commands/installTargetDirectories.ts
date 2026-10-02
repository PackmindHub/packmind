import * as fs from 'fs';
import * as path from 'path';

function findSubDirectoriesWithPackmindJson(
  dirPath: string,
  recursive: boolean,
): string[] {
  const result: string[] = [];

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return result;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const subDir = path.join(dirPath, entry.name);

    if (fs.existsSync(path.join(subDir, 'packmind.json'))) {
      result.push(subDir);
    }

    if (recursive) {
      result.push(...findSubDirectoriesWithPackmindJson(subDir, true));
    }
  }

  return result;
}

/**
 * The directories an install runs in, each holding (or about to hold) a
 * packmind.json.
 */
export function resolveInstallTargetDirectories({
  cwd,
  installPath,
  hasExplicitPackages,
}: {
  cwd: string;
  installPath: string;
  hasExplicitPackages: boolean;
}): string[] {
  const cwdHasConfig = () => fs.existsSync(path.join(cwd, 'packmind.json'));

  if (installPath) {
    // With -p: target cwd itself when it has packmind.json or explicit packages
    // were passed, plus any direct sub-directories with packmind.json.
    return [
      ...(cwdHasConfig() || hasExplicitPackages ? [cwd] : []),
      ...findSubDirectoriesWithPackmindJson(cwd, false),
    ];
  }

  if (hasExplicitPackages) {
    // With explicit packages: only update the cwd's packmind.json
    return [cwd];
  }

  // Without -p and without explicit packages: include root if it has packmind.json, then recursively find sub-directories
  return [
    ...(cwdHasConfig() ? [cwd] : []),
    ...findSubDirectoriesWithPackmindJson(cwd, true),
  ];
}
