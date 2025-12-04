import { AgentType } from '../../application/services/AgentDetectionService';

export type ISetupMcpCommand = {
  agentTypes: AgentType[];
};

export type AgentInstallResult = {
  agentType: AgentType;
  agentName: string;
  success: boolean;
  error?: string;
  command?: string;
};

export type ISetupMcpResult = {
  results: AgentInstallResult[];
  manualConfigJson?: string;
};

export interface ISetupMcpUseCase {
  execute(command: ISetupMcpCommand): Promise<ISetupMcpResult>;
}
