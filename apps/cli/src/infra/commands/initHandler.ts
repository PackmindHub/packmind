import { IConfigFileRepository } from '../../domain/repositories/IConfigFileRepository';
import { IAgentArtifactDetectionService } from '../../application/services/AgentArtifactDetectionService';
import {
  configAgentsHandler,
  ConfigAgentsHandlerDependencies,
} from './config/configAgentsHandler';
import {
  logSuccessConsole,
  logInfoConsole,
  logConsole,
  formatCommand,
  logWarningConsole,
} from '../utils/consoleLogger';
import { IInstallDefaultSkillsResult } from '../../domain/useCases/IInstallDefaultSkillsUseCase';
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';
import {
  EnsureCliVersionOutcome,
  IEnsureCliVersionCommand,
} from '../../domain/useCases/IEnsureCliVersionUseCase';
import { handleIncompatibleInstalledSkillsSilently } from './skills/incompatibleSkillsHandler';
import { reportEnsureCliVersionOutcome } from './ensureCliVersionReporter';
import {
  buildSkillsSkippedWarning,
  configuredAgentsSupportSkills,
} from './skillsCapabilityWarning';
import { TrackRepositoryFunction } from './trackHandler';
import { ConfirmPromptFn, createTrackConfirm } from './trackingPrompts';

export type InstallDefaultSkillsFunction = (options: {
  includeBeta: boolean;
  cliVersion?: string;
}) => Promise<IInstallDefaultSkillsResult>;

export type EnsureCliVersionFunction = (
  command: IEnsureCliVersionCommand,
) => Promise<EnsureCliVersionOutcome>;

export type InitHandlerDependencies = {
  configRepository: IConfigFileRepository;
  agentDetectionService: IAgentArtifactDetectionService;
  packmindGateway: IPackmindGateway;
  baseDirectory: string;
  installDefaultSkills: InstallDefaultSkillsFunction;
  ensureCliVersion?: EnsureCliVersionFunction;
  cliVersion: string;
  isTTY?: boolean;
  showOnboardHint?: boolean;
  trackRepository?: TrackRepositoryFunction;
  confirmPrompt?: ConfirmPromptFn;
};

export type InitHandlerResult = {
  success: boolean;
  errors: string[];
};

/**
 * Handler for the `init` command.
 * Combines agent configuration and skills initialization into a single onboarding flow.
 */
export async function initHandler(
  deps: InitHandlerDependencies,
): Promise<InitHandlerResult> {
  const {
    configRepository,
    agentDetectionService,
    packmindGateway,
    baseDirectory,
    installDefaultSkills,
    ensureCliVersion,
    cliVersion,
    isTTY,
    showOnboardHint = true,
    trackRepository,
    confirmPrompt,
  } = deps;

  const resolvedIsTTY = isTTY ?? Boolean(process.stdin.isTTY);

  if (ensureCliVersion) {
    try {
      const outcome = await ensureCliVersion({
        baseDirectory,
        currentCliVersion: cliVersion,
        includeBeta: false,
      });
      reportEnsureCliVersionOutcome(outcome, cliVersion);
    } catch {
      // Silently swallow drift-check failures; init must continue.
    }
  }

  // Step 1: Run config agents flow
  const configAgentsDeps: ConfigAgentsHandlerDependencies = {
    configRepository,
    agentDetectionService,
    packmindGateway,
    baseDirectory,
    isTTY,
  };

  await configAgentsHandler(configAgentsDeps);

  // Step 2: Skip skills install if no configured agent can render them
  const config = await configRepository.readConfig(baseDirectory);
  const configuredAgents = config?.agents ?? [];

  if (!configuredAgentsSupportSkills(configuredAgents)) {
    logWarningConsole(buildSkillsSkippedWarning(configuredAgents));
  } else {
    logInfoConsole('Installing default skills...');

    const result = await installDefaultSkills({
      includeBeta: false,
      cliVersion,
    });

    if (
      result.incompatibleInstalledSkills &&
      result.incompatibleInstalledSkills.length > 0
    ) {
      await handleIncompatibleInstalledSkillsSilently(
        result.incompatibleInstalledSkills,
        baseDirectory,
      );
    }

    if (result.errors.length > 0) {
      return {
        success: false,
        errors: result.errors,
      };
    }

    const totalFiles = result.filesCreated + result.filesUpdated;

    if (result.skippedSkillsCount > 0) {
      logWarningConsole(
        `${result.skippedSkillsCount} skill(s) were skipped because they require a newer version of packmind-cli. Run "${formatCommand('packmind-cli update')}" to get the latest version.`,
      );
    }

    if (totalFiles === 0) {
      logInfoConsole('Default skills are already up to date.');
    } else {
      logSuccessConsole('Default skills installed successfully!');
      if (result.filesCreated > 0) {
        logInfoConsole(`  Files created: ${result.filesCreated}`);
      }
      if (result.filesUpdated > 0) {
        logInfoConsole(`  Files updated: ${result.filesUpdated}`);
      }
    }
  }

  // Step 3: Offer to track the current repository + branch. Gated on an
  // interactive terminal; the feature flag is enforced server-side (a 404
  // response makes this a silent no-op).
  if (resolvedIsTTY && trackRepository) {
    await offerRepositoryTracking({
      trackRepository,
      baseDirectory,
      isTTY: resolvedIsTTY,
      confirmPrompt,
    });
  }

  // Step 4: Display success message with next steps
  logConsole('');
  logSuccessConsole('Packmind initialized successfully!');
  if (showOnboardHint) {
    logInfoConsole(
      `Next step: Run ${formatCommand('/packmind-onboard')} in your AI agent to onboard the project`,
    );
  }

  return {
    success: true,
    errors: [],
  };
}

/**
 * During `init`, offers to set the current repository+branch as tracked. Reuses
 * the same TrackRepositoryUseCase as the `track` command so orchestration is not
 * duplicated. Init never moves an existing tracked branch (only `track --update`
 * does) and never fails the init flow — any error (feature disabled, not a git
 * repo, no remote, not logged in) is a silent skip.
 */
async function offerRepositoryTracking(deps: {
  trackRepository: TrackRepositoryFunction;
  baseDirectory: string;
  isTTY: boolean;
  confirmPrompt?: ConfirmPromptFn;
}): Promise<void> {
  const confirm = createTrackConfirm({
    isTTY: deps.isTTY,
    confirmPrompt: deps.confirmPrompt,
  });

  try {
    const result = await deps.trackRepository({
      repoPath: deps.baseDirectory,
      origin: 'init',
      update: false,
      confirm,
    });

    switch (result.status) {
      case 'set':
        logSuccessConsole(
          `Packmind now tracks ${result.owner}/${result.repo} on branch ${result.branch}.`,
        );
        break;
      case 'already-tracked-other-branch':
        logInfoConsole(
          `Repository already tracked on branch ${result.trackedBranch}.`,
        );
        break;
      case 'already-tracked-same-branch':
        logWarningConsole(
          `Repository ${result.owner}/${result.repo} is already tracked on branch ${result.branch}.`,
        );
        break;
      case 'cancelled':
      case 'nothing-tracked':
      case 'updated':
      default:
        break;
    }
  } catch {
    // Tracking is best-effort during init: never fail onboarding because the
    // feature is disabled or the repo could not be resolved.
  }
}
