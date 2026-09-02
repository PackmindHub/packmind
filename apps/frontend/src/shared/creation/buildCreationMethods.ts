import type { ArtifactType } from '@packmind/types';
import type { ArtifactCreationRoutes } from './artifactCreationRoutes';

/**
 * Where the manual branch stops listing its types and folds them behind one
 * entry.
 *
 * Two types is a pair the eye takes in at once, so listing them costs nothing
 * and saves a click. Three is a list, and a list of types is what the create
 * menu is being rewritten to stop being.
 *
 * The fold is not a second design. A menu built from the registry crosses this
 * on its own the day a type with a form is added, which is the only day a
 * reader sees the shape change.
 */
export const FORM_FOLD_THRESHOLD = 3;

/**
 * The create menu's entries, one per method rather than one per type.
 *
 * A record and not a list: the order these four are drawn in is a decision
 * about which path the product recommends, which belongs in the markup where it
 * can be read, not in a builder that would bury it as an array index. Each slot
 * is null when no type answers yes to it, so a method with nothing behind it
 * never reaches the screen.
 */
export type CreationMethods<T extends string = ArtifactType> = {
  /** An agent writes it from the repo. Absorbs every new type for free. */
  agent: { types: T[] } | null;
  /** Packmind ships it ready made. */
  samples: { types: T[] } | null;
  /** A form in the app writes it, flat while the types are few. */
  form: { types: T[]; layout: 'flat' | 'folded' } | null;
  /** It arrives from disk or through the CLI. */
  fileImport: { types: T[] } | null;
};

/**
 * Reads the registry and reports which methods exist and what each covers.
 *
 * Generic over the type key rather than fixed to `ArtifactType` so a test can
 * pin the five-type behaviour today, before MCP servers and hooks exist. That
 * is the whole point of the exercise: the shape of the menu at five types has
 * to be known now, not discovered later.
 */
export function buildCreationMethods<T extends string>(
  registry: Readonly<Record<T, ArtifactCreationRoutes>>,
  order: readonly T[],
): CreationMethods<T> {
  const typesWhere = (
    predicate: (routes: ArtifactCreationRoutes) => boolean,
  ): T[] => order.filter((type) => predicate(registry[type]));

  const agentTypes = typesWhere((routes) => routes.agentCanWrite);
  const sampleTypes = typesWhere((routes) => routes.hasSamples);
  const formTypes = typesWhere((routes) => routes.formRoute !== null);
  const importTypes = typesWhere((routes) => routes.importable);

  return {
    agent: agentTypes.length > 0 ? { types: agentTypes } : null,
    samples: sampleTypes.length > 0 ? { types: sampleTypes } : null,
    form:
      formTypes.length > 0
        ? {
            types: formTypes,
            layout: formTypes.length >= FORM_FOLD_THRESHOLD ? 'folded' : 'flat',
          }
        : null,
    fileImport: importTypes.length > 0 ? { types: importTypes } : null,
  };
}

/**
 * A list of types as a sentence fragment, for the line under a method's name.
 *
 * This is where the type list lives once the menu is indexed by method: it
 * grows by a word instead of by an entry, which is the property that makes the
 * menu's height independent of how many types the product ends up with.
 *
 * "and" rather than a comma before the last item, matching the space's own
 * blank state, which already says "the standards, commands and skills that
 * reach a repository together".
 */
export function listTypeLabels(labels: readonly string[]): string {
  if (labels.length === 0) return '';
  if (labels.length === 1) return labels[0];

  const head = labels.slice(0, -1);
  const tail = labels[labels.length - 1];
  return `${head.join(', ')} and ${tail}`;
}
