import * as path from 'path';
import * as fs from 'fs/promises';
import { CodingAgent } from '@packmind/types';
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

export type RemoveAgentsHandlerArgs = {
  agentNames: string[];
  path?: string;
};

export type RemoveAgentsHandlerDependencies = {
  configRepository: IConfigFileRepository;
  exit: (code: number) => void;
  getCwd: () => string;
};

function getRelativePath(dir: string, startDirectory: string): string {
  if (dir === startDirectory) return './packmind.json';
  return './' + path.relative(startDirectory, dir) + '/packmind.json';
}

export async function removeAgentsHandler(
  args: RemoveAgentsHandlerArgs,
  deps: RemoveAgentsHandlerDependencies,
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

  const agentsToRemove = args.agentNames as CodingAgent[];

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

  const configDirs: string[] = [];
  for (const dir of allDirs) {
    const exists = await configRepository.configExists(dir);
    if (exists) configDirs.push(dir);
  }

  if (configDirs.length === 0) {
    logWarningConsole('No packmind.json files found.');
    exit(0);
    return;
  }

  for (const dir of configDirs) {
    const relPath = getRelativePath(dir, startDirectory);
    const config = await configRepository.readConfig(dir);
    const existingAgents = config?.agents ?? [];

    const notPresent = agentsToRemove.filter(
      (a) => !existingAgents.includes(a),
    );
    const toRemove = agentsToRemove.filter((a) => existingAgents.includes(a));

    for (const agent of notPresent) {
      logWarningConsole(`Agent ${agent} not configured in ${relPath}`);
    }

    if (toRemove.length > 0) {
      const remainingAgents = existingAgents.filter(
        (a) => !toRemove.includes(a),
      );
      await configRepository.updateAgentsConfig(dir, remainingAgents);
      logSuccessConsole(`Updated ${relPath}`);
    }
  }

  logWarningConsole(
    'Run `packmind-cli install` to apply changes and remove agent artifacts.',
  );
  exit(0);
}
