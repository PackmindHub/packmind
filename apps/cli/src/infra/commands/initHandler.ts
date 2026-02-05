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
} from '../utils/consoleLogger';
import { IInstallDefaultSkillsResult } from '../../domain/useCases/IInstallDefaultSkillsUseCase';

export type InstallDefaultSkillsFunction = (options: {
  includeBeta: boolean;
  cliVersion?: string;
}) => Promise<IInstallDefaultSkillsResult>;

export type InitHandlerDependencies = {
  configRepository: IConfigFileRepository;
  agentDetectionService: IAgentArtifactDetectionService;
  baseDirectory: string;
  installDefaultSkills: InstallDefaultSkillsFunction;
  cliVersion: string;
  isTTY?: boolean;
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
    baseDirectory,
    installDefaultSkills,
    cliVersion,
    isTTY,
  } = deps;

  // Step 1: Run config agents flow
  const configAgentsDeps: ConfigAgentsHandlerDependencies = {
    configRepository,
    agentDetectionService,
    baseDirectory,
    isTTY,
  };

  await configAgentsHandler(configAgentsDeps);

  // Step 2: Run skills init flow
  logInfoConsole('Installing default skills...');

  const result = await installDefaultSkills({
    includeBeta: false,
    cliVersion,
  });

  if (result.errors.length > 0) {
    return {
      success: false,
      errors: result.errors,
    };
  }

  const totalFiles = result.filesCreated + result.filesUpdated;

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

  // Step 3: Display success message with next steps
  logConsole('');
  logSuccessConsole('Packmind initialized successfully!');
  logInfoConsole(
    `Next step: Run ${formatCommand('/packmind-onboard')} in your AI agent to onboard the project`,
  );

  return {
    success: true,
    errors: [],
  };
}
