import { CodingAgent } from '@packmind/types';

// TODO: Move this to coding-agent package to centralize paths configuration
type ArtifactType = 'recipe' | 'standard';

interface IArtifactFilePaths {
  singleFile: string | null;
  indexFile: string | null;
  getArtifactPath: (slug: string, type: ArtifactType) => string | null;
}

const agentFilePathsConfig: Record<CodingAgent, IArtifactFilePaths> = {
  claude: {
    singleFile: 'CLAUDE.md',
    indexFile: null,
    getArtifactPath: () => null,
  },
  agents_md: {
    singleFile: 'AGENTS.md',
    indexFile: null,
    getArtifactPath: () => null,
  },
  junie: {
    singleFile: '.junie/guidelines.md',
    indexFile: null,
    getArtifactPath: () => null,
  },
  gitlab_duo: {
    singleFile: '.gitlab/duo/chat-rules.md',
    indexFile: null,
    getArtifactPath: () => null,
  },
  cursor: {
    singleFile: null,
    indexFile: '.cursor/rules/packmind/recipes-index.mdc',
    getArtifactPath: (slug: string, type: ArtifactType) => {
      if (type === 'standard') {
        return `.cursor/rules/packmind/standard-${slug}.mdc`;
      }
      return null;
    },
  },
  copilot: {
    singleFile: null,
    indexFile: '.github/instructions/packmind-recipes-index.instructions.md',
    getArtifactPath: (slug: string, type: ArtifactType) => {
      if (type === 'standard') {
        return `.github/instructions/packmind-${slug}.instructions.md`;
      }
      return null;
    },
  },
  packmind: {
    singleFile: null,
    indexFile: null,
    getArtifactPath: (slug: string, type: ArtifactType) => {
      if (type === 'recipe') {
        return `.packmind/recipes/${slug}.md`;
      }
      if (type === 'standard') {
        return `.packmind/standards/${slug}.md`;
      }
      return null;
    },
  },
};

export class ArtifactFilePathService {
  getFilePathsForAgent(agent: CodingAgent): string[] {
    const config = agentFilePathsConfig[agent];
    const paths: string[] = [];

    if (config.singleFile) {
      paths.push(config.singleFile);
    }

    if (config.indexFile) {
      paths.push(config.indexFile);
    }

    return paths;
  }

  getRecipeFilePath(agent: CodingAgent, slug: string): string | null {
    const config = agentFilePathsConfig[agent];
    return config.getArtifactPath(slug, 'recipe');
  }

  getStandardFilePath(agent: CodingAgent, slug: string): string | null {
    const config = agentFilePathsConfig[agent];
    return config.getArtifactPath(slug, 'standard');
  }

  getAllFilePathsForRecipe(agent: CodingAgent, slug: string): string[] {
    return this.getAllFilePathsForArtifact(agent, slug, 'recipe');
  }

  getAllFilePathsForStandard(agent: CodingAgent, slug: string): string[] {
    return this.getAllFilePathsForArtifact(agent, slug, 'standard');
  }

  /**
   * Returns the Packmind index files that list all deployed recipes and standards.
   * These files are separate from the agent-specific configuration because:
   * 1. They are always required regardless of which agents are enabled
   * 2. They serve as the source of truth referenced by all other agents
   * 3. They need to be regenerated when any artifact changes, not just Packmind-specific ones
   */
  getPackmindIndexFiles(): string[] {
    return ['.packmind/recipes-index.md', '.packmind/standards-index.md'];
  }

  private getAllFilePathsForArtifact(
    agent: CodingAgent,
    slug: string,
    type: ArtifactType,
  ): string[] {
    const paths = this.getFilePathsForAgent(agent);
    const artifactPath =
      type === 'recipe'
        ? this.getRecipeFilePath(agent, slug)
        : this.getStandardFilePath(agent, slug);

    if (artifactPath) {
      paths.push(artifactPath);
    }

    return paths;
  }

  isSingleFileAgent(agent: CodingAgent): boolean {
    const config = agentFilePathsConfig[agent];
    return config.singleFile !== null;
  }

  isMultiFileAgent(agent: CodingAgent): boolean {
    return !this.isSingleFileAgent(agent);
  }
}
