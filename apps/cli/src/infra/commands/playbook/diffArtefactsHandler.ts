import * as nodePath from 'path';
import * as fs from 'fs/promises';
import { PackmindCliHexa } from '../../../PackmindCliHexa';
import {
  ArtifactType,
  CHANGE_PROPOSAL_TYPE_LABELS,
  ChangeProposalPayload,
  ChangeProposalType,
} from '@packmind/types';
import { ArtefactDiff } from '../../../domain/useCases/IDiffArtefactsUseCase';
import { CheckDiffItemResult } from '../../../domain/useCases/ICheckDiffsUseCase';
import {
  logWarningConsole,
  logInfoConsole,
  logErrorConsole,
  formatHeader,
  formatBold,
  formatFilePath,
} from '../../utils/consoleLogger';
import { formatContentDiff } from '../../utils/diffFormatter';
import { formatAdditionalPropertyDiff } from '../formatAdditionalPropertyDiff';
import chalk from 'chalk';

export type DiffHandlerDependencies = {
  packmindCliHexa: PackmindCliHexa;
  exit: (code: number) => void;
  getCwd: () => string;
  log: typeof console.log;
  includeSubmitted?: boolean;
  path?: string;
};

export type DiffHandlerResult = {
  diffsFound: number;
};

type TargetDiffResult = {
  targetRelativePath: string;
  diffs: ArtefactDiff[];
};

const ARTIFACT_TYPE_LABELS: Record<ArtifactType, string> = {
  command: 'Command',
  standard: 'Standard',
  skill: 'Skill',
};

function subGroupByChangeContent(diffs: ArtefactDiff[]): ArtefactDiff[][] {
  const groups = new Map<string, ArtefactDiff[]>();
  for (const diff of diffs) {
    const key = JSON.stringify({ type: diff.type, payload: diff.payload });
    const group = groups.get(key) ?? [];
    group.push(diff);
    groups.set(key, group);
  }
  return Array.from(groups.values());
}

function groupDiffsByArtefact(
  diffs: ArtefactDiff[],
): Map<string, ArtefactDiff[]> {
  const groups = new Map<string, ArtefactDiff[]>();
  for (const diff of diffs) {
    const key = `${diff.artifactType}:${diff.artifactName}`;
    const group = groups.get(key) ?? [];
    group.push(diff);
    groups.set(key, group);
  }
  return groups;
}

function formatDiffPayload(diff: ArtefactDiff, log: typeof console.log): void {
  const payload = diff.payload as Record<string, unknown>;

  if (diff.type === ChangeProposalType.addSkillFile) {
    const item = payload.item as { content: string; isBase64?: boolean };
    if (item.isBase64) {
      log(chalk.green('    + [binary file]'));
    } else {
      for (const line of item.content.split('\n')) {
        log(chalk.green(`    + ${line}`));
      }
    }
    return;
  }

  if (diff.type === ChangeProposalType.deleteSkillFile) {
    const item = payload.item as { content: string; isBase64?: boolean };
    if (item.isBase64) {
      log(chalk.red('    - [binary file]'));
    } else {
      const lines = item.content.split('\n');
      const MAX_DELETED_LINES = 3;
      const preview = lines.slice(0, MAX_DELETED_LINES);
      for (const line of preview) {
        log(chalk.red(`    - ${line}`));
      }
      if (lines.length > MAX_DELETED_LINES) {
        const remaining = lines.length - MAX_DELETED_LINES;
        log(chalk.red(`    ... and ${remaining} more lines deleted`));
      }
    }
    return;
  }

  if (diff.type === ChangeProposalType.updateSkillFileContent) {
    const typedPayload = payload as ChangeProposalPayload<
      typeof ChangeProposalType.updateSkillFileContent
    >;
    if (typedPayload.isBase64) {
      log(chalk.green('    ~ [binary content changed]'));
      return;
    }
  }

  if (diff.type === ChangeProposalType.addRule) {
    const item = payload.item as { content: string };
    log(chalk.green(`    + ${item.content}`));
    return;
  }

  if (diff.type === ChangeProposalType.deleteRule) {
    const item = payload.item as { content: string };
    log(chalk.red(`    - ${item.content}`));
    return;
  }

  if (diff.type === ChangeProposalType.updateSkillAdditionalProperty) {
    const lines = formatAdditionalPropertyDiff(
      payload.targetId as string,
      payload.oldValue as string,
      payload.newValue as string,
    );
    for (const line of lines) {
      log(
        line.type === 'removed'
          ? chalk.red(`    - ${line.text}`)
          : chalk.green(`    + ${line.text}`),
      );
    }
    return;
  }

  // ScalarUpdatePayload and CollectionItemUpdatePayload both have oldValue/newValue
  const oldValue = payload.oldValue as string;
  const newValue = payload.newValue as string;
  const { lines } = formatContentDiff(oldValue, newValue);
  for (const line of lines) {
    log(line);
  }
}

function formatSubmittedDate(isoDate: string): string {
  const date = new Date(isoDate);
  const datePart = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const timePart = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${datePart} ${timePart}`;
}

function buildSubmittedFooter(submittedDiffs: CheckDiffItemResult[]): string {
  const proposalCount = submittedDiffs.length;
  const proposalWord =
    proposalCount === 1 ? 'change proposal' : 'change proposals';

  return `${proposalCount} ${proposalWord} ignored, run \`packmind-cli diff --include-submitted\` to see what's waiting for validation`;
}

/**
 * Finds all target directories under searchPath that contain packmind.json.
 * Checks searchPath itself first, then looks for descendants.
 */
async function findTargetDirectories(
  searchPath: string,
  packmindCliHexa: PackmindCliHexa,
): Promise<string[]> {
  const targets: string[] = [];

  // Check searchPath itself (existence check only, no JSON parsing)
  const exists = await packmindCliHexa.configExists(searchPath);
  if (exists) {
    targets.push(searchPath);
  }

  // Find descendant targets
  const descendants = await packmindCliHexa.findDescendantConfigs(searchPath);
  for (const dir of descendants) {
    if (!targets.includes(dir)) {
      targets.push(dir);
    }
  }

  return targets;
}

/**
 * Computes the relative path of targetAbsDir with respect to gitRoot,
 * formatted as /path/to/dir/ (with leading and trailing slashes).
 */
function computeRelativePath(targetAbsDir: string, gitRoot: string): string {
  const rel = nodePath.relative(gitRoot, targetAbsDir);
  if (rel.startsWith('..')) return '/';
  return rel ? `/${rel}/` : '/';
}

async function collectGitInfo(deps: DiffHandlerDependencies): Promise<{
  gitRemoteUrl: string;
  gitBranch: string;
  gitRoot: string;
} | null> {
  const { packmindCliHexa, exit, getCwd } = deps;
  const cwd = getCwd();

  let gitRemoteUrl: string | undefined;
  let gitBranch: string | undefined;

  const gitRoot = await packmindCliHexa.tryGetGitRepositoryRoot(cwd);
  if (gitRoot) {
    try {
      gitRemoteUrl = packmindCliHexa.getGitRemoteUrlFromPath(gitRoot);
      gitBranch = packmindCliHexa.getCurrentBranch(gitRoot);
    } catch (err) {
      logWarningConsole(
        `Failed to collect git info: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  if (!gitRemoteUrl || !gitBranch || !gitRoot) {
    logErrorConsole(
      'Could not determine git repository info. The diff command requires a git repository with a remote configured.',
    );
    exit(1);
    return null;
  }

  return { gitRemoteUrl, gitBranch, gitRoot };
}

function extractUniqueAndSortedArtefacts(groups: Map<string, ArtefactDiff[]>) {
  const typeSortOrder: Record<ArtifactType, number> = {
    command: 0,
    skill: 1,
    standard: 2,
  };

  const uniqueArtefacts = new Map<
    string,
    { type: ArtifactType; name: string }
  >();
  for (const [key, groupDiffs] of groups) {
    if (!uniqueArtefacts.has(key)) {
      uniqueArtefacts.set(key, {
        type: groupDiffs[0].artifactType,
        name: groupDiffs[0].artifactName,
      });
    }
  }

  const sortedArtefacts = Array.from(uniqueArtefacts.values()).sort(
    (a, b) =>
      typeSortOrder[a.type] - typeSortOrder[b.type] ||
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
  );
  return sortedArtefacts;
}

function displayDiffs(params: {
  diffsToDisplay: ArtefactDiff[];
  displayPathMap: Map<ArtefactDiff, string>;
  submittedLookup: Map<ArtefactDiff, CheckDiffItemResult>;
  includeSubmitted: boolean | undefined;
  unsubmittedItems: CheckDiffItemResult[];
  submittedItems: CheckDiffItemResult[];
  log: typeof console.log;
}): number {
  const {
    diffsToDisplay,
    displayPathMap,
    submittedLookup,
    includeSubmitted,
    unsubmittedItems,
    submittedItems,
    log,
  } = params;

  log(formatHeader(`\nChanges found:\n`));

  const groups = groupDiffsByArtefact(diffsToDisplay);
  for (const [, groupDiffs] of groups) {
    const { artifactType, artifactName } = groupDiffs[0];
    const typeLabel = ARTIFACT_TYPE_LABELS[artifactType];
    log(formatBold(`${typeLabel} "${artifactName}"`));

    const subGroups = subGroupByChangeContent(groupDiffs);
    for (const subGroup of subGroups) {
      for (const diff of subGroup) {
        log(`  ${formatFilePath(displayPathMap.get(diff) ?? diff.filePath)}`);
      }
      const label =
        CHANGE_PROPOSAL_TYPE_LABELS[subGroup[0].type] ?? 'content changed';

      const checkItem = submittedLookup.get(subGroup[0]);
      if (includeSubmitted && checkItem?.exists && checkItem.createdAt) {
        const dateStr = formatSubmittedDate(checkItem.createdAt);
        const messageSuffix = checkItem.message
          ? ` "${checkItem.message.length > 50 ? checkItem.message.slice(0, 50) + '...' : checkItem.message}"`
          : '';
        log(
          `  - ${label} ${chalk.dim(`[already submitted on ${dateStr}${messageSuffix}]`)}`,
        );
      } else {
        log(`  - ${label}`);
      }
      formatDiffPayload(subGroup[0], log);
    }
    log('');
  }

  const changeCount = diffsToDisplay.length;
  const changeWord = changeCount === 1 ? 'change' : 'changes';

  const sortedArtefacts = extractUniqueAndSortedArtefacts(groups);

  const artefactCount = sortedArtefacts.length;
  const artefactWord = artefactCount === 1 ? 'artefact' : 'artefacts';
  const allSubmittedSuffix =
    includeSubmitted && unsubmittedItems.length === 0
      ? ' (all already submitted)'
      : '';
  logWarningConsole(
    `Summary: ${changeCount} ${changeWord} found on ${artefactCount} ${artefactWord}${allSubmittedSuffix}:`,
  );
  for (const artefact of sortedArtefacts) {
    const typeLabel = ARTIFACT_TYPE_LABELS[artefact.type];
    const key = `${artefact.type}:${artefact.name}`;
    const artefactDiffs = groups.get(key) ?? [];
    const allDiffsSubmitted =
      includeSubmitted &&
      artefactDiffs.length > 0 &&
      artefactDiffs.every((d) => submittedLookup.get(d)?.exists);
    const suffix = allDiffsSubmitted ? ' (all already submitted)' : '';
    logWarningConsole(`* ${typeLabel} "${artefact.name}"${suffix}`);
  }

  if (!includeSubmitted && submittedItems.length > 0) {
    logInfoConsole(buildSubmittedFooter(submittedItems));
  }

  return changeCount;
}

export async function diffArtefactsHandler(
  deps: DiffHandlerDependencies,
): Promise<DiffHandlerResult> {
  const { packmindCliHexa, exit, getCwd, log, includeSubmitted } = deps;
  const cwd = getCwd();

  // Compute search path (--path / -p flag)
  const searchPath = nodePath.resolve(cwd, deps.path ?? '.');

  // Validate that the specified path exists
  if (deps.path !== undefined) {
    try {
      await fs.stat(searchPath);
    } catch {
      logErrorConsole(`Path does not exist: ${searchPath}`);
      exit(1);
      return { diffsFound: 0 };
    }
  }

  // Find all target directories under searchPath
  let targetDirs: string[];
  try {
    targetDirs = await findTargetDirectories(searchPath, packmindCliHexa);
  } catch (err) {
    logErrorConsole(
      `Failed to discover target directories: ${err instanceof Error ? err.message : String(err)}`,
    );
    exit(1);
    return { diffsFound: 0 };
  }

  if (targetDirs.length === 0) {
    // Rule 4: distinguish "not in a project" from "no targets under this path"
    const hierarchicalConfig = await packmindCliHexa.readHierarchicalConfig(
      cwd,
      null,
    );
    if (!hierarchicalConfig.hasConfigs) {
      logErrorConsole(
        'Not inside a Packmind project. No packmind.json found in the current directory or any parent directory.',
      );
      exit(1);
    } else {
      log('No Packmind targets found under the current directory.');
      exit(0);
    }
    return { diffsFound: 0 };
  }

  try {
    const gitInfo = await collectGitInfo(deps);
    if (!gitInfo) {
      return { diffsFound: 0 };
    }
    const { gitRemoteUrl, gitBranch, gitRoot } = gitInfo;

    // Process each target and collect diffs
    const targetResults: TargetDiffResult[] = [];

    for (const targetDir of targetDirs) {
      const config = await packmindCliHexa.readFullConfig(targetDir);
      if (!config) continue;

      const configPackages = Object.keys(config.packages);
      if (configPackages.length === 0) continue;

      const relativePath = computeRelativePath(targetDir, gitRoot);
      const targetRelativePath = nodePath.relative(cwd, targetDir);

      if (targetDirs.length > 1) {
        log('');
        logInfoConsole(`Target: ${targetRelativePath}`);
      }

      const packageCount = configPackages.length;
      const packageWord = packageCount === 1 ? 'package' : 'packages';
      logInfoConsole(
        `Comparing ${packageCount} ${packageWord}: ${configPackages.join(', ')}...`,
      );

      const diffs = await packmindCliHexa.diffArtefacts({
        baseDirectory: targetDir,
        packagesSlugs: configPackages,
        gitRemoteUrl,
        gitBranch,
        relativePath,
        agents: config.agents,
      });

      targetResults.push({ targetRelativePath, diffs });
    }

    // Handle case where all targets had no packages configured
    if (targetResults.length === 0) {
      log('No packages configured in any target.');
      exit(0);
      return { diffsFound: 0 };
    }

    // Build display path map: prefix each diff's file path with the target's
    // path relative to cwd, so displayed paths are always relative to where
    // the command was run.
    const displayPathMap = new Map<ArtefactDiff, string>();
    for (const { targetRelativePath, diffs } of targetResults) {
      for (const diff of diffs) {
        displayPathMap.set(
          diff,
          targetRelativePath
            ? `${targetRelativePath}/${diff.filePath}`
            : diff.filePath,
        );
      }
    }

    // Merge all diffs
    const allDiffs = targetResults.flatMap((r) => r.diffs);

    if (allDiffs.length === 0) {
      log('No changes found.');
      exit(0);
      return { diffsFound: 0 };
    }

    // Check which diffs have already been submitted
    const allGroupedDiffs = Array.from(groupDiffsByArtefact(allDiffs).values());
    const checkResult = await packmindCliHexa.checkDiffs(allGroupedDiffs);

    const submittedItems = checkResult.results.filter((r) => r.exists);
    const unsubmittedItems = checkResult.results.filter((r) => !r.exists);

    // Determine which diffs to display
    const diffsToDisplay = includeSubmitted
      ? allDiffs
      : unsubmittedItems.map((r) => r.diff);

    // Build a lookup for submitted status (used with --include-submitted)
    const submittedLookup = new Map<ArtefactDiff, CheckDiffItemResult>();
    for (const item of checkResult.results) {
      submittedLookup.set(item.diff, item);
    }

    if (diffsToDisplay.length === 0) {
      log('No new changes found.');
      if (submittedItems.length > 0) {
        logInfoConsole(buildSubmittedFooter(submittedItems));
      }
      exit(0);
      return { diffsFound: 0 };
    }

    const changeCount = displayDiffs({
      diffsToDisplay,
      displayPathMap,
      submittedLookup,
      includeSubmitted,
      unsubmittedItems,
      submittedItems,
      log,
    });

    exit(0);
    return { diffsFound: changeCount };
  } catch (err) {
    if (err instanceof Error) {
      logErrorConsole(err.message);
    } else {
      logErrorConsole(String(err));
    }
    exit(1);
    return { diffsFound: 0 };
  }
}
