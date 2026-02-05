import * as readline from 'readline';
import * as inquirer from 'inquirer';
import { CodingAgent } from '@packmind/types';
import { IConfigFileRepository } from '../../../domain/repositories/IConfigFileRepository';
import { IAgentArtifactDetectionService } from '../../../application/services/AgentArtifactDetectionService';

/**
 * Agents available for selection (packmind excluded - always active)
 */
export const SELECTABLE_AGENTS: CodingAgent[] = [
  'claude',
  'cursor',
  'copilot',
  'continue',
  'junie',
  'agents_md',
  'gitlab_duo',
];

export const AGENT_DISPLAY_NAMES: Record<CodingAgent, string> = {
  packmind: 'Packmind',
  claude: 'Claude Code',
  cursor: 'Cursor',
  copilot: 'GitHub Copilot',
  continue: 'Continue.dev',
  junie: 'Junie',
  agents_md: 'AGENTS.md',
  gitlab_duo: 'GitLab Duo',
};

type AgentChoice = {
  name: string;
  value: CodingAgent;
  checked: boolean;
};

export type ConfigAgentsHandlerDependencies = {
  configRepository: IConfigFileRepository;
  agentDetectionService: IAgentArtifactDetectionService;
  baseDirectory: string;
  stdin?: NodeJS.ReadableStream;
  stdout?: NodeJS.WritableStream;
  isTTY?: boolean;
};

/**
 * Simple readline-based prompt for selecting agents by number.
 * This is a fallback for environments where inquirer's checkbox doesn't work
 * (e.g., when stdin is redirected from /dev/tty in Bun on macOS).
 */
async function promptAgentsWithReadline(
  choices: AgentChoice[],
): Promise<CodingAgent[]> {
  // Use stdin/stdout directly - /dev/tty is not reliably available in piped contexts
  const input = process.stdin;
  const output = process.stdout;

  const rl = readline.createInterface({
    input,
    output,
  });

  output.write('\nSelect coding agents to generate artifacts for:\n');
  output.write('(packmind is always active by default)\n\n');
  choices.forEach((choice, index) => {
    const marker = choice.checked ? '*' : ' ';
    output.write(`  ${index + 1}. [${marker}] ${choice.name}\n`);
  });
  output.write('\n');

  const preselected = choices
    .map((c, i) => (c.checked ? i + 1 : null))
    .filter((i) => i !== null);

  const defaultValue = preselected.length > 0 ? preselected.join(',') : '1,2,3';

  return new Promise((resolve) => {
    rl.question(
      `Enter numbers separated by commas (default: ${defaultValue}): `,
      (answer) => {
        rl.close();

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

/**
 * Handler for the `config agents` command.
 * Allows users to interactively select which coding agents to generate artifacts for.
 */
export async function configAgentsHandler(
  deps: ConfigAgentsHandlerDependencies,
): Promise<void> {
  const { configRepository, agentDetectionService, baseDirectory } = deps;
  const isTTY = deps.isTTY ?? process.stdin.isTTY;
  const useSimplePrompt = process.env.PACKMIND_SIMPLE_PROMPT === '1' || !isTTY;

  // Step 1: Read existing config
  const existingConfig = await configRepository.readConfig(baseDirectory);

  // Step 2: Determine pre-selected agents
  let preselectedAgents: Set<CodingAgent>;

  if (existingConfig?.agents && existingConfig.agents.length > 0) {
    // Use agents from config as pre-selected
    preselectedAgents = new Set(
      existingConfig.agents.filter((agent): agent is CodingAgent =>
        SELECTABLE_AGENTS.includes(agent),
      ),
    );
  } else {
    // Detect agent artifacts to pre-select
    const detectedArtifacts =
      await agentDetectionService.detectAgentArtifacts(baseDirectory);
    preselectedAgents = new Set(detectedArtifacts.map((a) => a.agent));
  }

  // Step 3: Build choices for the prompt
  const choices: AgentChoice[] = SELECTABLE_AGENTS.map((agent) => ({
    name: AGENT_DISPLAY_NAMES[agent],
    value: agent,
    checked: preselectedAgents.has(agent),
  }));

  // Step 4: Prompt user for selection
  let selectedAgents: CodingAgent[];

  if (useSimplePrompt) {
    selectedAgents = await promptAgentsWithReadline(choices);
  } else {
    const result = await inquirer.default.prompt<{
      selectedAgents: CodingAgent[];
    }>([
      {
        type: 'checkbox',
        name: 'selectedAgents',
        message:
          'Select coding agents to generate artifacts for (packmind is always active):',
        choices,
      },
    ]);
    selectedAgents = result.selectedAgents;
  }

  // Step 5: Save selected agents to config
  await configRepository.updateAgentsConfig(baseDirectory, selectedAgents);

  const agentNames = selectedAgents.map((a) => AGENT_DISPLAY_NAMES[a]);
  if (selectedAgents.length === 0) {
    process.stdout.write(
      '\nNo agents selected. Only packmind artifacts will be generated.\n',
    );
  } else {
    process.stdout.write(
      `\nConfiguration saved. Artifacts will be generated for: ${agentNames.join(', ')}\n`,
    );
  }
}
