---
description: Implement a new AI agent rendering pipeline in Packmind that wires a deployer, type mappings, frontend configuration, documentation, and comprehensive tests to support both single-file and multi-file formats for distributing standards and recipes whenever you add or extend integrations for AI coding assistants.
---

Add a new AI agent rendering system to Packmind, supporting both single-file (like AGENTS.md) and multi-file (like Cursor/Continue) patterns, including type definitions, deployer implementation, registry registration, frontend UI integration, documentation updates, and comprehensive tests following Packmind test standards.

## When to Use

- When adding support for a new AI coding assistant (e.g., Continue, Cursor, Claude Code, GitHub Copilot)
- When implementing a new rendering format for standards and recipes distribution
- When extending Packmind to support additional AI agent integrations
- When creating a new deployer that follows the ICodingAgentDeployer interface

## Context Validation Checkpoints

- [ ] What is the file location pattern for this AI agent? (e.g., .continue/rules/, .cursor/rules/, CLAUDE.md)
- [ ] Does this agent support single-file or multi-file rendering?
- [ ] What frontmatter format does the agent require? (YAML, Markdown, plain text)
- [ ] What file extensions should be used? (.md, .mdc, .txt, etc.)
- [ ] What naming convention should be used for files? (e.g., packmind-standard-{slug}.md, standard-{slug}.mdc)
- [ ] Does the agent require specific frontmatter properties? (name, globs, alwaysApply, description, etc.)
- [ ] What is the relative path from agent files to .packmind/standards/ directory?

## Recipe Steps

### Step 1: Add RenderMode enum value

Add the new AI agent to the RenderMode enum in `packages/types/src/deployments/RenderMode.ts`. Add the enum value and include it in the `RENDER_MODE_ORDER` array to ensure proper ordering.

```typescript
export enum RenderMode {
  // ... existing values
  NEW_AGENT = 'NEW_AGENT',
}

export const RENDER_MODE_ORDER: RenderMode[] = [
  // ... existing values
  RenderMode.NEW_AGENT,
];
```

### Step 2: Add CodingAgent type

Add the new agent identifier to the CodingAgent union type in both `packages/types/src/coding-agent/CodingAgent.ts` and `packages/coding-agent/src/domain/CodingAgents.ts`. Also add it to the CodingAgents record object.

```typescript
export type CodingAgent =
  | 'packmind'
  | 'junie'
  | 'claude'
  | 'cursor'
  | 'copilot'
  | 'agents_md'
  | 'gitlab_duo'
  | 'continue'
  | 'new_agent';

export const CodingAgents: Record<CodingAgent, CodingAgent> = {
  // ... existing values
  new_agent: 'new_agent',
};
```

### Step 3: Create Deployer class

Create a new deployer class in `packages/coding-agent/src/infra/repositories/{agentName}/{AgentName}Deployer.ts` that implements `ICodingAgentDeployer`. The deployer should handle both recipes and standards deployment. For multi-file agents (like Cursor/Continue), create one file per standard. For single-file agents (like AGENTS.md), aggregate all content into one file.

```typescript
import { ICodingAgentDeployer } from '../../../domain/repository/ICodingAgentDeployer';
import { GenericRecipeSectionWriter } from '../genericSectionWriter/GenericRecipeSectionWriter';
import { GenericStandardSectionWriter } from '../genericSectionWriter/GenericStandardSectionWriter';

export class NewAgentDeployer implements ICodingAgentDeployer {
  private static readonly RECIPES_INDEX_PATH =
    '.new-agent/rules/packmind-recipes-index.md';

  // Implement all required methods:
  // - deployRecipes
  // - deployStandards
  // - generateFileUpdatesForRecipes
  // - generateFileUpdatesForStandards
  // - deployArtifacts
}
```

### Step 4: Implement frontmatter generation

In the deployer, implement frontmatter generation based on the agent's requirements. For Continue-style agents, include `name`, `globs` (if scope exists), `alwaysApply` (false if scope, true otherwise), and `description` (from summary or standard name). For Cursor-style agents, use simpler frontmatter with just `globs` and `alwaysApply`. For single-file agents, frontmatter may not be needed.

```typescript
// For Continue-style (with name and description)
const frontmatter =
  standardVersion.scope && standardVersion.scope.trim() !== ''
    ? `---
name: ${standardVersion.name}
globs: ${standardVersion.scope}
alwaysApply: false
description: ${summary}
---`
    : `---
name: ${standardVersion.name}
alwaysApply: true
description: ${summary}
---`;

// For Cursor-style (simpler)
const frontmatter =
  standardVersion.scope && standardVersion.scope.trim() !== ''
    ? `---
globs: ${standardVersion.scope}
alwaysApply: false
---`
    : `---
alwaysApply: true
---`;
```

### Step 5: Register deployer in registry

Register the new deployer in `CodingAgentDeployerRegistry.ts` by importing it and adding a case in the `createDeployer` switch statement. Also add the agent to the `canCreateDeployer` method.

```typescript
import { NewAgentDeployer } from './newAgent/NewAgentDeployer';

private createDeployer(agent: CodingAgent): ICodingAgentDeployer {
  switch (agent) {
    // ... existing cases
    case 'new_agent':
      return new NewAgentDeployer(this.standardsPort, this.gitPort);
    default:
      throw new Error(`Unknown coding agent: ${agent}`);
  }
}

private canCreateDeployer(agent: CodingAgent): boolean {
  return (
    // ... existing agents
    agent === 'new_agent'
  );
}
```

### Step 6: Export deployer from package

Add the deployer export to `packages/coding-agent/src/index.ts` so it can be imported by other packages.

```typescript
export * from './infra/repositories/newAgent/NewAgentDeployer';
```

### Step 7: Add RenderMode to CodingAgent mapping

Add the mapping from RenderMode to CodingAgent in `packages/deployments/src/application/services/RenderModeConfigurationService.ts` in the `renderModeToCodingAgent` record.

```typescript
const renderModeToCodingAgent: Record<RenderMode, CodingAgent> = {
  // ... existing mappings
  [RenderMode.NEW_AGENT]: CodingAgents.new_agent,
};
```

### Step 8: Update frontend RenderingSettings

Add the new agent to `apps/frontend/src/domain/deployments/components/RenderingSettings/RenderingSettings.tsx` by adding entries to `RENDER_MODE_TO_VALUE`, `VALUE_TO_RENDER_MODE`, and `DEFAULT_FORMATS` arrays.

```typescript
const RENDER_MODE_TO_VALUE: Record<RenderMode, string> = {
  // ... existing values
  [RenderMode.NEW_AGENT]: 'new-agent',
};

const VALUE_TO_RENDER_MODE: Record<string, RenderMode> = {
  // ... existing values
  'new-agent': RenderMode.NEW_AGENT,
};

const DEFAULT_FORMATS: RenderingItem[] = [
  // ... existing formats
  { value: 'new-agent', name: 'New Agent', checked: false },
];
```

### Step 9: Update frontend RunDistributionBody

Add the new agent label to `apps/frontend/src/domain/deployments/components/RunDistribution/RunDistributionBody.tsx` in the `renderModeLabels` record.

```typescript
const labels: Record<RenderMode, string> = {
  // ... existing labels
  [RenderMode.NEW_AGENT]: 'New Agent',
};
```

### Step 10: Update documentation files

Add the new agent to both `apps/doc/docs/manage-ai-agents.md` and `apps/doc/docs/distribution.md` tables, ensuring consistency between both files. Include the file location and whether it can be disabled.

```markdown
| **New Agent** | `.new-agent/rules/` | Yes |
```

### Step 11: Create unit tests

Create comprehensive unit tests in `packages/coding-agent/src/infra/repositories/{agentName}/{AgentName}Deployer.spec.ts`. Follow Packmind test standards: single expectation per test, assertive titles (no "should"), and nested describe blocks for workflows. Test both recipes and standards deployment, with and without scope, empty lists, and error handling.

```typescript
describe('NewAgentDeployer', () => {
  describe('deployRecipes', () => {
    describe('when deploying recipes', () => {
      it('creates one file update', async () => {
        // Single expectation test
      });
    });
  });
});
```

### Step 12: Create integration tests

Create integration tests in `packages/integration-tests/src/coding-agents-deployments/{agent-name}-deployment.spec.ts` following the pattern of existing integration tests (e.g., cursor-deployment.spec.ts). Test the full deployment workflow through DeployerService, including file creation, frontmatter validation, and content verification. Follow test standards with single expectations and nested describe blocks.

```typescript
describe('New Agent Deployment Integration', () => {
  describe('when .new-agent/rules/packmind-recipes-index.md does not exist', () => {
    describe('when deploying recipes', () => {
      it('creates one file update', async () => {
        // Test through deployerService
      });
    });
  });
});
```

### Step 13: Verify link paths

Ensure the relative path from agent files to `.packmind/standards/{slug}.md` is correct. For files in `.continue/rules/` or `.cursor/rules/packmind/`, use `../../.packmind/standards/`. For files at root level like `CLAUDE.md`, use `.packmind/standards/`. Adjust based on the actual directory structure.

```typescript
// For .continue/rules/ or .cursor/rules/packmind/
link: `../../.packmind/standards/${standardVersion.slug}.md`;

// For root-level files
link: `.packmind/standards/${standardVersion.slug}.md`;
```

### Step 15: Update packages/deployments/src/application/utils/GitFileUtils.ts

```ts
const agentToFile: Record<CodingAgent, string> = {
  claude: 'CLAUDE.md',
  agents_md: 'AGENTS.md',
  cursor: '.cursor/rules/packmind/recipes-index.mdc',
  copilot: '.github/copilot-instructions.md',
  junie: '.junie.md',
  packmind: '.packmind.md',
  gitlab_duo: '.gitlab/duo_chat.yml',
  continue: '.continue/rules/packmind-recipes-index.md',
};
```

### Step 16: Update apps/frontend/src/domain/deployments/components/DeploymentsHistory/DeploymentsHistory.tsx

```ts
const formatNames: Record<RenderMode, string> = {
  [RenderMode.AGENTS_MD]: 'AGENTS.md',
  [RenderMode.JUNIE]: 'Junie',
  [RenderMode.GH_COPILOT]: 'Github Copilot',
  [RenderMode.CLAUDE]: 'Claude',
  [RenderMode.CURSOR]: 'Cursor',
  [RenderMode.PACKMIND]: 'Packmind',
  [RenderMode.GITLAB_DUO]: 'Gitlab Duo',
  [RenderMode.CONTINUE]: 'Continue',
};
```
