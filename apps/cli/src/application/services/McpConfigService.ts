import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import { AgentType } from './AgentDetectionService';

export type McpConfig = {
  url: string;
  accessToken: string;
};

export type InstallResult = {
  success: boolean;
  error?: string;
  command?: string;
};

export interface IMcpConfigService {
  installForAgent(agent: AgentType, config: McpConfig): InstallResult;
  getClassicConfig(config: McpConfig): string;
}

export class McpConfigService implements IMcpConfigService {
  constructor(private readonly projectDir: string = process.cwd()) {}

  installForAgent(agent: AgentType, config: McpConfig): InstallResult {
    switch (agent) {
      case 'claude':
        return this.installClaudeMcp(config);
      case 'cursor':
        return this.installCursorMcp(config);
      case 'vscode':
        return this.installVSCodeMcp(config);
      default:
        return { success: false, error: `Unknown agent: ${agent}` };
    }
  }

  getClassicConfig(config: McpConfig): string {
    const mcpConfig = {
      mcpServers: {
        packmind: {
          url: config.url,
          headers: {
            Authorization: `Bearer ${config.accessToken}`,
          },
        },
      },
    };
    return JSON.stringify(mcpConfig, null, 2);
  }

  private installClaudeMcp(config: McpConfig): InstallResult {
    const command = `claude mcp add --transport http packmind ${config.url} --header "Authorization: Bearer ${config.accessToken}"`;
    try {
      execSync(command, { stdio: 'pipe' });
      return { success: true, command };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage, command };
    }
  }

  private installCursorMcp(config: McpConfig): InstallResult {
    try {
      const cursorConfigPath = path.join(os.homedir(), '.cursor', 'mcp.json');
      const cursorConfig = this.buildCursorConfig(config);

      const existingConfig = this.readExistingJsonConfig(cursorConfigPath);
      const mergedConfig = this.mergeConfig(existingConfig, cursorConfig);

      fs.writeFileSync(cursorConfigPath, JSON.stringify(mergedConfig, null, 2));
      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }

  private installVSCodeMcp(config: McpConfig): InstallResult {
    try {
      const vscodeDir = path.join(this.projectDir, '.vscode');
      if (!fs.existsSync(vscodeDir)) {
        fs.mkdirSync(vscodeDir, { recursive: true });
      }

      const vscodeConfigPath = path.join(vscodeDir, 'mcp.json');
      const vscodeConfig = this.buildVSCodeConfig(config);

      const existingConfig = this.readExistingJsonConfig(vscodeConfigPath);
      const mergedConfig = this.mergeVSCodeConfig(existingConfig, vscodeConfig);

      fs.writeFileSync(vscodeConfigPath, JSON.stringify(mergedConfig, null, 2));
      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }

  private buildCursorConfig(config: McpConfig): Record<string, unknown> {
    return {
      mcpServers: {
        packmind: {
          url: config.url,
          headers: {
            Authorization: `Bearer ${config.accessToken}`,
          },
        },
      },
    };
  }

  private buildVSCodeConfig(config: McpConfig): Record<string, unknown> {
    return {
      servers: {
        'packmind-mcp-vscode': {
          url: config.url,
          type: 'http',
          headers: {
            Authorization: `Bearer ${config.accessToken}`,
          },
        },
      },
      inputs: [],
    };
  }

  private readExistingJsonConfig(filePath: string): Record<string, unknown> {
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(content);
      }
    } catch {
      // ignore parse errors, return empty config
    }
    return {};
  }

  private mergeConfig(
    existing: Record<string, unknown>,
    newConfig: Record<string, unknown>,
  ): Record<string, unknown> {
    const existingServers =
      (existing['mcpServers'] as Record<string, unknown>) || {};
    const newServers =
      (newConfig['mcpServers'] as Record<string, unknown>) || {};

    return {
      ...existing,
      mcpServers: {
        ...existingServers,
        ...newServers,
      },
    };
  }

  private mergeVSCodeConfig(
    existing: Record<string, unknown>,
    newConfig: Record<string, unknown>,
  ): Record<string, unknown> {
    const existingServers =
      (existing['servers'] as Record<string, unknown>) || {};
    const newServers = (newConfig['servers'] as Record<string, unknown>) || {};

    return {
      ...existing,
      servers: {
        ...existingServers,
        ...newServers,
      },
      inputs: existing['inputs'] || newConfig['inputs'] || [],
    };
  }
}
