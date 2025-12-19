import {
  ISetupMcpCommand,
  ISetupMcpResult,
  ISetupMcpUseCase,
  AgentInstallResult,
} from '../../domain/useCases/ISetupMcpUseCase';
import { AgentType } from '../services/AgentDetectionService';
import { McpConfigService } from '../services/McpConfigService';
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';

const ALL_AGENTS: { type: AgentType; name: string }[] = [
  { type: 'claude', name: 'Claude Code' },
  { type: 'cursor', name: 'Cursor' },
  { type: 'vscode', name: 'VS Code' },
  { type: 'continue', name: 'Continue.dev' },
];

export interface ISetupMcpDependencies {
  gateway: IPackmindGateway;
  mcpConfigService: McpConfigService;
}

export class SetupMcpUseCase implements ISetupMcpUseCase {
  private readonly deps: ISetupMcpDependencies;

  constructor(deps: ISetupMcpDependencies) {
    this.deps = deps;
  }

  async execute(command: ISetupMcpCommand): Promise<ISetupMcpResult> {
    const { agentTypes } = command;

    const [tokenResult, urlResult] = await Promise.all([
      this.deps.gateway.getMcpToken({}),
      this.deps.gateway.getMcpUrl({}),
    ]);

    const config = {
      url: urlResult.url,
      accessToken: tokenResult.access_token,
    };

    const results: AgentInstallResult[] = [];
    let hasFailure = false;

    for (const agentType of agentTypes) {
      const agentName =
        ALL_AGENTS.find((a) => a.type === agentType)?.name || agentType;

      const installResult = this.deps.mcpConfigService.installForAgent(
        agentType,
        config,
      );

      results.push({
        agentType,
        agentName,
        success: installResult.success,
        error: installResult.error,
      });

      if (!installResult.success) {
        hasFailure = true;
      }
    }

    return {
      results,
      manualConfigJson: hasFailure
        ? this.deps.mcpConfigService.getClassicConfig(config)
        : undefined,
    };
  }
}
