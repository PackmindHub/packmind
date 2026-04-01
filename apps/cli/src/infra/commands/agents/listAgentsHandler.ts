import * as path from 'path';
import * as fs from 'fs/promises';
import { CodingAgent, RENDER_MODE_TO_CODING_AGENT } from '@packmind/types';
import { IConfigFileRepository } from '../../../domain/repositories/IConfigFileRepository';
import { IDeploymentGateway } from '../../../domain/repositories/IDeploymentGateway';
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
  deploymentGateway?: IDeploymentGateway;
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
      formatFilePath(file.path) +
      ''.padEnd(pathColumnWidth - file.path.length) +
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

  const filesWithoutAgents = fileConfigs.filter((f) => f.agents.length === 0);

  if (filesWithoutAgents.length > 0 && deps.deploymentGateway) {
    const orgAgents = await fetchOrgDefaultAgents(deps.deploymentGateway);
    if (orgAgents.length > 0) {
      for (const file of filesWithoutAgents) {
        file.agents = orgAgents;
      }
    }
  }

  const allAgents: CodingAgent[] = [
    ...new Set(fileConfigs.flatMap((f) => f.agents)),
  ].sort((a, b) => a.localeCompare(b));

  const sortedFiles = [...fileConfigs].sort((a, b) => {
    const depthA = a.path.split('/').length;
    const depthB = b.path.split('/').length;
    if (depthA !== depthB) return depthA - depthB;
    return a.path.localeCompare(b.path);
  });

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

async function fetchOrgDefaultAgents(
  deploymentGateway: IDeploymentGateway,
): Promise<CodingAgent[]> {
  try {
    const result = await deploymentGateway.getRenderModeConfiguration({});
    if (result.configuration) {
      return result.configuration.activeRenderModes
        .map((mode) => RENDER_MODE_TO_CODING_AGENT[mode])
        .filter((agent): agent is CodingAgent => agent !== undefined);
    }
  } catch {
    // Silently fall back when not authenticated or API unavailable
  }
  return [];
}
