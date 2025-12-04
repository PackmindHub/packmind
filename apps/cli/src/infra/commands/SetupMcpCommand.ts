import { command, option, optional, Type } from 'cmd-ts';
import * as inquirer from 'inquirer';
import { PackmindGateway } from '../repositories/PackmindGateway';
import {
  AgentDetectionService,
  AgentType,
} from '../../application/services/AgentDetectionService';
import { McpConfigService } from '../../application/services/McpConfigService';
import {
  logSuccessConsole,
  logErrorConsole,
  logWarningConsole,
  formatBold,
} from '../utils/consoleLogger';

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
    target: option({
      type: optional(AgentArgType),
      long: 'target',
      short: 't',
      description:
        'Target agent to configure (copilot, cursor, or claude). If omitted, interactive mode is used.',
    }),
  },
  handler: async ({ target }) => {
    const apiKey = process.env['PACKMIND_API_KEY_V3'];

    if (!apiKey) {
      logErrorConsole('PACKMIND_API_KEY_V3 environment variable is not set.');
      console.log('\nPlease set your API key before running this command:');
      console.log('  export PACKMIND_API_KEY_V3=<your-api-key>');
      process.exit(1);
    }

    const agentDetectionService = new AgentDetectionService();
    const mcpConfigService = new McpConfigService();
    const gateway = new PackmindGateway(apiKey);

    let selectedAgents: AgentType[];

    if (target) {
      // Direct mode: skip interactive selection
      selectedAgents = [agentArgToType[target]];
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
          message: 'Select agents to configure:',
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

    let mcpToken: string;
    let mcpUrl: string;

    try {
      const [tokenResult, urlResult] = await Promise.all([
        gateway.getMcpToken({}),
        gateway.getMcpUrl({}),
      ]);
      mcpToken = tokenResult.access_token;
      mcpUrl = urlResult.url;
    } catch (error) {
      logErrorConsole('Failed to fetch MCP configuration from server.');
      if (error instanceof Error) {
        console.log(`  ${error.message}`);
      }
      process.exit(1);
    }

    const config = { url: mcpUrl, accessToken: mcpToken };
    let successCount = 0;
    const failedAgents: {
      name: string;
      error: string;
      command?: string;
    }[] = [];

    for (const agentType of selectedAgents) {
      const agentName =
        ALL_AGENTS.find((a) => a.type === agentType)?.name || agentType;
      console.log(`Installing MCP for ${agentName}...`);

      const result = mcpConfigService.installForAgent(agentType, config);

      if (result.success) {
        logSuccessConsole(`  ${agentName} configured successfully`);
        successCount++;
      } else {
        logErrorConsole(`  Failed to configure ${agentName}`);
        failedAgents.push({
          name: agentName,
          error: result.error || '',
          command: result.command,
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
        console.log(mcpConfigService.getClassicConfig(config));
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
