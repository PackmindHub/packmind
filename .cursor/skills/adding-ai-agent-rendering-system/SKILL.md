---
name: 'adding-ai-agent-rendering-system'
description: 'Implement a new Packmind AI agent rendering/deployer pipeline (single-file or multi-file) with type and registry wiring, frontend UI/docs updates, and thorough unit/integration tests to reliably support additional coding assistants and distribution formats when introducing a new agent integration or render mode.'
---

Add a new AI agent rendering system to Packmind, supporting both single-file (like AGENTS.md) and multi-file (like Cursor/Continue) patterns, including type definitions, deployer implementation, registry registration, frontend UI integration, documentation updates, and comprehensive tests following Packmind test standards.

## When to Use

* When adding support for a new AI coding assistant (e.g., Continue, Cursor, Claude Code, GitHub Copilot, OpenCode)

* When implementing a new rendering format for standards and recipes distribution

* When extending Packmind to support additional AI agent integrations

* When creating a new deployer that follows the ICodingAgentDeployer interface

## Prerequisites — Gather from User

Before proceeding, the following information **must** be known. If any of these are unclear or not provided, **prompt the user** to clarify before starting implementation.

1. **What is the agent's identifier key and display name?**
   - The **identifier key** is the snake_case string used in code (`CodingAgent` type, `CodingAgents` record, `AGENT_FILE_PATHS`, etc.). Examples: `opencode`, `gitlab_duo`, `continue`, `agents_md`.
   - The **display name** is the human-readable label shown in the frontend UI and CLI. Examples: `OpenCode`, `GitLab Duo`, `Continue`, `AGENTS.md`.
   - Both values are reused consistently across all steps (type definitions, deployer class, registry, frontend labels, CLI display names, documentation).

2. **In which directories will Standards be rendered?**
   - Multi-file example: `.agent/rules/` (one file per standard)
   - Single-file example: `AGENTS.md`, `.agent/guidelines.md` (all standards aggregated into one file)
   - Hybrid is possible (single-file standards + multi-file commands/skills)

3. **In which directories will Commands be rendered?**
   - If the agent supports native slash commands: provide the directory (e.g., `.agent/commands/`)
   - If the agent does **NOT** support native slash commands, say so explicitly. Commands will be deployed to `.packmind/commands/` as a fallback (same pattern used by GitLab Duo, Junie, and AGENTS.md agents). Users invoke them via `@.packmind/commands/command-name.md`.

4. **In which directories will Skills be rendered?**
   - Example: `.agent/skills/`
   - If the agent does not support skills, say so explicitly. An empty string will be used in `CodingAgentArtefactPaths`.

5. **If standards are rendered into a shared file like `AGENTS.md`: What should be the precedence rules?**
   - Multiple agents can write to the same file (e.g., both OpenCode and agents_md write to `AGENTS.md`).
   - Position in `RENDER_MODE_ORDER` determines priority — agents later in the array supersede agents earlier when both are active.
   - Specify where this new agent should sit relative to existing agents that share the same file.

6. **What frontmatter format does the agent require?** (YAML, Markdown, plain text, none)

7. **What file extensions should be used?** (.md, .mdc, .txt, etc.)

8. **What naming convention should be used for files?** (e.g., `packmind-standard-{slug}.md`, `standard-{slug}.mdc`)

9. **Does the agent require specific frontmatter properties?** (name, globs, alwaysApply, description, etc.)

10. **What is the relative path from agent files to `.packmind/standards/` directory?**

> **Convention**: Throughout all recipe steps below, `NEW_AGENT` / `new_agent` / `NewAgent` are placeholders for the **identifier key** (from prerequisite 1), and `'New Agent'` is a placeholder for the **display name**. Substitute both consistently in every step.

## Recipe Steps

### Step 1: Add RenderMode enum value

Add the new AI agent to the RenderMode enum in `packages/types/src/deployments/RenderMode.ts`. Add the enum value and include it in the `RENDER_MODE_ORDER` array to ensure proper ordering. Position matters for supersedence: agents earlier in the array are overridden by agents later in the array when they share a file.

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

### Step 3: Add CodingAgentArtefactPaths

If the agent supports commands, standards, or skills as multi-file artifacts, add it to `packages/types/src/coding-agent/CodingAgentArtefactPaths.ts`:

1. Add the agent to the `MultiFileCodingAgent` type union
2. Add directory path mappings in the `CODING_AGENT_ARTEFACT_PATHS` record for each supported artifact type (command, standard, skill). Use empty string for unsupported artifact types.

```typescript
export type MultiFileCodingAgent = Extract<CodingAgent, 'claude' | 'cursor' | ... | 'new_agent'>;

export const CODING_AGENT_ARTEFACT_PATHS: Record<MultiFileCodingAgent, { command: string; standard: string; skill: string }> = {
  // ... existing values
  new_agent: {
    command: '.new-agent/commands/',
    standard: '',  // empty if standards are single-file (embedded in a shared file)
    skill: '.new-agent/skills/',
  },
};
```

### Step 4: Add to VALID_CODING_AGENTS

Add the agent identifier to the `VALID_CODING_AGENTS` array in `packages/types/src/coding-agent/validation.ts`. This enables validation of the agent string in configuration files.

```typescript
export const VALID_CODING_AGENTS: CodingAgent[] = [
  // ... existing values
  'new_agent',
];
```

Update the corresponding test in `validation.spec.ts` to include the new agent in test fixtures.

### Step 5: Add RenderMode to CodingAgent mapping

Add the mapping from RenderMode to CodingAgent in `packages/types/src/deployments/RenderModeCodingAgentMapping.ts` in the `RENDER_MODE_TO_CODING_AGENT` record.

```typescript
export const RENDER_MODE_TO_CODING_AGENT: Record<RenderMode, CodingAgent> = {
  // ... existing mappings
  [RenderMode.NEW_AGENT]: CodingAgents.new_agent,
};
```

### Step 6: Create Deployer class

Create a new deployer class in `packages/coding-agent/src/infra/repositories/{agentName}/{AgentName}Deployer.ts`. Choose a base class based on the agent's rendering pattern:

- **SingleFileDeployer**: For agents that aggregate all standards into one file (e.g., AGENTS.md, CLAUDE.md). Can also be extended with multi-file methods for commands/skills (hybrid pattern).
- **MultiFileDeployer**: For agents that create one file per standard (e.g., Cursor, Continue).
- **ICodingAgentDeployer**: Implement directly for fully custom behavior.

For hybrid agents (single-file standards + multi-file commands/skills), extend `SingleFileDeployer` and override the artifact methods:

```typescript
import { SingleFileDeployer } from '../singleFile/SingleFileDeployer';

export class NewAgentDeployer extends SingleFileDeployer {
  // Implement required methods:
  // - deployRecipes() - deploy standards/recipes content
  // - deploySkills() - deploy skill files to agent directories
  // - deployArtifacts() - deploy command files to agent directories
  // - generateRemovalFileUpdates() - handle artifact removal
  // - generateAgentCleanupFileUpdates() - handle full agent cleanup
}
```

### Step 7: Implement frontmatter generation

In the deployer, implement frontmatter generation based on the agent's requirements. For Continue-style agents, include `name`, `globs` (if scope exists), `alwaysApply` (false if scope, true otherwise), and `description` (from summary or standard name). For Cursor-style agents, use simpler frontmatter with just `globs` and `alwaysApply`. For single-file agents, frontmatter may not be needed.

```typescript
// For Continue-style (with name and description)
const frontmatter = standardVersion.scope && standardVersion.scope.trim() !== ''
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
const frontmatter = standardVersion.scope && standardVersion.scope.trim() !== ''
  ? `---
globs: ${standardVersion.scope}
alwaysApply: false
---`
  : `---
alwaysApply: true
---`;
```

### Step 8: Register deployer in registry

Register the new deployer in `packages/coding-agent/src/infra/repositories/CodingAgentDeployerRegistry.ts` by importing it and adding a case in the `createDeployer` switch statement. Also add the agent to the `canCreateDeployer` method.

If the agent supports multi-file artifacts (commands/skills), also add it to the `isMultiFileAgent()` check if that method exists.

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

### Step 9: Add AgentConfiguration mapping

Add the new agent to the `AGENT_FILE_PATHS` record in `packages/coding-agent/src/domain/AgentConfiguration.ts`. This maps the agent to its main config/standards file path.

```typescript
export const AGENT_FILE_PATHS: Record<CodingAgent, string> = {
  // ... existing mappings
  new_agent: 'AGENTS.md',  // or '.new-agent/rules/index.md', etc.
};
```

Note: If the agent shares a file path with another agent (e.g., both `opencode` and `agents_md` map to `AGENTS.md`), this is valid but requires supersedence handling in Step 11.

### Step 10: Export deployer from package

Add the deployer export to `packages/coding-agent/src/index.ts` so it can be imported by other packages.

```typescript
export * from './infra/repositories/newAgent/NewAgentDeployer';
```

### Step 11: Handle shared-file supersedence (conditional)

**Skip this step if the agent does not share a config file with another agent.**

If two agents write to the same file (e.g., both OpenCode and agents_md write to AGENTS.md), add suppression logic in `packages/coding-agent/src/application/DeployerService.ts` to ensure only the higher-priority agent writes to the shared file when both are active.

This typically involves:
1. A suppression method that filters out the lower-priority agent's writes to the shared file
2. Applying suppression in both `aggregateStandardsDeployments()` and `aggregateArtifactRendering()`
3. Adding tests for the dual-active scenario in `DeployerService.spec.ts`

### Step 12: Update GitFileUtils

Add the new agent to the `agentToFile` record in `packages/deployments/src/application/utils/GitFileUtils.ts`. This maps the agent to its main file for git operations. If the file path is shared with another agent, the deduplication in `fetchExistingFilesFromGit()` handles avoiding duplicate fetches.

```typescript
const agentToFile: Record<CodingAgent, string> = {
  // ... existing mappings
  new_agent: 'AGENTS.md',  // or the agent's main file
};
```

### Step 13: Verify link paths

Ensure the relative path from agent files to `.packmind/standards/{slug}.md` is correct. For files in `.continue/rules/` or `.cursor/rules/packmind/`, use `../../.packmind/standards/`. For files at root level like `CLAUDE.md`, use `.packmind/standards/`. Adjust based on the actual directory structure.

```typescript
// For .continue/rules/ or .cursor/rules/packmind/
link: `../../.packmind/standards/${standardVersion.slug}.md`

// For root-level files
link: `.packmind/standards/${standardVersion.slug}.md`
```

### Step 14: CLI - Agent artifact detection

Add the agent's directory or file to the detection list in `apps/cli/src/application/services/AgentArtifactDetectionService.ts`. This allows the CLI to detect whether the agent is already set up in a repository.

```typescript
const AGENT_ARTIFACT_CHECKS = [
  // ... existing entries
  { agent: 'new_agent', paths: ['.new-agent'] },
];
```

Add a corresponding test in `AgentArtifactDetectionService.spec.ts`.

### Step 15: CLI - Config agents handler

Add the agent to the CLI's agent configuration in `apps/cli/src/infra/commands/config/configAgentsHandler.ts`:

1. Add to `SELECTABLE_AGENTS` array (alphabetically sorted, Packmind always first/excluded)
2. Add to `AGENT_DISPLAY_NAMES` record with a human-readable name

```typescript
export const SELECTABLE_AGENTS: CodingAgent[] = [
  'agents_md', 'claude', 'continue', 'copilot', 'cursor', 'gitlab_duo', 'junie', 'new_agent',
];

export const AGENT_DISPLAY_NAMES: Record<CodingAgent, string> = {
  // ... existing entries
  new_agent: 'New Agent',
};
```

Add tests in `configAgentsHandler.spec.ts` confirming the agent is in `SELECTABLE_AGENTS` and has the correct display name.

### Step 16: CLI - Parse standard

Add a parser entry for the agent in `apps/cli/src/application/utils/parseStandardMd.ts`:

1. Add to `AGENT_PARSERS` record. For single-file agents that embed standards in a shared file (e.g., AGENTS.md), use `() => null` since individual standards can't be parsed from the file.
2. If the agent uses multi-file standards, also add a pattern entry to `DEPLOYER_PARSERS`.

```typescript
// In AGENT_PARSERS
export const AGENT_PARSERS: Partial<Record<CodingAgent, (content: string) => ParsedStandard | null>> = {
  // ... existing entries
  new_agent: () => null,  // single-file agent, cannot parse individually
};

// In DEPLOYER_PARSERS (only for multi-file standard agents)
export const DEPLOYER_PARSERS = [
  // ... existing entries
  { pattern: '.new-agent/rules/packmind-', parse: parseNewAgentStandard },
];
```

### Step 17: Update frontend RenderingSettings

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

### Step 18: Update frontend RunDistributionBody

Add the new agent label to `apps/frontend/src/domain/deployments/components/RunDistribution/RunDistributionBody.tsx` in the `renderModeLabels` record.

```typescript
const labels: Record<RenderMode, string> = {
  // ... existing labels
  [RenderMode.NEW_AGENT]: 'New Agent',
};
```

### Step 19: Update frontend DeploymentsHistory

Add the new agent label to `apps/frontend/src/domain/deployments/components/DeploymentsHistory/DeploymentsHistory.tsx` in the `formatNames` record.

```typescript
const formatNames: Record<RenderMode, string> = {
  // ... existing labels
  [RenderMode.NEW_AGENT]: 'New Agent',
};
```

### Step 20: Update documentation files

Add the new agent to the documentation:

1. `apps/doc/docs/manage-ai-agents.mdx` - Add a row to the agent support table showing file locations and supported features
2. `apps/doc/docs/artifact-rendering.mdx` - Add the agent to the standards, commands, and/or skills tables as applicable

```markdown
| **New Agent** | AGENTS.md + `.new-agent/` directories | Yes |
```

### Step 21: Create unit tests

Create comprehensive unit tests in `packages/coding-agent/src/infra/repositories/{agentName}/{AgentName}Deployer.spec.ts`. Follow Packmind test standards: single expectation per test, assertive titles (no "should"), and nested describe blocks for workflows. Test:

- Standards rendering (with and without scope, empty lists)
- Commands deployment as individual files (if supported)
- Skills deployment as multi-file directories (if supported)
- Artifact removal scenarios
- Agent cleanup operations

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

### Step 22: Create integration tests

Create integration tests in `packages/integration-tests/src/coding-agents-deployments/{agent-name}-deployment.spec.ts` following the pattern of existing integration tests (e.g., cursor-deployment.spec.ts). Test the full deployment workflow through DeployerService, including file creation, frontmatter validation, and content verification. If the agent shares a file with another agent, test the dual-active supersedence scenario. Follow test standards with single expectations and nested describe blocks.

```typescript
describe('New Agent Deployment Integration', () => {
  describe('when deploying standards', () => {
    it('creates the expected file', async () => {
      // Test through deployerService
    });
  });
});
```