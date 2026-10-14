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
import { ParsedPackageSlug } from '../../domain/entities/PackageSlug';

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
  rerendered: '~',
};

const ARTIFACT_CHANGE_DETAILS: Record<
  CheckUpgradesArtifactChange['change'],
  (artifact: CheckUpgradesArtifactChange) => string
> = {
  added: () => '(new)',
  removed: () => '(removed)',
  rerendered: () => '(files change)',
  updated: (artifact) => `v${artifact.fromVersion} → v${artifact.toVersion}`,
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
    const detail = ARTIFACT_CHANGE_DETAILS[artifact.change](artifact);

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

  return `${pkg.from} ${formatLabel('· ' + packageStatus(pkg))}`;
}

function packageStatus(pkg: CheckUpgradesPackage): string {
  if (pkg.artifacts.length > 0) {
    return `${pluralize(pkg.artifacts.length, 'component')} to update`;
  }
  return pkg.to === null ? 'up to date' : 'already on the newest release';
}

function formatAgentList(agents: string[]): string {
  return agents.length > 0 ? agents.join(', ') : 'none';
}

function formatAgentsMoveLine(
  agents: NonNullable<ICheckUpgradesResult['agents']>,
): string {
  return `Coding agents: ${formatAgentList(agents.from)} → ${formatBold(
    formatAgentList(agents.to),
  )}`;
}

export function formatCheckUpgradesResult(
  result: ICheckUpgradesResult,
): string[] {
  const lines: string[] = [];

  if (result.agents) {
    lines.push(formatAgentsMoveLine(result.agents));
  }

  for (const pkg of result.packages) {
    lines.push(
      `${formatSlug(pkg.slug)}  ${formatPackageMoveLine(pkg)}`,
      ...formatArtifactLines(pkg.artifacts),
    );
  }

  if (result.unattributedArtifacts.length > 0) {
    lines.push(
      'Not from any package of packmind.json',
      ...formatArtifactLines(result.unattributedArtifacts),
    );
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

/** The reason `--check-upgrades` cannot run with these other install arguments, if any. */
export function findCheckUpgradesConflict({
  packages,
  status,
  upgrade,
}: {
  packages: ParsedPackageSlug[];
  status: boolean;
  upgrade?: boolean;
}): string | null {
  if (upgrade) return '--check-upgrades cannot be combined with --upgrade.';
  if (status) return '--check-upgrades cannot be combined with --status.';
  if (packages.length > 0) {
    return '--check-upgrades checks the packages of packmind.json and takes no package names.';
  }
  return null;
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

  const outcome = await checkDirectories(
    targetDirs,
    cwd,
    cliVersion,
    packmindCliHexa,
  );
  exit(reportOutcome(outcome, installPath, targetDirs.length > 1));
}

type CheckOutcome = {
  hasUpgrades: boolean;
  missingAccess: Set<string>;
  errors: string[];
};

/** Checks each directory in turn so its output stays in order. */
async function checkDirectories(
  targetDirs: string[],
  cwd: string,
  cliVersion: string,
  packmindCliHexa: PackmindCliHexa,
): Promise<CheckOutcome> {
  const multiDir = targetDirs.length > 1;
  const outcome: CheckOutcome = {
    hasUpgrades: false,
    missingAccess: new Set<string>(),
    errors: [],
  };

  for (const dir of targetDirs) {
    const configPath = path.relative(cwd, path.join(dir, 'packmind.json'));

    try {
      const result = await packmindCliHexa.checkUpgrades({
        baseDirectory: dir,
        cliVersion,
      });

      outcome.hasUpgrades ||= result.hasUpgrades;
      result.missingAccess.forEach((slug) => outcome.missingAccess.add(slug));

      if (multiDir) logConsole(formatHeader(configPath));
      formatCheckUpgradesResult(result).forEach((line) => logConsole(line));
      if (multiDir) logConsole('');
    } catch (error) {
      const message = describeError(error);
      outcome.errors.push(
        multiDir
          ? `[${configPath}] check failed: ${message}`
          : `check failed: ${message}`,
      );
    }
  }

  return outcome;
}

/** Prints the closing lines and returns the exit code. */
function reportOutcome(
  { hasUpgrades, missingAccess, errors }: CheckOutcome,
  installPath: string,
  multiDir: boolean,
): number {
  const incomplete = missingAccess.size > 0;
  if (incomplete) {
    logWarningConsole(
      `Could not check ${pluralize(missingAccess.size, 'package')} you don't have access to: ${[
        ...missingAccess,
      ].join(', ')}`,
    );
  }

  if (errors.length > 0) {
    errors.forEach((err) => logErrorConsole(err));
    return 1;
  }

  if (hasUpgrades) {
    const upgradeCommand = installPath
      ? `${EXEC_NAME} install --upgrade -p ${installPath}`
      : `${EXEC_NAME} install --upgrade`;
    if (!multiDir) logConsole('');
    logConsole(`Run ${formatCommand(upgradeCommand)} to apply these changes.`);
    return 1;
  }

  if (incomplete) return 1;

  logSuccessConsole('Already up to date');
  return 0;
}
