/**
 * The coding-agent deployer port. Its canonical definition lives in
 * `@packmind/types` so other domains collaborate with it through the shared
 * contract package (never by importing `@packmind/coding-agent` source).
 * coding-agent owns the implementations and re-exports the port here for its
 * internal consumers.
 */
export {
  ICodingAgentDeployer,
  DeployDefaultSkillsOptions,
  DefaultSkillMetadata,
  DefaultSkillsDeployResult,
} from '@packmind/types';
