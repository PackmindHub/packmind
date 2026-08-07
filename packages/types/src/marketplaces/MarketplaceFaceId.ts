/**
 * Identifier of a marketplace "face" — one vendor-specific projection of the
 * shared plugin payload published by Packmind.
 *
 * A single marketplace repo can expose several faces at once (each face owns
 * its own descriptor file, e.g. `.claude-plugin/marketplace.json` for Claude
 * Code and `.github/plugin/marketplace.json` for GitHub Copilot) while the
 * plugin payload directories are shared across faces.
 *
 * v1 ships with `'claude'` and `'copilot'`; additional faces are appended to
 * the union without touching consumers.
 */
export type MarketplaceFaceId = 'claude' | 'copilot';
