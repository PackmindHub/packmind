/**
 * Hard cap on the marketplace plugin description length. The Anthropic
 * marketplace spec does not document an upper bound, but `Package.description`
 * is an unbounded Postgres `text` column — without a defensive limit a
 * multi-paragraph package description would land verbatim in `marketplace.json`
 * and render poorly in any consumer UI. 200 characters keeps listings on par
 * with conventional short-description budgets (GitHub, npm, VS Code).
 */
export const MARKETPLACE_PLUGIN_DESCRIPTION_MAX_LENGTH = 200;

const ELLIPSIS = '…';

/**
 * Build the description string displayed by marketplace consumers for a
 * Packmind-published plugin entry.
 *
 * The prefix attributes the plugin to Packmind and identifies the originating
 * space so reviewers browsing the marketplace can trace it back to its source.
 * When the package itself has no description, the colon and trailing payload
 * are dropped so the entry never reads as a half-finished sentence. When the
 * full string exceeds {@link MARKETPLACE_PLUGIN_DESCRIPTION_MAX_LENGTH}, the
 * tail is trimmed and a single Unicode ellipsis is appended so the total
 * length still respects the cap.
 */
export function formatMarketplacePluginDescription(params: {
  spaceSlug: string;
  packageDescription?: string;
}): string {
  const trimmed = params.packageDescription?.trim();
  const prefix = `Packmind - space @${params.spaceSlug}`;
  const full = trimmed ? `${prefix}: ${trimmed}` : prefix;

  if (full.length <= MARKETPLACE_PLUGIN_DESCRIPTION_MAX_LENGTH) {
    return full;
  }

  const sliced = full
    .slice(0, MARKETPLACE_PLUGIN_DESCRIPTION_MAX_LENGTH - ELLIPSIS.length)
    .trimEnd();
  return `${sliced}${ELLIPSIS}`;
}
