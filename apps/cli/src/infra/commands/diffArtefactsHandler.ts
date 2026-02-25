import { PackmindCliHexa } from '../../PackmindCliHexa';
import {
  ArtifactType,
  CHANGE_PROPOSAL_TYPE_LABELS,
  ChangeProposalPayload,
  ChangeProposalType,
  CodingAgent,
} from '@packmind/types';
import { ArtefactDiff } from '../../domain/useCases/IDiffArtefactsUseCase';
import { CheckDiffItemResult } from '../../domain/useCases/ICheckDiffsUseCase';
import {
  logWarningConsole,
  logInfoConsole,
  logErrorConsole,
  formatHeader,
  formatBold,
  formatFilePath,
  logSuccessConsole,
} from '../utils/consoleLogger';
import { formatContentDiff } from '../utils/diffFormatter';
import chalk from 'chalk';

export type DiffHandlerDependencies = {
  packmindCliHexa: PackmindCliHexa;
  exit: (code: number) => void;
  getCwd: () => string;
  log: typeof console.log;
  error: typeof console.error;
  submit?: boolean;
  includeSubmitted?: boolean;
};

export type DiffHandlerResult = {
  diffsFound: number;
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
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function buildSubmittedFooter(submittedDiffs: CheckDiffItemResult[]): string[] {
  const lines: string[] = [];

  // Group submitted diffs by artifact
  const byArtefact = new Map<
    string,
    { type: ArtifactType; name: string; changeTypes: ChangeProposalType[] }
  >();
  for (const item of submittedDiffs) {
    const key = `${item.diff.artifactType}:${item.diff.artifactName}`;
    const existing = byArtefact.get(key);
    if (existing) {
      existing.changeTypes.push(item.diff.type);
    } else {
      byArtefact.set(key, {
        type: item.diff.artifactType,
        name: item.diff.artifactName,
        changeTypes: [item.diff.type],
      });
    }
  }

  const artefactCount = byArtefact.size;
  const proposalCount = submittedDiffs.length;
  const proposalWord =
    proposalCount === 1 ? 'change proposal' : 'change proposals';
  const artefactWord = artefactCount === 1 ? 'artifact' : 'artifacts';

  lines.push(
    `${proposalCount} ${proposalWord} already submitted for ${artefactCount} ${artefactWord}, run "packmind-cli diff --include-submitted" to see details`,
  );

  for (const [, artefact] of byArtefact) {
    const typeLabel = ARTIFACT_TYPE_LABELS[artefact.type];
    // Count occurrences of each change type
    const typeCounts = new Map<ChangeProposalType, number>();
    for (const ct of artefact.changeTypes) {
      typeCounts.set(ct, (typeCounts.get(ct) ?? 0) + 1);
    }
    const parts: string[] = [];
    for (const [ct, count] of typeCounts) {
      const label = CHANGE_PROPOSAL_TYPE_LABELS[ct] ?? 'content changed';
      parts.push(count > 1 ? `${label} (${count})` : label);
    }
    lines.push(`  ${typeLabel} "${artefact.name}": ${parts.join(', ')}`);
  }

  return lines;
}

export async function diffArtefactsHandler(
  deps: DiffHandlerDependencies,
): Promise<DiffHandlerResult> {
  const {
    packmindCliHexa,
    exit,
    getCwd,
    log,
    error,
    submit,
    includeSubmitted,
  } = deps;
  const cwd = getCwd();

  // Read existing config (including agents if present)
  let configPackages: string[];
  let configAgents: CodingAgent[] | undefined;
  try {
    const fullConfig = await packmindCliHexa.readFullConfig(cwd);
    if (fullConfig) {
      configPackages = Object.keys(fullConfig.packages);
      configAgents = fullConfig.agents;
    } else {
      configPackages = [];
    }
  } catch (err) {
    error('ERROR Failed to parse packmind.json');
    if (err instanceof Error) {
      error(`ERROR ${err.message}`);
    } else {
      error(`ERROR ${String(err)}`);
    }
    error('\n💡 Please fix the packmind.json file or delete it to continue.');
    exit(1);
    return { diffsFound: 0 };
  }

  if (configPackages.length === 0) {
    log('Usage: packmind-cli diff');
    log('');
    log('Compare local command files against the server.');
    log('Configure packages in packmind.json first.');
    exit(0);
    return { diffsFound: 0 };
  }

  try {
    // Collect git info (required for deployed content lookup)
    let gitRemoteUrl: string | undefined;
    let gitBranch: string | undefined;
    let relativePath: string | undefined;

    const gitRoot = await packmindCliHexa.tryGetGitRepositoryRoot(cwd);
    if (gitRoot) {
      try {
        gitRemoteUrl = packmindCliHexa.getGitRemoteUrlFromPath(gitRoot);
        gitBranch = packmindCliHexa.getCurrentBranch(gitRoot);

        relativePath = cwd.startsWith(gitRoot)
          ? cwd.slice(gitRoot.length)
          : '/';
        if (!relativePath.startsWith('/')) {
          relativePath = '/' + relativePath;
        }
        if (!relativePath.endsWith('/')) {
          relativePath = relativePath + '/';
        }
      } catch (err) {
        logWarningConsole(
          `Failed to collect git info: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    if (!gitRemoteUrl || !gitBranch || !relativePath) {
      error(
        '\n❌ Could not determine git repository info. The diff command requires a git repository with a remote configured.',
      );
      exit(1);
      return { diffsFound: 0 };
    }

    const packageCount = configPackages.length;
    const packageWord = packageCount === 1 ? 'package' : 'packages';
    logInfoConsole(
      `Comparing ${packageCount} ${packageWord}: ${configPackages.join(', ')}...`,
    );

    const diffs = await packmindCliHexa.diffArtefacts({
      baseDirectory: cwd,
      packagesSlugs: configPackages,
      gitRemoteUrl,
      gitBranch,
      relativePath,
      agents: configAgents,
    });

    if (diffs.length === 0) {
      log('No changes found.');
      if (submit) {
        logInfoConsole('No changes to submit.');
      }
      exit(0);
      return { diffsFound: 0 };
    }

    // Check which diffs have already been submitted
    const allGroupedDiffs = Array.from(groupDiffsByArtefact(diffs).values());
    const checkResult = await packmindCliHexa.checkDiffs(allGroupedDiffs);

    const submittedItems = checkResult.results.filter((r) => r.exists);
    const unsubmittedItems = checkResult.results.filter((r) => !r.exists);

    // Determine which diffs to display
    const diffsToDisplay = includeSubmitted
      ? diffs
      : unsubmittedItems.map((r) => r.diff);

    // Build a lookup for submitted status (used with --include-submitted)
    const submittedLookup = new Map<ArtefactDiff, CheckDiffItemResult>();
    for (const item of checkResult.results) {
      submittedLookup.set(item.diff, item);
    }

    if (diffsToDisplay.length === 0) {
      log('No new changes found.');
      if (submittedItems.length > 0) {
        const footerLines = buildSubmittedFooter(submittedItems);
        for (const line of footerLines) {
          logInfoConsole(line);
        }
      }
      if (submit) {
        logInfoConsole('All changes already submitted.');
      }
      exit(0);
      return { diffsFound: 0 };
    }

    log(formatHeader(`\nChanges found:\n`));

    const groups = groupDiffsByArtefact(diffsToDisplay);
    for (const [, groupDiffs] of groups) {
      const { artifactType, artifactName } = groupDiffs[0];
      const typeLabel = ARTIFACT_TYPE_LABELS[artifactType];
      log(formatBold(`${typeLabel} "${artifactName}"`));

      // Sub-group by change type + payload to deduplicate identical changes across agent folders
      const subGroups = subGroupByChangeContent(groupDiffs);
      for (const subGroup of subGroups) {
        for (const diff of subGroup) {
          log(`  ${formatFilePath(diff.filePath)}`);
        }
        const label =
          CHANGE_PROPOSAL_TYPE_LABELS[subGroup[0].type] ?? 'content changed';

        // Add submitted tag if --include-submitted and the diff was already submitted
        const checkItem = submittedLookup.get(subGroup[0]);
        if (includeSubmitted && checkItem?.exists && checkItem.createdAt) {
          const dateStr = formatSubmittedDate(checkItem.createdAt);
          log(`  - ${label} ${chalk.dim(`[already submitted on ${dateStr}]`)}`);
        } else {
          log(`  - ${label}`);
        }
        formatDiffPayload(subGroup[0], log);
      }
      log('');
    }

    const changeCount = diffsToDisplay.length;
    const changeWord = changeCount === 1 ? 'change' : 'changes';

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

    const artefactCount = sortedArtefacts.length;
    const artefactWord = artefactCount === 1 ? 'artefact' : 'artefacts';
    logWarningConsole(
      `Summary: ${changeCount} ${changeWord} found on ${artefactCount} ${artefactWord}:`,
    );
    for (const artefact of sortedArtefacts) {
      const typeLabel = ARTIFACT_TYPE_LABELS[artefact.type];
      logWarningConsole(`* ${typeLabel} "${artefact.name}"`);
    }

    // Show footer about submitted diffs (when not --include-submitted)
    if (!includeSubmitted && submittedItems.length > 0) {
      const footerLines = buildSubmittedFooter(submittedItems);
      for (const line of footerLines) {
        logInfoConsole(line);
      }
    }

    if (submit) {
      // Only submit unsubmitted diffs
      const unsubmittedDiffs = unsubmittedItems.map((r) => r.diff);

      if (unsubmittedDiffs.length === 0) {
        logInfoConsole('All changes already submitted.');
      } else {
        const groupedUnsubmitted = Array.from(
          groupDiffsByArtefact(unsubmittedDiffs).values(),
        );
        const result = await packmindCliHexa.submitDiffs(groupedUnsubmitted);

        for (const err of result.errors) {
          if (err.code === 'ChangeProposalPayloadMismatchError') {
            logErrorConsole(
              `Failed to submit "${err.name}": ${err.artifactType ?? 'artifact'} is outdated, please run \`packmind-cli install\` to update it`,
            );
          } else {
            logErrorConsole(`Failed to submit "${err.name}": ${err.message}`);
          }
        }

        const summaryParts: string[] = [];
        if (result.submitted > 0) {
          summaryParts.push(`${result.submitted} submitted`);
        }
        if (result.alreadySubmitted > 0) {
          summaryParts.push(`${result.alreadySubmitted} already submitted`);
        }
        if (result.errors.length > 0) {
          const errorWord = result.errors.length === 1 ? 'error' : 'errors';
          summaryParts.push(`${result.errors.length} ${errorWord}`);
        }

        if (summaryParts.length > 0) {
          const summaryMessage = `Summary: ${summaryParts.join(', ')}`;
          if (result.errors.length === 0 && result.alreadySubmitted === 0) {
            logSuccessConsole(summaryMessage);
          } else if (
            (result.errors.length > 0 && result.submitted > 0) ||
            result.alreadySubmitted > 0
          ) {
            logWarningConsole(summaryMessage);
          } else {
            logErrorConsole(summaryMessage);
          }
        }
      }
    }

    exit(0);
    return { diffsFound: changeCount };
  } catch (err) {
    error('\n❌ Failed to diff:');
    if (err instanceof Error) {
      error(`   ${err.message}`);
    } else {
      error(`   ${String(err)}`);
    }
    exit(1);
    return { diffsFound: 0 };
  }
}
