import { ItemType } from '../entities/ItemType';

/** One artefact that `packages add` refused, with the packages holding it. */
export type ConflictingArtefact = {
  slug: string;
  name: string;
  /** Full `@space/package` slugs, the target excluded. */
  packageSlugs: string[];
};

/**
 * Thrown by `AddToPackageUseCase` when an artefact already belongs to a package
 * other than the target. An artefact lives in a single package, so `add` stops
 * here and the handler points at `packmind packages move` instead.
 */
export class ArtefactAlreadyInPackageError extends Error {
  constructor(
    public readonly itemType: ItemType,
    public readonly conflicts: ConflictingArtefact[],
    /** Full `@space/package` slug of the package the user asked to add to. */
    public readonly targetPackageSlug: string,
  ) {
    const owners = conflicts
      .flatMap((conflict) => conflict.packageSlugs)
      .join(', ');
    super(
      `${itemType} ${conflicts
        .map((conflict) => `'${conflict.slug}'`)
        .join(', ')} already belongs to ${owners}`,
    );
    this.name = 'ArtefactAlreadyInPackageError';
  }
}
