import { PackmindCliHexa } from '../../PackmindCliHexa';
import { ArtifactType, ChangeProposalType, CodingAgent } from '@packmind/types';
import { ArtefactDiff } from '../../domain/useCases/IDiffArtefactsUseCase';
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
};

export type DiffHandlerResult = {
  diffsFound: number;
};

const ARTIFACT_TYPE_LABELS: Record<ArtifactType, string> = {
  command: 'Command',
  standard: 'Standard',
  skill: 'Skill',
};

const CHANGE_TYPE_LABELS: Partial<Record<ChangeProposalType, string>> = {
  [ChangeProposalType.updateCommandDescription]: 'command content changed',
  [ChangeProposalType.updateSkillName]: 'skill name changed',
  [ChangeProposalType.updateSkillDescription]: 'skill description changed',
  [ChangeProposalType.updateSkillPrompt]: 'skill prompt changed',
  [ChangeProposalType.updateSkillMetadata]: 'skill metadata changed',
  [ChangeProposalType.updateSkillLicense]: 'skill license changed',
  [ChangeProposalType.updateSkillCompatibility]: 'skill compatibility changed',
  [ChangeProposalType.updateSkillAllowedTools]: 'skill allowed tools changed',
  [ChangeProposalType.updateSkillFileContent]: 'skill file content changed',
  [ChangeProposalType.updateSkillFilePermissions]:
    'skill file permissions changed',
  [ChangeProposalType.addSkillFile]: 'new skill file added',
  [ChangeProposalType.deleteSkillFile]: 'skill file deleted',
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

  // ScalarUpdatePayload and CollectionItemUpdatePayload both have oldValue/newValue
  const oldValue = payload.oldValue as string;
  const newValue = payload.newValue as string;
  const { lines } = formatContentDiff(oldValue, newValue);
  for (const line of lines) {
    log(line);
  }
}

export async function diffArtefactsHandler(
  deps: DiffHandlerDependencies,
): Promise<DiffHandlerResult> {
  const { packmindCliHexa, exit, getCwd, log, error, submit } = deps;
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

    log(formatHeader(`\nChanges found:\n`));

    const groups = groupDiffsByArtefact(diffs);
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
        const label = CHANGE_TYPE_LABELS[subGroup[0].type] ?? 'content changed';
        log(`  - ${label}`);
        formatDiffPayload(subGroup[0], log);
      }
      log('');
    }

    const changeCount = diffs.length;
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

    if (submit) {
      const groupedDiffs = Array.from(groupDiffsByArtefact(diffs).values());
      const result = await packmindCliHexa.submitDiffs(groupedDiffs);

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
