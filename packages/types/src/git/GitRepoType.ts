/**
 * Discriminates a GitRepo by its purpose within Packmind.
 *
 * - `standard`: the default value. The repository is used by Packmind to
 *   deploy standards, recipes, and skills.
 * - `marketplace`: the repository is linked at the organization level as a
 *   marketplace source (see `packages/deployments` Marketplace entity).
 *
 * All pre-existing GitRepo finders default to `type='standard'` to prevent
 * marketplace repositories from leaking into skill/standard deployment flows.
 */
export type GitRepoType = 'standard' | 'marketplace';
