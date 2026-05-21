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
  } = deps;

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

  // Step 3: Display success message with next steps
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
