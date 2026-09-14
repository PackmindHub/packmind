import { Branded, brandedIdFactory } from '../brandedTypes';
import { PackageId } from './Package';
import { CommandVersion } from '../commands/CommandVersion';
import { StandardVersion } from '../standards/StandardVersion';
import { SkillVersion } from '../skills/SkillVersion';

export type PackageReleaseId = Branded<'PackageReleaseId'>;
export const createPackageReleaseId = brandedIdFactory<PackageReleaseId>();

/**
 * One immutable cut of a package: a version string plus the exact component
 * versions it pins, and the package's name and description as they were.
 *
 * Deliberately not named `PackageVersion`: the three sibling `*Version` types
 * are one revision of one artefact numbered with `version: number`, whereas a
 * release carries a parsed triple in a string and pins three families at once.
 *
 * Nothing updates a persisted release. A newer component version is a new row
 * in its own table; the join row still points at the version pinned here.
 */
export type PackageRelease = {
  id: PackageReleaseId;
  packageId: PackageId;
  version: string;
  name: string;
  description: string;
  recipeVersions: CommandVersion[];
  standardVersions: StandardVersion[];
  skillVersions: SkillVersion[];
  createdAt?: Date;
  updatedAt?: Date;
};
