import { CodingAgent, PackmindFileConfig } from '@packmind/types';
import { IConfigFileRepository } from '../../../domain/repositories/IConfigFileRepository';
import { IDeploymentGateway } from '../../../domain/repositories/IDeploymentGateway';
import {
  logConsole,
  logErrorConsole,
  logSuccessConsole,
  logWarningConsole,
} from '../../utils/consoleLogger';
import {
  AGENT_DISPLAY_NAMES,
  SELECTABLE_AGENTS,
} from '../config/configAgentsHandler';
import {
  fetchOrgDefaultAgents,
  getRelativePath,
  resolveStartDirectory,
} from './agentsHandlerUtils';

export type AddAgentsHandlerArgs = {
  agentNames: string[];
  path?: string;
};

export type AddAgentsHandlerDependencies = {
  configRepository: IConfigFileRepository;
  deploymentGateway?: IDeploymentGateway;
  exit: (code: number) => void;
  getCwd: () => string;
  promptConfirm: (message: string) => Promise<boolean>;
};

export async function addAgentsHandler(
  args: AddAgentsHandlerArgs,
  deps: AddAgentsHandlerDependencies,
): Promise<void> {
  const { configRepository, exit, getCwd } = deps;

  if (args.agentNames.length === 0) {
    logErrorConsole('No agents specified.');
    logConsole(
      `Valid agents: ${SELECTABLE_AGENTS.map((a) => AGENT_DISPLAY_NAMES[a]).join(', ')}`,
    );
    logConsole(`Agent identifiers: ${SELECTABLE_AGENTS.join(', ')}`);
    exit(1);
    return;
  }

  const invalidAgents = args.agentNames.filter(
    (n) => !SELECTABLE_AGENTS.includes(n as CodingAgent),
  );

  if (invalidAgents.length > 0) {
    logErrorConsole(`Unknown agent(s): ${invalidAgents.join(', ')}`);
    logConsole(`Valid agents: ${SELECTABLE_AGENTS.join(', ')}`);
    exit(1);
    return;
  }

  const agentsToAdd = args.agentNames as CodingAgent[];

  const startDirectory = await resolveStartDirectory(args, getCwd, exit);
  if (!startDirectory) return;

  const descendantDirs =
    await configRepository.findDescendantConfigs(startDirectory);
  const allDirs = [startDirectory, ...descendantDirs];

  type ConfigEntry = { dir: string; config: PackmindFileConfig };
  const validEntries: ConfigEntry[] = [];
  for (const dir of allDirs) {
    const config = await configRepository.readConfig(dir);
    if (config !== null) validEntries.push({ dir, config });
  }

  if (validEntries.length === 0) {
    logWarningConsole('No packmind.json files found.');
    exit(0);
    return;
  }

  const filesWithoutLocalAgents = validEntries.filter(
    (entry) => entry.config.agents === undefined,
  );

  if (filesWithoutLocalAgents.length > 0 && deps.deploymentGateway) {
    const orgAgents = await fetchOrgDefaultAgents(deps.deploymentGateway);
    if (orgAgents.length > 0) {
      const filePaths = filesWithoutLocalAgents
        .map((entry) => `  ${getRelativePath(entry.dir, getCwd())}`)
        .join('\n');

      const message =
        `The following file(s) currently use organization-level agent settings:\n${filePaths}\n\n` +
        `Organization agents currently active: ${orgAgents.join(', ')}\n\n` +
        `By adding agent(s) manually, you will override the organization configuration\n` +
        `for these file(s). After this change:\n` +
        `  - Only the agent(s) you add will be configured locally.\n` +
        `  - Organization-level settings will NO LONGER apply to these file(s).\n` +
        `  - Any future changes to organization agents will NOT affect these file(s).\n\n` +
        `To restore organization settings later, remove all local agents with: packmind-cli agents rm <agent1> <agent2> ...`;

      logWarningConsole(message);

      const confirmed = await deps.promptConfirm('Do you want to proceed?');
      if (!confirmed) {
        logConsole('Aborted.');
        exit(0);
        return;
      }
    }
  }

  let anyUpdated = false;

  for (const { dir, config } of validEntries) {
    const relPath = getRelativePath(dir, getCwd());
    const existingAgents = config.agents ?? [];

    const alreadyPresent = agentsToAdd.filter((a) =>
      existingAgents.includes(a),
    );
    const toAdd = agentsToAdd.filter((a) => !existingAgents.includes(a));

    for (const agent of alreadyPresent) {
      logWarningConsole(`Agent ${agent} already configured in ${relPath}`);
    }

    if (toAdd.length > 0) {
      const mergedAgents = [...existingAgents, ...toAdd];
      await configRepository.updateAgentsConfig(dir, mergedAgents);
      logSuccessConsole(`Updated ${relPath}`);
      anyUpdated = true;
    }
  }

  if (anyUpdated) {
    logWarningConsole(
      'Run `packmind-cli install` to apply changes and deploy agent artifacts.',
    );
  }
  exit(0);
}
