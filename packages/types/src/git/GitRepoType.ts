/**
 * Discriminates a GitRepo by its purpose within Packmind.
 *
 * - `standard`: the default. The repository is one Packmind deploys standards,
 *   recipes and skills to.
 * - `marketplace`: the repository backs a `Marketplace` linked at the
 *   organization level.
 *
 * The GitRepo finders all default to `type='standard'`, so a marketplace
 * repository cannot leak into a skill/standard deployment flow through a caller
 * that forgot to filter.
 */
export type GitRepoType = 'standard' | 'marketplace';
