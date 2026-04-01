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

type FileAgentConfig = {
  path: string;
  agents: CodingAgent[];
};

function getRelativePath(dir: string, startDirectory: string): string {
  if (dir === startDirectory) return './packmind.json';
  return './' + path.relative(startDirectory, dir) + '/packmind.json';
}

function formatMatrix(
  files: FileAgentConfig[],
  agents: CodingAgent[],
): string[] {
  const pathColumnWidth = Math.max(...files.map((f) => f.path.length)) + 2;
  const columnWidth = Math.max(...agents.map((a) => a.length), 1) + 2;

  const lines: string[] = [];

  const header =
    ''.padEnd(pathColumnWidth) +
    agents.map((a) => formatBold(a.padEnd(columnWidth))).join('');
  lines.push(header);

  for (const file of files) {
    const agentSet = new Set(file.agents);
    const row =
      formatFilePath(file.path.padEnd(pathColumnWidth)) +
      agents
        .map((a) => (agentSet.has(a) ? '\u2713' : '-').padEnd(columnWidth))
        .join('');
    lines.push(row);
  }

  return lines;
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

  const fileConfigs: FileAgentConfig[] = [];

  for (const dir of allDirs) {
    const config = await configRepository.readConfig(dir);
    if (config === null) continue;

    fileConfigs.push({
      path: getRelativePath(dir, getCwd()),
      agents: config.agents ?? [],
    });
  }

  if (fileConfigs.length === 0) {
    logWarningConsole('No packmind.json files found.');
    exit(0);
    return;
  }

  const allAgents: CodingAgent[] = [
    ...new Set(fileConfigs.flatMap((f) => f.agents)),
  ].sort();

  const sortedFiles = [...fileConfigs].sort((a, b) =>
    a.path.localeCompare(b.path),
  );

  if (allAgents.length === 0) {
    logConsole('\nNo agents configured in any packmind.json file.\n');
    for (const file of sortedFiles) {
      logConsole(`  ${formatFilePath(file.path)}`);
    }
    logConsole('');
    exit(0);
    return;
  }

  logConsole('');
  const lines = formatMatrix(sortedFiles, allAgents);
  for (const line of lines) {
    logConsole(line);
  }
  logConsole('');

  exit(0);
}
