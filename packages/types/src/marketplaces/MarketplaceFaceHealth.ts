import { MarketplaceFaceId } from './MarketplaceFaceId';

/**
 * Why one face of a marketplace could not be read, or that it was read fine.
 *
 * - `healthy`: the face's descriptor was fetched and parsed, and its parsed
 *   vendor matches the face that owns the path.
 * - `descriptor_missing`: no file exists at any of the face's candidate paths.
 * - `descriptor_unparseable`: a file exists but the parser registry rejected it.
 * - `not_adopted`: a file exists and parses, but its vendor belongs to another
 *   face — the hand-copied case (e.g. a Claude body sitting at
 *   `.github/plugin/marketplace.json`). Packmind never adopts such a copy: the
 *   two vendors reference plugin sources differently, so the face has to be
 *   regenerated rather than inherited.
 *
 * Any status other than `healthy` means the face carries NO evidence about
 * which plugins the marketplace still serves. See `MarketplaceFaceHealth`.
 */
export type MarketplaceFaceStatus =
  | 'healthy'
  | 'descriptor_missing'
  | 'descriptor_unparseable'
  | 'not_adopted';

/**
 * Per-face outcome of one reconciliation sweep.
 *
 * A marketplace serves one descriptor per face from a single shared plugin
 * payload, so reconciliation has to report per face: a plugin can be listed in
 * the Claude catalogue and absent from the Copilot one, which is a real defect
 * for Copilot users even though the marketplace is otherwise fine.
 *
 * `missingPluginSlugs` is only meaningful when `status === 'healthy'`; an
 * unreadable face is reported with an empty list, never with "everything is
 * missing". That distinction is load-bearing: absence read off an unreadable
 * face must never be mistaken for a plugin having left the marketplace, or a
 * transient fetch failure would drive distributions to the terminal `removed`
 * state on customer marketplaces.
 */
export type MarketplaceFaceHealth = {
  faceId: MarketplaceFaceId;
  status: MarketplaceFaceStatus;
  /**
   * Slugs Packmind expects to serve that are absent from THIS face's
   * descriptor. Always empty when `status !== 'healthy'`.
   */
  missingPluginSlugs: string[];
};
