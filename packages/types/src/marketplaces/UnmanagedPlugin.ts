import { PluginRef } from './PluginRef';

/**
 * A marketplace descriptor entry Packmind does not manage, normalized for
 * consumption.
 *
 * The optional descriptor fields are widened to `null` instead of staying
 * optional, and blanks are collapsed into `null`, so a caller has one shape to
 * test rather than three (`undefined`, `''`, and a real value). `name` falls
 * back to the slug because a nameless entry cannot be identified by a reader,
 * whereas the slug always exists.
 *
 * `source` is carried through untouched: interpreting it belongs to whoever
 * links out to the plugin, and it is deliberately the open `PluginRef['source']`
 * type rather than a narrowed one, since this is third-party data Packmind only
 * reads.
 */
export type UnmanagedPlugin = {
  slug: string;
  name: string;
  version: string | null;
  description: string | null;
  source: PluginRef['source'];
};

/**
 * Returns the descriptor entries Packmind does not manage, in descriptor order.
 *
 * Lives in the shared types rather than next to either of its callers because
 * both sides of the product answer this question and must answer it the same
 * way: the marketplace list counts these plugins per marketplace, the
 * marketplace detail view lists them. Two implementations of the rule is how
 * the two surfaces came to disagree on how many plugins a marketplace holds in
 * the first place.
 *
 * "Managed" is decided by slug against the distributions Packmind tracks, not
 * against `packmind-lock.json`. The lock is the canonical answer but never
 * reaches the frontend, while the distributions are keyed by the same slugs and
 * are already loaded by both callers. The two disagree only when a distribution
 * row has vanished from the database under a plugin that is still published
 * (hard delete, migration), in which case that plugin counts as unmanaged.
 *
 * The transient publish states do not produce false entries in either
 * direction. `removed` distributions are already excluded by
 * `ListMarketplaceDistributionsUseCase`, and a removal only reaches `removed`
 * once reconciliation has confirmed the entry left the descriptor, so it
 * appears in neither list. A `pending_merge` publish is the mirror case: the
 * distribution row exists while the descriptor entry does not yet, so again
 * nothing is listed.
 *
 * @param descriptorPlugins entries of the marketplace descriptor, in its order
 * @param managedSlugs plugin slugs Packmind tracks a distribution for
 */
export function deriveUnmanagedPlugins(
  descriptorPlugins: readonly PluginRef[] | undefined,
  managedSlugs: Iterable<string>,
): UnmanagedPlugin[] {
  if (!descriptorPlugins || descriptorPlugins.length === 0) {
    return [];
  }

  const managed = new Set<string>();
  for (const slug of managedSlugs) {
    const normalized = trimmed(slug);
    if (normalized) {
      managed.add(normalized);
    }
  }

  const seenSlugs = new Set<string>();
  const unmanaged: UnmanagedPlugin[] = [];

  for (const plugin of descriptorPlugins) {
    const slug = trimmed(plugin.slug);
    // A descriptor is third-party JSON, so neither a usable slug nor its
    // uniqueness is guaranteed. An entry without one cannot be matched against
    // a distribution or keyed in a list, and a repeated slug would be counted
    // and rendered twice. Both are dropped rather than reported wrong.
    if (!slug || managed.has(slug) || seenSlugs.has(slug)) {
      continue;
    }
    seenSlugs.add(slug);
    unmanaged.push({
      slug,
      name: trimmed(plugin.name) || slug,
      version: trimmed(plugin.version) || null,
      description: trimmed(plugin.description) || null,
      source: plugin.source,
    });
  }

  return unmanaged;
}

/**
 * `String.prototype.trim` guarded against the non-strings a hand-edited
 * descriptor can put in a field the type declares as `string`.
 */
function trimmed(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
