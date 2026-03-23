import { IConfigFileRepository } from '../../domain/repositories/IConfigFileRepository';
import { IAgentArtifactDetectionService } from '../../application/services/AgentArtifactDetectionService';
import {
  configAgentsHandler,
  ConfigAgentsHandlerDependencies,
} from './config/configAgentsHandler';
import { IInstallDefaultSkillsResult } from '../../domain/useCases/IInstallDefaultSkillsUseCase';
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';
import { IOutput } from '../../domain/repositories/IOutput';

export type InstallDefaultSkillsFunction = (options: {
  includeBeta: boolean;
  cliVersion?: string;
}) => Promise<IInstallDefaultSkillsResult>;

export type InitHandlerDependencies = {
  configRepository: IConfigFileRepository;
  agentDetectionService: IAgentArtifactDetectionService;
  packmindGateway: IPackmindGateway;
  baseDirectory: string;
  installDefaultSkills: InstallDefaultSkillsFunction;
  cliVersion: string;
  output: IOutput;
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
    packmindGateway,
    baseDirectory,
    installDefaultSkills,
    cliVersion,
    isTTY,
    output,
  } = deps;

  // Step 1: Run config agents flow
  const configAgentsDeps: ConfigAgentsHandlerDependencies = {
    configRepository,
    agentDetectionService,
    packmindGateway,
    baseDirectory,
    isTTY,
    output,
  };

  await configAgentsHandler(configAgentsDeps);

  const result = await output.withLoader('Installing default skills...', () =>
    installDefaultSkills({
      includeBeta: false,
      cliVersion,
    }),
  );

  if (result.errors.length > 0) {
    return {
      success: false,
      errors: result.errors,
    };
  }

  const totalFiles = result.filesCreated + result.filesUpdated;

  if (totalFiles === 0) {
    output.notifyInfo('Default skills are already up to date.');
  } else {
    const fileUpdates: string[] = [];
    if (result.filesCreated > 0) {
      fileUpdates.push(`  Files created: ${result.filesCreated}`);
    }
    if (result.filesUpdated > 0) {
      fileUpdates.push(`  Files updated: ${result.filesUpdated}`);
    }

    output.notifySuccess(
      'Default skills installed successfully!',
      fileUpdates
        ? {
            content: fileUpdates.join('\n'),
          }
        : undefined,
    );
  }

  // Step 3: Display success message with next steps
  output.notifySuccess('Packmind initialized successfully!', {
    content:
      'Next step: run the following command in your AI agent to onboard the project',
    command: '/packmind-onboard',
  });

  return {
    success: true,
    errors: [],
  };
}
