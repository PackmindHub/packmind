# Coding Agent Package

Renders and deploys Packmind artifacts (standards, commands, skills) into the file layout each
supported AI coding agent expects.

## The deployer registry

`src/infra/repositories/CodingAgentDeployerRegistry.ts` maps a `CodingAgent` value from
`@packmind/types` to a deployer, via a `switch` in its private `createDeployer`. The agent keys are
snake_case strings, not the folder names:

| Key | Folder |
| --- | --- |
| `packmind` | `packmind/` |
| `claude` | `claude/` |
| `claude_plugin` | `claudePlugin/` |
| `cursor` | `cursor/` |
| `copilot` | `copilot/` |
| `agents_md` | `agentsmd/` |
| `gitlab_duo` | `gitlabDuo/` |
| `junie` | `junie/` |
| `continue` | `continue/` |
| `opencode` | `opencode/` |
| `codex` | `codex/` |

Two sibling folders are **not** agents:

- `genericSectionWriter/` — shared writers for agents whose output is a single marked-up file
  (`GenericSectionWriter`, `GenericStandardSectionWriter`, `GenericCommandSectionWriter`,
  `SingleFileDeployer`). Most single-file agents should compose these rather than re-implement
  marker handling.
- `defaultSkillsDeployer/` — deploys the built-in skills (`OnboardDeployer`,
  `UpdatePlaybookDeployer`) on top of `AbstractDefaultSkillDeployer`.

## Adding an agent

1. Add the key to `CodingAgent` in `packages/types/src/coding-agent/CodingAgent.ts` (and the
   artefact paths in `CodingAgentArtefactPaths.ts` if it writes multiple files).
2. Create `src/infra/repositories/<agent>/<Agent>Deployer.ts` implementing `ICodingAgentDeployer`,
   reusing `genericSectionWriter/` where the output is one file.
3. Add the `case` to `createDeployer` in `CodingAgentDeployerRegistry.ts`.
4. Add `packages/integration-tests/src/coding-agents-deployments/<agent>-deployment.spec.ts` —
   **that** directory, not this package, is where each agent's emitted files are actually asserted.

## Gotcha

Interfaces are split across two similarly named directories: `src/domain/repository/` (singular —
`ICodingAgentDeployer`, `ICodingAgentDeployerRegistry`) and `src/domain/repositories/`
(`ICodingAgentRepositories`). Check both before concluding an interface is missing.

Shared package conventions (env tags, layout, `/test` subpath, branded IDs): [../CLAUDE.md](../CLAUDE.md)
