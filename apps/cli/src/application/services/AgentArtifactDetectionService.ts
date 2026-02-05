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
  { agent: 'gitlab_duo', paths: ['.gitlab'] },
];

export class AgentArtifactDetectionService implements IAgentArtifactDetectionService {
  async detectAgentArtifacts(
    baseDirectory: string,
  ): Promise<DetectedAgentArtifact[]> {
    const detected: DetectedAgentArtifact[] = [];

    for (const check of AGENT_ARTIFACT_CHECKS) {
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
}
