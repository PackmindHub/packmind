import { command, multioption, Type, array } from 'cmd-ts';
import * as inquirer from 'inquirer';
import {
  AgentDetectionService,
  AgentType,
} from '../../application/services/AgentDetectionService';
import {
  logSuccessConsole,
  logErrorConsole,
  logWarningConsole,
  formatBold,
} from '../utils/consoleLogger';
import { loadCredentials, getCredentialsPath } from '../utils/credentials';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { PackmindLogger, LogLevel } from '@packmind/logger';

const VALID_AGENTS = ['copilot', 'cursor', 'claude'] as const;
type AgentArg = (typeof VALID_AGENTS)[number];

const agentArgToType: Record<AgentArg, AgentType> = {
  copilot: 'vscode',
  cursor: 'cursor',
  claude: 'claude',
};

const AgentArgType: Type<string, AgentArg> = {
  from: async (input) => {
    const normalized = input.toLowerCase() as AgentArg;
    if (VALID_AGENTS.includes(normalized)) {
      return normalized;
    }
    throw new Error(
      `Invalid agent '${input}'. Valid options are: ${VALID_AGENTS.join(', ')}`,
    );
  },
};

type AgentInfo = {
  type: AgentType;
  name: string;
};

const ALL_AGENTS: AgentInfo[] = [
  { type: 'claude', name: 'Claude Code' },
  { type: 'cursor', name: 'Cursor' },
  { type: 'vscode', name: 'VS Code' },
];

export const setupMcpCommand = command({
  name: 'setup-mcp',
  description: 'Configure MCP (Model Context Protocol) for AI coding agents',
  args: {
    targets: multioption({
      type: array(AgentArgType),
      long: 'target',
      short: 't',
      description:
        'Target agent(s) to configure (copilot, cursor, or claude). Can be specified multiple times. If omitted, interactive mode is used.',
    }),
  },
  handler: async ({ targets }) => {
    const credentials = loadCredentials();

    if (!credentials) {
      logErrorConsole('Not authenticated');
      console.log('\nNo credentials found. You can authenticate by either:');
      console.log('  1. Running `packmind-cli login`');
      console.log('  2. Setting PACKMIND_API_KEY_V3 environment variable');
      console.log(`\nCredentials are loaded from (in order of priority):`);
      console.log(`  1. PACKMIND_API_KEY_V3 environment variable`);
      console.log(`  2. ${getCredentialsPath()}`);
      process.exit(1);
    }

    if (credentials.isExpired) {
      logErrorConsole('Credentials expired');
      console.log('\nRun `packmind-cli login` to re-authenticate.');
      process.exit(1);
    }

    const agentDetectionService = new AgentDetectionService();

    let selectedAgents: AgentType[];

    if (targets.length > 0) {
      // Direct mode: skip interactive selection
      selectedAgents = targets.map((t) => agentArgToType[t]);
    } else {
      // Interactive mode: detect and prompt
      console.log('\nDetecting installed AI agents...\n');

      const detectedAgents = agentDetectionService.detectAgents();

      if (detectedAgents.length > 0) {
        console.log('Found agents:');
        detectedAgents.forEach((detectedAgent) => {
          console.log(`  - ${detectedAgent.name}`);
        });
        console.log('');
      } else {
        console.log('No supported agents detected.\n');
      }

      const detectedTypes = new Set(detectedAgents.map((a) => a.type));
      const choices = ALL_AGENTS.map((agentInfo) => ({
        name: agentInfo.name,
        value: agentInfo.type,
        checked: detectedTypes.has(agentInfo.type),
      }));

      const { selectedAgents: promptedAgents } = await inquirer.default.prompt<{
        selectedAgents: AgentType[];
      }>([
        {
          type: 'checkbox',
          name: 'selectedAgents',
          message: 'Select agents to configure (use space to select):',
          choices,
        },
      ]);

      if (promptedAgents.length === 0) {
        console.log('\nNo agents selected. Exiting.');
        process.exit(0);
      }

      selectedAgents = promptedAgents;
    }

    console.log('\nFetching MCP configuration...\n');

    const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
    const packmindCliHexa = new PackmindCliHexa(packmindLogger);

    let result;
    try {
      result = await packmindCliHexa.setupMcp({ agentTypes: selectedAgents });
    } catch (error) {
      logErrorConsole('Failed to fetch MCP configuration from server.');
      if (error instanceof Error) {
        console.log(`  ${error.message}`);
      }
      process.exit(1);
    }

    let successCount = 0;
    const failedAgents: {
      name: string;
      error: string;
      command?: string;
    }[] = [];

    for (const agentResult of result.results) {
      console.log(`Installing MCP for ${agentResult.agentName}...`);

      if (agentResult.success) {
        logSuccessConsole(`  ${agentResult.agentName} configured successfully`);
        successCount++;
      } else {
        logErrorConsole(`  Failed to configure ${agentResult.agentName}`);
        failedAgents.push({
          name: agentResult.agentName,
          error: agentResult.error || '',
          command: agentResult.command,
        });
      }
    }

    console.log('');

    if (failedAgents.length > 0) {
      for (const failed of failedAgents) {
        logWarningConsole(`Failed to configure ${failed.name}:`);

        if (failed.command) {
          console.log(`\n  Command attempted:`);
          console.log(`    ${failed.command}`);
        }

        console.log(`\n  Error: ${failed.error}`);

        if (
          failed.error.includes('ENOENT') ||
          failed.error.includes('not found') ||
          failed.error.includes('command not found')
        ) {
          console.log(
            `\n  Hint: Make sure the agent CLI is installed and available in your PATH.`,
          );
        }

        console.log(`\n  Manual configuration:`);
        console.log(result.manualConfigJson);
        console.log('');
      }
    }

    if (successCount > 0) {
      const agentWord = successCount === 1 ? 'agent' : 'agents';
      console.log(
        formatBold(`Done! MCP configured for ${successCount} ${agentWord}.`),
      );
    }

    if (failedAgents.length > 0) {
      process.exit(1);
    }
  },
});
