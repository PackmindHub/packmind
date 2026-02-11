import { PackmindCliHexa } from '../../PackmindCliHexa';
import {
  ArtifactType,
  CodingAgent,
  ScalarUpdatePayload,
} from '@packmind/types';
import { ArtefactDiff } from '../../domain/useCases/IDiffArtefactsUseCase';
import {
  logWarningConsole,
  logInfoConsole,
  formatHeader,
  formatBold,
  formatFilePath,
} from '../utils/consoleLogger';
import { formatContentDiff } from '../utils/diffFormatter';

export type DiffHandlerDependencies = {
  packmindCliHexa: PackmindCliHexa;
  exit: (code: number) => void;
  getCwd: () => string;
  log: typeof console.log;
  error: typeof console.error;
};

export type DiffHandlerResult = {
  diffsFound: number;
};

const ARTIFACT_TYPE_LABELS: Record<ArtifactType, string> = {
  command: 'Command',
  standard: 'Standard',
  skill: 'Skill',
};

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

export async function diffArtefactsHandler(
  deps: DiffHandlerDependencies,
): Promise<DiffHandlerResult> {
  const { packmindCliHexa, exit, getCwd, log, error } = deps;
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
      exit(0);
      return { diffsFound: 0 };
    }

    log(formatHeader(`\nChanges found:\n`));

    const groups = groupDiffsByArtefact(diffs);
    for (const [, groupDiffs] of groups) {
      const { artifactType, artifactName } = groupDiffs[0];
      const typeLabel = ARTIFACT_TYPE_LABELS[artifactType];
      log(formatBold(`${typeLabel} "${artifactName}"`));

      const showFilePaths = groupDiffs.length > 1;
      for (const diff of groupDiffs) {
        if (showFilePaths) {
          log(`  ${formatFilePath(diff.filePath)}`);
        }
        log('  - content changed');
        const payload = diff.payload as ScalarUpdatePayload;
        const { lines } = formatContentDiff(payload.oldValue, payload.newValue);
        for (const line of lines) {
          log(line);
        }
      }
      log('');
    }

    const changeWord = diffs.length === 1 ? 'change' : 'changes';
    logWarningConsole(`Summary: ${diffs.length} ${changeWord} found`);

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
