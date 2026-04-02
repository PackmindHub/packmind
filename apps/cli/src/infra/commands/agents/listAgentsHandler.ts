import { CodingAgent } from '@packmind/types';
import { IConfigFileRepository } from '../../../domain/repositories/IConfigFileRepository';
import { IDeploymentGateway } from '../../../domain/repositories/IDeploymentGateway';
import {
  logConsole,
  logWarningConsole,
  formatBold,
  formatFilePath,
} from '../../utils/consoleLogger';
import {
  fetchOrgDefaultAgents,
  getRelativePath,
  resolveStartDirectory,
} from './agentsHandlerUtils';

export type ListAgentsHandlerArgs = {
  path?: string;
};

export type ListAgentsHandlerDependencies = {
  configRepository: IConfigFileRepository;
  deploymentGateway?: IDeploymentGateway;
  exit: (code: number) => void;
  getCwd: () => string;
};

type AgentSource = 'local' | 'organization';

type FileAgentConfig = {
  path: string;
  agents: CodingAgent[];
  source: AgentSource;
};

const SOURCE_LABELS: Record<AgentSource, string> = {
  local: 'packmind.json',
  organization: 'Organization settings',
};

function formatMatrix(
  files: FileAgentConfig[],
  agents: CodingAgent[],
): string[] {
  const pathColumnWidth = Math.max(...files.map((f) => f.path.length)) + 2;
  const columnWidth = Math.max(...agents.map((a) => a.length), 1) + 2;

  const lines: string[] = [];

  const header =
    ''.padEnd(pathColumnWidth) +
    agents.map((a) => formatBold(a.padEnd(columnWidth))).join('') +
    formatBold('source (packmind.json or Organization settings)');
  lines.push(header);

  for (const file of files) {
    const agentSet = new Set(file.agents);
    const row =
      formatFilePath(file.path) +
      ''.padEnd(pathColumnWidth - file.path.length) +
      agents
        .map((a) => (agentSet.has(a) ? '\u2713' : '-').padEnd(columnWidth))
        .join('') +
      SOURCE_LABELS[file.source];
    lines.push(row);
  }

  return lines;
}

export async function listAgentsHandler(
  args: ListAgentsHandlerArgs,
  deps: ListAgentsHandlerDependencies,
): Promise<void> {
  const { configRepository, exit, getCwd } = deps;

  const startDirectory = await resolveStartDirectory(args, getCwd, exit);
  if (!startDirectory) return;

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
      source: config.agents !== undefined ? 'local' : 'organization',
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
