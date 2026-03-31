import * as fs from 'fs/promises';
import * as path from 'path';
import { CodingAgent } from '@packmind/types';

export type DetectedAgentArtifact = {
  agent: CodingAgent;
  artifactPath: string;
};

export interface IAgentArtifactDetectionService {
  detectAgentArtifacts(baseDirectory: string): Promise<DetectedAgentArtifact[]>;
}

type ArtifactCheck = {
  agent: CodingAgent;
  paths: string[];
  recursive?: boolean;
};

const AGENT_ARTIFACT_CHECKS: ArtifactCheck[] = [
  { agent: 'claude', paths: ['.claude'] },
  { agent: 'cursor', paths: ['.cursor'] },
  {
    agent: 'copilot',
    paths: ['.github/copilot-instructions.md', '.github/instructions'],
  },
  { agent: 'continue', paths: ['.continue'] },
  { agent: 'junie', paths: ['.junie', '.junie.md'] },
  { agent: 'agents_md', paths: ['AGENTS.md'] },
  { agent: 'gitlab_duo', paths: ['.gitlab/duo'] },
  { agent: 'opencode', paths: ['.opencode'] },
  { agent: 'codex', paths: ['.agents/skills'], recursive: true },
];

export class AgentArtifactDetectionService implements IAgentArtifactDetectionService {
  async detectAgentArtifacts(
    baseDirectory: string,
  ): Promise<DetectedAgentArtifact[]> {
    const detected: DetectedAgentArtifact[] = [];

    for (const check of AGENT_ARTIFACT_CHECKS) {
      if (check.recursive) {
        const found = await this.findRecursive(baseDirectory, check.paths);
        if (found) {
          detected.push({
            agent: check.agent,
            artifactPath: found,
          });
        }
      } else {
        for (const relativePath of check.paths) {
          const fullPath = path.join(baseDirectory, relativePath);
          const exists = await this.pathExists(fullPath);
          if (exists) {
            detected.push({
              agent: check.agent,
              artifactPath: fullPath,
            });
            break;
          }
        }
      }
    }

    return detected;
  }

  private async pathExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async findRecursive(
    baseDirectory: string,
    targetPaths: string[],
  ): Promise<string | null> {
    const queue = [baseDirectory];

    while (queue.length > 0) {
      const currentDir = queue.shift()!;

      for (const targetPath of targetPaths) {
        const fullPath = path.join(currentDir, targetPath);
        if (await this.pathExists(fullPath)) {
          return fullPath;
        }
      }

      try {
        const entries = await fs.readdir(currentDir, { withFileTypes: true });
        for (const entry of entries) {
          if (
            entry.isDirectory() &&
            !entry.name.startsWith('.') &&
            entry.name !== 'node_modules'
          ) {
            queue.push(path.join(currentDir, entry.name));
          }
        }
      } catch {
        // Skip directories we can't read
      }
    }

    return null;
  }
}
