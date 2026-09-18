/**
 * Raised when two targets of the same repository want different content at the
 * same path in the single commit they share.
 *
 * Target paths prefix every file, so this only happens when two targets are
 * configured with the same path. There is no correct file to commit then, and
 * writing one of them would report success to both targets while only one got
 * what it asked for.
 */
export class ConflictingTargetFilePathError extends Error {
  constructor(public readonly path: string) {
    super(
      `Two targets of the same repository produce conflicting content for "${path}". ` +
        'Give the targets distinct paths before deploying them together.',
    );
    this.name = 'ConflictingTargetFilePathError';
  }
}
