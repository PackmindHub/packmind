import { command, multioption, Type, array } from 'cmd-ts';
import * as fs from 'fs';
import * as readline from 'readline';
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

type AgentChoice = {
  name: string;
  value: AgentType;
  checked: boolean;
};

/**
 * Simple readline-based prompt for selecting agents by number.
 * This is a fallback for environments where inquirer's checkbox doesn't work
 * (e.g., when stdin is redirected from /dev/tty in Bun on macOS).
 */
async function promptAgentsWithReadline(
  choices: AgentChoice[],
): Promise<AgentType[]> {
  // Open /dev/tty directly for input/output
  const input = fs.createReadStream('/dev/tty');
  const output = fs.createWriteStream('/dev/tty');

  const rl = readline.createInterface({
    input,
    output,
  });

  // Display choices with numbers
  output.write('Select agents to configure:\n');
  choices.forEach((choice, index) => {
    const marker = choice.checked ? '*' : ' ';
    output.write(`  ${index + 1}. [${marker}] ${choice.name}\n`);
  });
  output.write('\n');

  // Get pre-selected indices
  const preselected = choices
    .map((c, i) => (c.checked ? i + 1 : null))
    .filter((i) => i !== null);

  const defaultValue = preselected.length > 0 ? preselected.join(',') : '1,2,3';

  return new Promise((resolve) => {
    rl.question(
      `Enter numbers separated by commas (default: ${defaultValue}): `,
      (answer) => {
        rl.close();
        input.destroy();
        output.destroy();

        const trimmed = answer.trim();
        const numbersStr = trimmed === '' ? defaultValue : trimmed;

        const numbers = numbersStr
          .split(',')
          .map((s) => parseInt(s.trim(), 10))
          .filter((n) => !isNaN(n) && n >= 1 && n <= choices.length);

        const selectedAgents = numbers.map((n) => choices[n - 1].value);
        resolve(selectedAgents);
      },
    );
  });
}

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
      const choices: AgentChoice[] = ALL_AGENTS.map((agentInfo) => ({
        name: agentInfo.name,
        value: agentInfo.type,
        checked: detectedTypes.has(agentInfo.type),
      }));

      let promptedAgents: AgentType[];

      // Use simple readline prompt when:
      // 1. PACKMIND_SIMPLE_PROMPT env var is set (used by install script)
      // 2. stdin is not a TTY
      // This works around Bun's broken raw mode handling on macOS when stdin is redirected
      const useSimplePrompt =
        process.env.PACKMIND_SIMPLE_PROMPT === '1' || !process.stdin.isTTY;

      if (useSimplePrompt) {
        // Simple numbered selection that works without raw mode
        promptedAgents = await promptAgentsWithReadline(choices);
      } else {
        // Use inquirer checkbox when in a normal terminal
        const result = await inquirer.default.prompt<{
          selectedAgents: AgentType[];
        }>([
          {
            type: 'checkbox',
            name: 'selectedAgents',
            message: 'Select agents to configure (use space to select):',
            choices,
          },
        ]);
        promptedAgents = result.selectedAgents;
      }

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
        });
      }
    }

    console.log('');

    if (failedAgents.length > 0) {
      for (const failed of failedAgents) {
        logWarningConsole(`Failed to configure ${failed.name}:`);

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
