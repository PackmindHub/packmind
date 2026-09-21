import { IPublicUseCase } from '@packmind/types';
import { ItemType } from '../entities/ItemType';

export interface IRemoveFromPackageCommand {
  packageSlug: string;
  spaceSlug?: string;
  itemType: ItemType;
  itemSlugs: string[];
}

/** What happened to one artefact named on the command line. */
export interface IRemovedArtefact {
  slug: string;
  name: string;
  /** False when the artefact was not in the package to begin with. */
  removed: boolean;
  /** Full `@space/package` slugs still holding the artefact afterwards. */
  remainingPackageSlugs: string[];
}

export interface IRemoveFromPackageResult {
  /** Full `@space/package` slug of the package artefacts were taken out of. */
  packageSlug: string;
  removed: IRemovedArtefact[];
}

/**
 * Throws `ItemNotFoundError` when the package or one of the artefact slugs does
 * not exist in the space.
 */
export type IRemoveFromPackageUseCase = IPublicUseCase<
  IRemoveFromPackageCommand,
  IRemoveFromPackageResult
>;
