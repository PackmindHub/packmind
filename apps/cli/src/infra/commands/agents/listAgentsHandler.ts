import * as path from 'path';
import * as fs from 'fs/promises';
import { CodingAgent } from '@packmind/types';
import { IConfigFileRepository } from '../../../domain/repositories/IConfigFileRepository';
import {
  logConsole,
  logErrorConsole,
  logWarningConsole,
  formatBold,
  formatFilePath,
} from '../../utils/consoleLogger';

export type ListAgentsHandlerArgs = {
  path?: string;
};

export type ListAgentsHandlerDependencies = {
  configRepository: IConfigFileRepository;
  exit: (code: number) => void;
  getCwd: () => string;
};

type AgentGroup = {
  agents: CodingAgent[] | null;
  paths: string[];
};

const NONE_KEY = '(none)';

function getGroupKey(agents: CodingAgent[] | null): string {
  if (!agents || agents.length === 0) return NONE_KEY;
  return [...agents].sort().join(',');
}

function getGroupLabel(key: string, agents: CodingAgent[] | null): string {
  if (key === NONE_KEY) return '(no agents configured)';
  return [...(agents ?? [])].sort().join(', ');
}

function getRelativePath(dir: string, startDirectory: string): string {
  if (dir === startDirectory) return './packmind.json';
  return './' + path.relative(startDirectory, dir) + '/packmind.json';
}

export async function listAgentsHandler(
  args: ListAgentsHandlerArgs,
  deps: ListAgentsHandlerDependencies,
): Promise<void> {
  const { configRepository, exit, getCwd } = deps;

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

  const groups = new Map<string, AgentGroup>();

  for (const dir of allDirs) {
    const config = await configRepository.readConfig(dir);
    if (config === null) continue;

    const agents =
      config.agents && config.agents.length > 0 ? config.agents : null;
    const key = getGroupKey(agents);
    const relPath = getRelativePath(dir, startDirectory);

    if (!groups.has(key)) {
      groups.set(key, { agents, paths: [] });
    }
    groups.get(key)!.paths.push(relPath);
  }

  if (groups.size === 0) {
    logWarningConsole('No packmind.json files found.');
    exit(0);
    return;
  }

  logConsole('\nAgents configuration across packmind.json files:\n');

  const sortedEntries = [...groups.entries()].sort(([a], [b]) => {
    if (a === NONE_KEY) return 1;
    if (b === NONE_KEY) return -1;
    return a.localeCompare(b);
  });

  for (const [key, group] of sortedEntries) {
    const label = getGroupLabel(key, group.agents);
    const count = group.paths.length;
    logConsole(
      `${formatBold(label)} (${count} ${count === 1 ? 'file' : 'files'})`,
    );
    for (const p of [...group.paths].sort()) {
      logConsole(`  ${formatFilePath(p)}`);
    }
    logConsole('');
  }

  exit(0);
}
