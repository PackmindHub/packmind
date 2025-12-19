import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

export type AgentType = 'claude' | 'cursor' | 'vscode' | 'continue';

export type DetectedAgent = {
  type: AgentType;
  name: string;
};

export interface IAgentDetectionService {
  detectAgents(): DetectedAgent[];
  isClaudeAvailable(): boolean;
  isCursorAvailable(): boolean;
  isVSCodeAvailable(): boolean;
  isContinueAvailable(): boolean;
}

export class AgentDetectionService implements IAgentDetectionService {
  constructor(private readonly projectDir: string = process.cwd()) {}

  detectAgents(): DetectedAgent[] {
    const agents: DetectedAgent[] = [];

    if (this.isClaudeAvailable()) {
      agents.push({ type: 'claude', name: 'Claude Code' });
    }

    if (this.isCursorAvailable()) {
      agents.push({ type: 'cursor', name: 'Cursor' });
    }

    if (this.isVSCodeAvailable()) {
      agents.push({ type: 'vscode', name: 'VS Code' });
    }

    if (this.isContinueAvailable()) {
      agents.push({ type: 'continue', name: 'Continue.dev' });
    }

    return agents;
  }

  isClaudeAvailable(): boolean {
    return this.isCommandAvailable('claude');
  }

  isCursorAvailable(): boolean {
    const cursorConfigDir = path.join(os.homedir(), '.cursor');
    return fs.existsSync(cursorConfigDir);
  }

  isVSCodeAvailable(): boolean {
    const vscodeDir = path.join(this.projectDir, '.vscode');
    return fs.existsSync(vscodeDir);
  }

  isContinueAvailable(): boolean {
    const continueDir = path.join(this.projectDir, '.continue');
    return fs.existsSync(continueDir);
  }

  private isCommandAvailable(command: string): boolean {
    try {
      const whichCommand = process.platform === 'win32' ? 'where' : 'which';
      execSync(`${whichCommand} ${command}`, { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }
}
