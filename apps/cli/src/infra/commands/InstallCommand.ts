import { command, restPositionals, string, option, flag } from 'cmd-ts';
import * as path from 'path';
import * as fs from 'fs';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import {
  logConsole,
  logErrorConsole,
  logInfoConsole,
  logWarningConsole,
  formatCommand,
} from '../utils/consoleLogger';
import { parseOwnerRepo } from '../../application/useCases/trackRepository/TrackRepositoryUseCase';
import { IInstallResult } from '../../domain/useCases/IInstallUseCase';
import {
  statusHandler,
  InstallHandlerDependencies,
} from './installPackagesHandler';
import { CodingAgent, PackmindLockFile } from '@packmind/types';
import {
  buildInstallSummary,
  buildIncapableArtifactsWarning,
} from './installSummary';
import { ConfigFileRepository } from '../repositories/ConfigFileRepository';
import { IConfigFileRepository } from '../../domain/repositories/IConfigFileRepository';
import { AgentArtifactDetectionService } from '../../application/services/AgentArtifactDetectionService';
import { bootstrapInstallContext } from './bootstrapInstallContext';
import { handleIncompatibleInstalledSkillsSilently } from './skills/incompatibleSkillsHandler';
import { reportEnsureCliVersionOutcome } from './ensureCliVersionReporter';
import {
  buildSkillsSkippedWarning,
  configuredAgentsSupportSkills,
} from './skillsCapabilityWarning';
import { isAgentHomeDirectory } from '../utils/agentHomeDirectory';
import { PackageSlugArgType } from './customParameters/PackageSlugArgType';
import {
  displayableParsedPackageSlug,
  ParsedPackageSlug,
} from '../../domain/entities/PackageSlug';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { version: CLI_VERSION } = require('../../../package.json');

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

export function mergeInstallResults(results: IInstallResult[]): IInstallResult {
  const merged: IInstallResult = {
    filesCreated: 0,
    filesUpdated: 0,
    filesDeleted: 0,
    contentFilesChanged: 0,
    errors: [],
    recipesCount: 0,
    standardsCount: 0,
    commandsCount: 0,
    skillsCount: 0,
    skillsChanged: 0,
    standardsChanged: 0,
    commandsChanged: 0,
    recipesRemoved: 0,
    standardsRemoved: 0,
    commandsRemoved: 0,
    skillsRemoved: 0,
    skillDirectoriesDeleted: 0,
    missingAccess: [],
    joinSpaceUrl: undefined,
    configCreated: false,
    packagesAdded: [],
    sourceArtifacts: {
      skillsCount: 0,
      standardsCount: 0,
      commandsCount: 0,
      recipesCount: 0,
    },
    resolvedAgents: [],
  };

  const packagesAddedSet = new Set<string>();
  const resolvedAgentsSet = new Set<CodingAgent>();

  for (const r of results) {
    merged.filesCreated += r.filesCreated;
    merged.filesUpdated += r.filesUpdated;
    merged.filesDeleted += r.filesDeleted;
    merged.contentFilesChanged += r.contentFilesChanged;
    merged.errors.push(...r.errors);
    merged.recipesCount += r.recipesCount;
    merged.standardsCount += r.standardsCount;
    merged.commandsCount += r.commandsCount;
    merged.skillsCount += r.skillsCount;
    merged.skillsChanged += r.skillsChanged;
    merged.standardsChanged += r.standardsChanged;
    merged.commandsChanged += r.commandsChanged;
    merged.recipesRemoved += r.recipesRemoved;
    merged.standardsRemoved += r.standardsRemoved;
    merged.commandsRemoved += r.commandsRemoved;
    merged.skillsRemoved += r.skillsRemoved;
    merged.skillDirectoriesDeleted += r.skillDirectoriesDeleted;
    merged.missingAccess.push(...r.missingAccess);

    merged.configCreated = merged.configCreated || r.configCreated;
    r.packagesAdded.forEach((p) => packagesAddedSet.add(p));
    merged.sourceArtifacts.skillsCount += r.sourceArtifacts.skillsCount;
    merged.sourceArtifacts.standardsCount += r.sourceArtifacts.standardsCount;
    merged.sourceArtifacts.commandsCount += r.sourceArtifacts.commandsCount;
    merged.sourceArtifacts.recipesCount += r.sourceArtifacts.recipesCount;
    r.resolvedAgents.forEach((a) => resolvedAgentsSet.add(a));
  }

  merged.missingAccess = [...new Set(merged.missingAccess)];
  merged.packagesAdded = [...packagesAddedSet];
  merged.resolvedAgents = [...resolvedAgentsSet];

  const urlsFromResultsWithMissingAccess = results
    .filter((r) => r.missingAccess.length > 0)
    .map((r) => r.joinSpaceUrl);
  const uniqueUrls = new Set(urlsFromResultsWithMissingAccess.filter(Boolean));
  if (
    uniqueUrls.size === 1 &&
    !urlsFromResultsWithMissingAccess.some((u) => u === undefined)
  ) {
    merged.joinSpaceUrl = [...uniqueUrls][0];
  }

  return merged;
}

type TrackingLookup =
  | { status: 'flag-off' }
  | { status: 'resolved'; trackedGitRepo: { branch: string } | null }
  | { status: 'unavailable' };

export type DistributionTrackingDecision =
  | { action: 'record' }
  | { action: 'record-legacy' }
  | { action: 'skip'; reason: 'repo_not_tracked' }
  | { action: 'skip'; reason: 'wrong_branch'; trackedBranch: string }
  | { action: 'inform' };

export function decideDistributionTracking(params: {
  lookup: TrackingLookup;
  currentBranch: string;
}): DistributionTrackingDecision {
  const { lookup, currentBranch } = params;

  switch (lookup.status) {
    case 'flag-off':
      return { action: 'record-legacy' };
    case 'unavailable':
      return { action: 'inform' };
    case 'resolved': {
      const tracked = lookup.trackedGitRepo;
      if (!tracked) {
        return { action: 'skip', reason: 'repo_not_tracked' };
      }
      if (tracked.branch !== currentBranch) {
        return {
          action: 'skip',
          reason: 'wrong_branch',
          trackedBranch: tracked.branch,
        };
      }
      return { action: 'record' };
    }
  }
}

const NO_GIT_REPO_CACHE_KEY = '<no-git-repo>';

function toRepoRelativePath(dir: string, gitRoot: string): string {
  let relativePath = dir.startsWith(gitRoot) ? dir.slice(gitRoot.length) : '/';
  if (!relativePath.startsWith('/')) {
    relativePath = '/' + relativePath;
  }
  if (!relativePath.endsWith('/')) {
    relativePath = relativePath + '/';
  }
  return relativePath;
}

function reportDistributionTrackingDecision(
  decision: DistributionTrackingDecision,
  context: { owner?: string; repo?: string; currentBranch?: string },
): void {
  switch (decision.action) {
    case 'skip':
      if (decision.reason === 'repo_not_tracked') {
        logWarningConsole(
          `Distribution not recorded — ${context.owner}/${context.repo} is not tracked in Packmind. Ask an admin to run ${formatCommand(
            'packmind track',
          )} to start tracking it.`,
        );
      } else {
        logWarningConsole(
          `Distribution not recorded — you're on '${context.currentBranch}', but the tracked branch is '${decision.trackedBranch}'. Switch to '${decision.trackedBranch}' to record this distribution.`,
        );
      }
      break;
    case 'inform':
      logInfoConsole(
        `This folder is not tracked — distribution not recorded in Packmind.`,
      );
      break;
  }
}

async function resolveTrackingLookup(
  packmindCliHexa: PackmindCliHexa,
  owner: string,
  repo: string,
): Promise<TrackingLookup> {
  try {
    const { gitRepo } = await packmindCliHexa.getTrackedRepository({
      owner,
      repo,
    });
    return { status: 'resolved', trackedGitRepo: gitRepo };
  } catch (error) {
    const statusCode = (error as { statusCode?: number })?.statusCode;
    if (statusCode === 404) {
      return { status: 'flag-off' };
    }
    return { status: 'unavailable' };
  }
}

async function computeDistributionTrackingDecision(
  packmindCliHexa: PackmindCliHexa,
  gitRoot: string | null,
): Promise<DistributionTrackingDecision> {
  if (!gitRoot) {
    const decision: DistributionTrackingDecision = { action: 'inform' };
    reportDistributionTrackingDecision(decision, {});
    return decision;
  }

  let owner: string;
  let repo: string;
  let gitBranch: string;
  try {
    const gitRemoteUrl = packmindCliHexa.getGitRemoteUrlFromPath(gitRoot);
    gitBranch = packmindCliHexa.getCurrentBranch(gitRoot);
    ({ owner, repo } = parseOwnerRepo(gitRemoteUrl));
  } catch {
    const decision: DistributionTrackingDecision = { action: 'inform' };
    reportDistributionTrackingDecision(decision, {});
    return decision;
  }

  const lookup = await resolveTrackingLookup(packmindCliHexa, owner, repo);
  const decision = decideDistributionTracking({
    lookup,
    currentBranch: gitBranch,
  });
  reportDistributionTrackingDecision(decision, {
    owner,
    repo,
    currentBranch: gitBranch,
  });
  return decision;
}

async function notifyArtefactsDistributionIfInGitRepo(params: {
  packmindCliHexa: PackmindCliHexa;
  dir: string;
  decisionCache: Map<string, DistributionTrackingDecision>;
}): Promise<void> {
  const { packmindCliHexa, dir, decisionCache } = params;
  try {
    const gitRoot = await packmindCliHexa.tryGetGitRepositoryRoot(dir);
    const cacheKey = gitRoot ?? NO_GIT_REPO_CACHE_KEY;

    if (!decisionCache.has(cacheKey)) {
      decisionCache.set(
        cacheKey,
        await computeDistributionTrackingDecision(packmindCliHexa, gitRoot),
      );
    }

    const decision = decisionCache.get(cacheKey);
    if (
      !decision ||
      (decision.action !== 'record' && decision.action !== 'record-legacy')
    ) {
      return;
    }

    if (!gitRoot) return;

    const lockFilePath = path.join(dir, 'packmind-lock.json');
    const content = fs.readFileSync(lockFilePath, 'utf-8');
    const packmindLockFile = JSON.parse(content) as PackmindLockFile;

    const gitRemoteUrl = packmindCliHexa.getGitRemoteUrlFromPath(gitRoot);
    const gitBranch = packmindCliHexa.getCurrentBranch(gitRoot);
    const relativePath = toRepoRelativePath(dir, gitRoot);

    await packmindCliHexa.notifyArtefactsDistribution({
      gitRemoteUrl,
      gitBranch,
      relativePath,
      packmindLockFile,
    });
  } catch {
    // Silently ignore all errors to not fail the install
  }
}

async function installDefaultSkillsIfAtGitRoot(params: {
  packmindCliHexa: PackmindCliHexa;
  cwd: string;
  configRepository: IConfigFileRepository;
  resolvedAgents: CodingAgent[];
}): Promise<void> {
  const { packmindCliHexa, cwd, configRepository, resolvedAgents } = params;

  const gitRoot = await packmindCliHexa.tryGetGitRepositoryRoot(cwd);

  if (!gitRoot || cwd !== gitRoot) {
    return;
  }

  // Prefer the server-resolved agents from the package install (they already
  // include the organisation-level fallback). Only fall back to reading
  // config.agents on the edge case where no install actually ran — e.g. a
  // cleanup with packagesSlugs.length === 0 — so the prior local behaviour
  // is preserved.
  let agents: CodingAgent[] = resolvedAgents;
  if (agents.length === 0) {
    const config = await configRepository.readConfig(cwd);
    agents = config?.agents ?? [];
  }

  if (!configuredAgentsSupportSkills(agents)) {
    logWarningConsole(buildSkillsSkippedWarning(agents));
    return;
  }

  try {
    const skillsResult = await packmindCliHexa.installDefaultSkills({
      cliVersion: CLI_VERSION,
      baseDirectory: cwd,
      agents,
    });

    if (skillsResult.incompatibleInstalledSkills.length > 0) {
      await handleIncompatibleInstalledSkillsSilently(
        skillsResult.incompatibleInstalledSkills,
        cwd,
      );
    }

    if (skillsResult.errors.length > 0) {
      skillsResult.errors.forEach((err) => {
        logWarningConsole(`Warning: ${err}`);
      });
    }

    const totalSkillFiles =
      skillsResult.filesCreated + skillsResult.filesUpdated;
    // Stay silent when nothing happened — otherwise the user reads a
    // contradictory "Already up to date" + "Installing default skills..."
    // narrative in the same turn.
    if (totalSkillFiles > 0) {
      logConsole(
        `Default skills: added ${skillsResult.filesCreated} files, changed ${skillsResult.filesUpdated} files`,
      );
    }
  } catch {
    // Silently ignore default skills installation errors as it's a secondary operation
  }
}

export async function installHandler({
  installPath,
  packages,
  status,
}: {
  installPath: string;
  packages: ParsedPackageSlug[];
  status: boolean;
}): Promise<void> {
  const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
  const packmindCliHexa = new PackmindCliHexa(packmindLogger);

  if (status) {
    const deps: InstallHandlerDependencies = {
      packmindCliHexa,
      exit: process.exit,
      getCwd: () => process.cwd(),
      log: console.log,
      error: console.error,
    };
    await statusHandler({}, deps);
    return;
  }

  const cwd = installPath
    ? path.resolve(process.cwd(), installPath)
    : process.cwd();

  if (installPath) {
    if (!fs.existsSync(cwd)) {
      logErrorConsole(`Path does not exist: ${cwd}`);
      process.exit(1);
      return;
    }
    if (!fs.statSync(cwd).isDirectory()) {
      logErrorConsole(`Path is not a directory: ${cwd}`);
      process.exit(1);
      return;
    }
  }

  try {
    const ensureOutcome = await packmindCliHexa.ensureCliVersion({
      baseDirectory: cwd,
      currentCliVersion: CLI_VERSION,
      includeBeta: false,
    });
    reportEnsureCliVersionOutcome(ensureOutcome, CLI_VERSION);
  } catch {
    // Silently swallow drift-check failures; install must continue.
  }

  const configRepository = new ConfigFileRepository();
  const cwdHomeAgent = isAgentHomeDirectory(cwd) ?? undefined;

  const bootstrap = await bootstrapInstallContext({
    configRepository,
    agentDetectionService: new AgentArtifactDetectionService(),
    packmindGateway: packmindCliHexa.getPackmindGateway(),
    baseDirectory: cwd,
    packages: packages.map(displayableParsedPackageSlug),
    isTTY: process.stdin.isTTY ?? false,
    installDefaultSkills:
      packmindCliHexa.installDefaultSkills.bind(packmindCliHexa),
    cliVersion: CLI_VERSION,
    homeAgent: cwdHomeAgent,
  });

  // Determine target directories
  let targetDirs: string[];

  if (installPath) {
    // With -p: target cwd itself when it has packmind.json or explicit packages
    // were passed, plus any direct sub-directories with packmind.json.
    targetDirs = [];
    if (fs.existsSync(path.join(cwd, 'packmind.json')) || packages.length > 0) {
      targetDirs.push(cwd);
    }
    targetDirs.push(...findSubDirectoriesWithPackmindJson(cwd, false));
  } else if (packages.length > 0) {
    // With explicit packages: only update the cwd's packmind.json
    targetDirs = [cwd];
  } else {
    // Without -p and without explicit packages: include root if it has packmind.json, then recursively find sub-directories
    targetDirs = [];
    if (fs.existsSync(path.join(cwd, 'packmind.json'))) {
      targetDirs.push(cwd);
    }
    targetDirs.push(...findSubDirectoriesWithPackmindJson(cwd, true));
  }

  if (targetDirs.length === 0) {
    if (bootstrap.warned) {
      return;
    }
    logErrorConsole(
      'No packmind.json found in the current directory or its sub-directories.',
    );
    process.exit(1);
  }

  const results: IInstallResult[] = [];
  const thrownErrors: string[] = [];
  const multiDir = targetDirs.length > 1;
  const distributionTrackingCache = new Map<
    string,
    DistributionTrackingDecision
  >();

  for (const dir of targetDirs) {
    try {
      const dirHomeAgent = isAgentHomeDirectory(dir) ?? undefined;
      const result = await packmindCliHexa.install({
        baseDirectory: dir,
        packages: packages.length > 0 ? packages : undefined,
        cliVersion: CLI_VERSION,
        homeAgent: dirHomeAgent,
      });
      results.push(result);

      if (!dirHomeAgent) {
        await notifyArtefactsDistributionIfInGitRepo({
          packmindCliHexa,
          dir,
          decisionCache: distributionTrackingCache,
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      thrownErrors.push(
        multiDir
          ? `[${dir}] install failed: ${errorMessage}`
          : `install failed: ${errorMessage}`,
      );
    }
  }

  const combined = mergeInstallResults(results);

  // Merge bootstrap-induced changes into the summary so users see "config
  // created" / "packages added" even when bootstrap pre-populated packmind.json
  // before the install use case ran.
  if (bootstrap.configCreated) {
    combined.configCreated = true;
  }
  if (bootstrap.packagesAdded.length > 0) {
    const merged = new Set(combined.packagesAdded);
    bootstrap.packagesAdded.forEach((p) => merged.add(p));
    combined.packagesAdded = [...merged];
  }

  if (combined.missingAccess.length > 0) {
    let warning =
      `⚠️  You don't have access to the following packages (their artifacts were preserved from the lock file):\n` +
      combined.missingAccess.map((s) => `  - ${s}`).join('\n');

    if (combined.joinSpaceUrl) {
      warning += `\n\n  👉 Join the space to get access: ${combined.joinSpaceUrl}`;
    }

    logWarningConsole(warning);
  }

  if (results.length > 0) {
    const capabilityWarning = buildIncapableArtifactsWarning(combined);
    if (capabilityWarning) {
      logWarningConsole(capabilityWarning);
    }
    logConsole(buildInstallSummary(combined));
    if (!cwdHomeAgent) {
      await installDefaultSkillsIfAtGitRoot({
        packmindCliHexa,
        cwd,
        configRepository,
        resolvedAgents: combined.resolvedAgents,
      });
    }
  }

  const allErrors = [...combined.errors, ...thrownErrors];

  if (allErrors.length > 0) {
    logWarningConsole(`Encountered ${allErrors.length} error(s):`);
    allErrors.forEach((err) => logErrorConsole(`  - ${err}`));
  }

  if (thrownErrors.length > 0) {
    process.exit(1);
  }
}

export const installCommand = command({
  name: 'install',
  aliases: ['pull'],
  description: 'Install packages and save their artifacts locally',
  args: {
    installPath: option({
      type: string,
      short: 'p',
      long: 'path',
      defaultValue: () => '',
      description:
        'Run install in the specified directory instead of the current directory',
    }),
    packages: restPositionals({
      type: PackageSlugArgType,
      displayName: 'packages',
      description: 'Package slugs to install (e.g. @my-space/my-package)',
    }),
    status: flag({
      long: 'status',
      description:
        'Show status of all packmind.json files and their packages in the workspace',
    }),
  },
  handler: installHandler,
});
