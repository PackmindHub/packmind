import { IPublicUseCase } from '@packmind/types';
import { ItemType } from '../entities/ItemType';

export interface IMoveToPackageCommand {
  packageSlug: string;
  spaceSlug?: string;
  itemType: ItemType;
  itemSlugs: string[];
  originSkill?: string;
}

/** What happened to one artefact named on the command line. */
export interface IMovedArtefact {
  slug: string;
  name: string;
  /** False when the artefact was already in the target package. */
  addedToTarget: boolean;
  /** Full `@space/package` slugs the artefact was taken out of. */
  removedFrom: string[];
}

export interface IMoveToPackageResult {
  /** Full `@space/package` slug of the package everything moved into. */
  targetPackageSlug: string;
  moved: IMovedArtefact[];
}

/**
 * Throws `ItemNotFoundError` when the package or one of the artefact slugs does
 * not exist in the space.
 */
export type IMoveToPackageUseCase = IPublicUseCase<
  IMoveToPackageCommand,
  IMoveToPackageResult
>;
