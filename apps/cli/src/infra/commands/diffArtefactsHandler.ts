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
  [ChangeProposalType.updateSkillFileContent]: 'skill file content changed',
  [ChangeProposalType.updateSkillFilePermissions]:
    'skill file permissions changed',
  [ChangeProposalType.addSkillFile]: 'new skill file added',
  [ChangeProposalType.deleteSkillFile]: 'skill file deleted',
};

function subGroupByChangeContent(diffs: ArtefactDiff[]): ArtefactDiff[][] {
  const subGroups: ArtefactDiff[][] = [];
  for (const diff of diffs) {
    const payloadKey = JSON.stringify({
      type: diff.type,
      payload: diff.payload,
    });
    const existing = subGroups.find(
      (group) =>
        JSON.stringify({ type: group[0].type, payload: group[0].payload }) ===
        payloadKey,
    );
    if (existing) {
      existing.push(diff);
    } else {
      subGroups.push([diff]);
    }
  }
  return subGroups;
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
      for (const line of item.content.split('\n')) {
        log(chalk.red(`    - ${line}`));
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
    // Collect git info
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
      } catch {
        // Git info collection failed, continue without it
      }
    }

    const packageCount = configPackages.length;
    const packageWord = packageCount === 1 ? 'package' : 'packages';
    logInfoConsole(
      `Comparing ${packageCount} ${packageWord}: ${configPackages.join(', ')}...`,
    );

    const diffs = await packmindCliHexa.diffArtefacts({
      baseDirectory: cwd,
      packagesSlugs: configPackages,
      previousPackagesSlugs: configPackages,
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

    const changeWord = diffs.length === 1 ? 'change' : 'changes';
    logWarningConsole(`Summary: ${diffs.length} ${changeWord} found`);

    if (submit) {
      const groupedDiffs = Array.from(groupDiffsByArtefact(diffs).values());
      const result = await packmindCliHexa.submitDiffs(groupedDiffs);

      for (const skip of result.skipped) {
        logWarningConsole(`Skipped "${skip.name}": ${skip.reason}`);
      }

      for (const err of result.errors) {
        logErrorConsole(`Failed to submit "${err.name}": ${err.message}`);
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

      const summaryMessage = `Summary: ${summaryParts.join(', ')}`;
      if (result.errors.length > 0) {
        logErrorConsole(summaryMessage);
      } else if (result.alreadySubmitted > 0) {
        logWarningConsole(summaryMessage);
      } else {
        logInfoConsole(summaryMessage);
      }
    }

    exit(0);
    return { diffsFound: diffs.length };
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
