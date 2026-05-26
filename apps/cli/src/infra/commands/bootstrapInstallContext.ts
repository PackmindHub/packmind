import * as readline from 'readline';
import * as inquirer from 'inquirer';
import {
  CodingAgent,
  CODING_AGENT_TO_RENDER_MODE,
  PackmindFileConfig,
  RenderMode,
} from '@packmind/types';
import { IConfigFileRepository } from '../../domain/repositories/IConfigFileRepository';
import { IAgentArtifactDetectionService } from '../../application/services/AgentArtifactDetectionService';
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';
import {
  logSuccessConsole,
  logWarningConsole,
  logErrorConsole,
  logInfoConsole,
} from '../utils/consoleLogger';
import { initHandler, InstallDefaultSkillsFunction } from './initHandler';
import { AGENT_DISPLAY_NAMES } from './config/configAgentsHandler';

export type BootstrapInstallContextDependencies = {
  configRepository: IConfigFileRepository;
  agentDetectionService: IAgentArtifactDetectionService;
  packmindGateway: IPackmindGateway;
  baseDirectory: string;
  packages: string[];
  isTTY?: boolean;
  installDefaultSkills: InstallDefaultSkillsFunction;
  cliVersion: string;
  runInit?: typeof initHandler;
  /**
   * When set, bootstrap runs in single-agent home-install mode: no interactive
   * prompts, no organization-level render-mode prompt, and any auto-created
   * `packmind.json` is written with just this agent.
   */
  homeAgent?: CodingAgent;
};

export type BootstrapInstallContextOutcome = {
  configReady: boolean;
  warned: boolean;
  /**
   * True when bootstrap itself created `packmind.json` (auto-detect or
   * interactive init). Lets `installHandler` reflect this in the summary
   * even when the subsequent install use case sees the config as pre-existing.
   */
  configCreated: boolean;
  /**
   * Packages that bootstrap injected into a freshly-created `packmind.json`.
   * Plumbed into the install summary so the user sees them as "added".
   */
  packagesAdded: string[];
};

export async function bootstrapInstallContext(
  deps: BootstrapInstallContextDependencies,
): Promise<BootstrapInstallContextOutcome> {
  const {
    configRepository,
    agentDetectionService,
    packmindGateway,
    baseDirectory,
    packages,
    isTTY = false,
    installDefaultSkills,
    cliVersion,
    runInit = initHandler,
    homeAgent,
  } = deps;

  const hierarchicalResult = await configRepository.readHierarchicalConfig(
    baseDirectory,
    null,
  );

  if (hierarchicalResult.hasConfigs) {
    return {
      configReady: true,
      warned: false,
      configCreated: false,
      packagesAdded: [],
    };
  }

  if (homeAgent) {
    const packagesMap: PackmindFileConfig['packages'] =
      packages.length > 0
        ? Object.fromEntries(packages.map((s) => [s, '*']))
        : {};
    await configRepository.writeConfig(baseDirectory, {
      packages: packagesMap,
      agents: [homeAgent],
    });
    logSuccessConsole(
      `Created packmind.json at ${baseDirectory} for ${homeAgent} (home install).`,
    );
    return {
      configReady: true,
      warned: false,
      configCreated: true,
      packagesAdded: [...packages],
    };
  }

  const detected =
    await agentDetectionService.detectAgentArtifacts(baseDirectory);

  if (detected.length > 0) {
    const agents = [...new Set(detected.map((d) => d.agent))];
    const packagesMap: PackmindFileConfig['packages'] =
      packages.length > 0
        ? Object.fromEntries(packages.map((s) => [s, '*']))
        : {};
    await configRepository.writeConfig(baseDirectory, {
      packages: packagesMap,
      agents,
    });
    logSuccessConsole(
      `Created packmind.json at ${baseDirectory} with detected agents: ${agents.join(', ')}`,
    );
    if (isTTY) {
      await promptOrgRenderModes({
        packmindGateway,
        configRepository,
        baseDirectory,
      });
    }
    return {
      configReady: true,
      warned: false,
      configCreated: true,
      packagesAdded: [...packages],
    };
  }

  if (!isTTY) {
    logWarningConsole(
      'No packmind.json and no agent context detected — run `packmind-cli init` to configure.',
    );
    return {
      configReady: false,
      warned: true,
      configCreated: false,
      packagesAdded: [],
    };
  }

  const result = await runInit({
    configRepository,
    agentDetectionService,
    packmindGateway,
    baseDirectory,
    installDefaultSkills,
    cliVersion,
    isTTY,
    showOnboardHint: false,
  });

  if (!result.success) {
    for (const error of result.errors) {
      logErrorConsole(error);
    }
    return {
      configReady: false,
      warned: true,
      configCreated: false,
      packagesAdded: [],
    };
  }

  await promptOrgRenderModes({
    packmindGateway,
    configRepository,
    baseDirectory,
  });
  // initHandler created the packmind.json with the user-selected agents but
  // without packages — the install use case will add the CLI packages and
  // count them via its own `packagesAdded`, so we only flag configCreated.
  return {
    configReady: true,
    warned: false,
    configCreated: true,
    packagesAdded: [],
  };
}

async function promptOrgRenderModes(params: {
  packmindGateway: IPackmindGateway;
  configRepository: IConfigFileRepository;
  baseDirectory: string;
}): Promise<void> {
  const { packmindGateway, configRepository, baseDirectory } = params;

  let renderModesUnset = false;
  try {
    const result = await packmindGateway.deployment.getRenderModeConfiguration(
      {},
    );
    renderModesUnset =
      result.configuration === null ||
      result.configuration.activeRenderModes.length === 0;
  } catch {
    return;
  }

  if (!renderModesUnset) {
    return;
  }

  if (packmindGateway.organization.getCurrentUserRole() !== 'admin') {
    return;
  }

  const localConfig = await configRepository.readConfig(baseDirectory);
  const localAgents = (localConfig?.agents ?? []) as CodingAgent[];
  const renderableAgents = localAgents.filter(
    (agent) => CODING_AGENT_TO_RENDER_MODE[agent] !== undefined,
  );
  const activeRenderModes: RenderMode[] = renderableAgents
    .map((agent) => CODING_AGENT_TO_RENDER_MODE[agent])
    .filter((mode): mode is RenderMode => mode !== undefined);

  if (activeRenderModes.length === 0) {
    return;
  }

  const agentList = renderableAgents
    .map((agent) => AGENT_DISPLAY_NAMES[agent])
    .join(', ');
  const promptMessage = `Your organization has no default rendering modes set. Configure them now for: ${agentList}?`;

  const useSimplePrompt = process.env.PACKMIND_SIMPLE_PROMPT === '1';

  let confirmed: boolean;
  if (useSimplePrompt) {
    confirmed = await confirmWithReadline(`${promptMessage} [Y/n] `);
  } else {
    const answer = await inquirer.default.prompt<{ confirm: boolean }>([
      {
        type: 'select',
        name: 'confirm',
        message: promptMessage,
        choices: [
          { name: 'Yes', value: true },
          { name: 'No', value: false },
        ],
        default: true,
      },
    ]);
    confirmed = answer.confirm;
  }

  if (!confirmed) {
    return;
  }

  try {
    await packmindGateway.deployment.updateRenderModeConfiguration({
      activeRenderModes,
    });
  } catch (err) {
    const statusCode = (err as Error & { statusCode?: number }).statusCode;
    if (statusCode === 403) {
      logInfoConsole(
        "You don't have permission to set organization-level rendering — defaults are being used.",
      );
    } else {
      const message = err instanceof Error ? err.message : 'unknown error';
      logWarningConsole(
        `Could not save organization rendering modes: ${message}`,
      );
    }
  }
}

async function confirmWithReadline(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      const trimmed = answer.trim().toLowerCase();
      resolve(trimmed === '' || trimmed === 'y' || trimmed === 'yes');
    });
  });
}
