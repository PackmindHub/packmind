import * as path from 'path';
import * as fs from 'fs/promises';
import { CodingAgent, PackmindFileConfig } from '@packmind/types';
import { IConfigFileRepository } from '../../../domain/repositories/IConfigFileRepository';
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

export type AddAgentsHandlerArgs = {
  agentNames: string[];
  path?: string;
};

export type AddAgentsHandlerDependencies = {
  configRepository: IConfigFileRepository;
  exit: (code: number) => void;
  getCwd: () => string;
};

function getRelativePath(dir: string, startDirectory: string): string {
  if (dir === startDirectory) return './packmind.json';
  return './' + path.relative(startDirectory, dir) + '/packmind.json';
}

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

  let startDirectory = getCwd();

  if (args.path) {
    const resolvedPath = path.resolve(getCwd(), args.path);
    try {
      const stat = await fs.stat(resolvedPath);
      if (!stat.isDirectory()) {
        logErrorConsole(`Path is not a directory: ${resolvedPath}`);
        exit(1);
        return;
      }
      startDirectory = resolvedPath;
    } catch {
      logErrorConsole(`Path does not exist: ${resolvedPath}`);
      exit(1);
      return;
    }
  }

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

  for (const { dir, config } of validEntries) {
    const relPath = getRelativePath(dir, startDirectory);
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
    }
  }

  logWarningConsole(
    'Run `packmind-cli install` to apply changes and deploy agent artifacts.',
  );
  exit(0);
}
