import * as path from 'path';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import {
  CheckUpgradesArtifactChange,
  CheckUpgradesPackage,
  ICheckUpgradesResult,
} from '../../domain/useCases/ICheckUpgradesUseCase';
import { PackmindConfigNotFoundError } from '../../domain/errors/PackmindConfigNotFoundError';
import { PackmindConfigInvalidError } from '../../domain/errors/PackmindConfigInvalidError';
import {
  formatBold,
  formatCommand,
  formatHeader,
  formatLabel,
  formatSlug,
  logConsole,
  logErrorConsole,
  logSuccessConsole,
  logWarningConsole,
} from '../utils/consoleLogger';
import { EXEC_NAME } from '../utils/execName';
import { resolveInstallTargetDirectories } from './installTargetDirectories';

export type CheckUpgradesHandlerArgs = {
  /** The directory the install runs from, already resolved and validated. */
  cwd: string;
  /** The raw `--path` value, empty when none was given. */
  installPath: string;
  cliVersion: string;
};

export type CheckUpgradesHandlerDependencies = {
  packmindCliHexa: PackmindCliHexa;
  exit: (code: number) => void;
};

const CHANGE_MARKERS: Record<CheckUpgradesArtifactChange['change'], string> = {
  added: '+',
  updated: '~',
  removed: '-',
};

const ARTIFACT_TYPE_WIDTH = 'standard'.length;

function pluralize(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

function formatArtifactLines(
  artifacts: CheckUpgradesArtifactChange[],
): string[] {
  const nameWidth = Math.max(...artifacts.map((a) => a.name.length));

  return artifacts.map((artifact) => {
    const detail =
      artifact.change === 'added'
        ? '(new)'
        : artifact.change === 'removed'
          ? '(removed)'
          : `v${artifact.fromVersion} → v${artifact.toVersion}`;

    return `  ${CHANGE_MARKERS[artifact.change]} ${artifact.type.padEnd(
      ARTIFACT_TYPE_WIDTH,
    )}  ${artifact.name.padEnd(nameWidth)}  ${formatLabel(detail)}`;
  });
}

/** Mirrors the package move line of the app's Distribution tab. */
function formatPackageMoveLine(pkg: CheckUpgradesPackage): string {
  if (pkg.to !== null && pkg.to !== pkg.from) {
    return `${pkg.from} → ${formatBold(pkg.to)}`;
  }

  const status =
    pkg.artifacts.length > 0
      ? `${pluralize(pkg.artifacts.length, 'component')} to update`
      : pkg.to === null
        ? 'up to date'
        : 'already on the newest release';

  return `${pkg.from} ${formatLabel(`· ${status}`)}`;
}

export function formatCheckUpgradesResult(
  result: ICheckUpgradesResult,
): string[] {
  const lines: string[] = [];

  for (const pkg of result.packages) {
    lines.push(`${formatSlug(pkg.slug)}  ${formatPackageMoveLine(pkg)}`);
    lines.push(...formatArtifactLines(pkg.artifacts));
  }

  if (result.unattributedArtifacts.length > 0) {
    lines.push('Not from any package of packmind.json');
    lines.push(...formatArtifactLines(result.unattributedArtifacts));
  }

  return lines;
}

function describeError(error: unknown): string {
  if (error instanceof PackmindConfigNotFoundError) {
    return 'No packmind.json found.';
  }
  if (error instanceof PackmindConfigInvalidError) {
    return 'packmind.json could not be parsed. Please fix the JSON syntax errors and try again.';
  }
  return error instanceof Error ? error.message : String(error);
}

/**
 * `install --check-upgrades`: reports what `install --upgrade` would change in
 * each packmind.json directory, writing nothing and recording nothing.
 */
export async function checkUpgradesHandler(
  args: CheckUpgradesHandlerArgs,
  deps: CheckUpgradesHandlerDependencies,
): Promise<void> {
  const { cwd, installPath, cliVersion } = args;
  const { packmindCliHexa, exit } = deps;

  const targetDirs = resolveInstallTargetDirectories({
    cwd,
    installPath,
    hasExplicitPackages: false,
  });

  if (targetDirs.length === 0) {
    logErrorConsole(
      'No packmind.json found in the current directory or its sub-directories. Nothing to check.',
    );
    exit(1);
    return;
  }

  const multiDir = targetDirs.length > 1;
  const missingAccess = new Set<string>();
  const errors: string[] = [];
  let hasUpgrades = false;

  for (const dir of targetDirs) {
    const configPath = path.relative(cwd, path.join(dir, 'packmind.json'));

    try {
      const result = await packmindCliHexa.checkUpgrades({
        baseDirectory: dir,
        cliVersion,
      });

      hasUpgrades ||= result.hasUpgrades;
      result.missingAccess.forEach((slug) => missingAccess.add(slug));

      if (multiDir) logConsole(formatHeader(configPath));
      formatCheckUpgradesResult(result).forEach((line) => logConsole(line));
      if (multiDir) logConsole('');
    } catch (error) {
      const message = describeError(error);
      errors.push(
        multiDir
          ? `[${configPath}] check failed: ${message}`
          : `check failed: ${message}`,
      );
    }
  }

  if (missingAccess.size > 0) {
    logWarningConsole(
      `You don't have access to the following packages, so they were not checked:\n` +
        [...missingAccess].map((slug) => `  - ${slug}`).join('\n'),
    );
  }

  if (errors.length > 0) {
    errors.forEach((err) => logErrorConsole(err));
    exit(1);
    return;
  }

  if (hasUpgrades) {
    const upgradeCommand = installPath
      ? `${EXEC_NAME} install --upgrade -p ${installPath}`
      : `${EXEC_NAME} install --upgrade`;
    if (!multiDir) logConsole('');
    logConsole(`Run ${formatCommand(upgradeCommand)} to apply these changes.`);
    exit(1);
    return;
  }

  logSuccessConsole('Already up to date');
  exit(0);
}
