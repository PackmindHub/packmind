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

/**
 * What a release response carries: the release without its timestamps.
 *
 * `createdAt` / `updatedAt` are a `Date` once TypeORM hydrates the entity but a
 * string by the time they reach a client, so no release response carries them.
 */
export type PackageReleaseContent = Omit<
  PackageRelease,
  'createdAt' | 'updatedAt'
>;

export type PackageReleaseVerdict = 'ready' | 'no_components' | 'no_change';

export type PackageReleaseRefusal =
  | 'malformed'
  | 'not_greater'
  | 'not_an_increment';

/**
 * Every reason a cut can be refused: the three version refusals, plus the one
 * the cut itself enforces before it ever looks at the version.
 *
 * `no_change` is deliberately absent — it disables the action in the UI, it
 * does not refuse the cut server-side.
 */
export type PackageReleaseRefusalCode = PackageReleaseRefusal | 'no_components';

/** One release, as a list read sees it: the version string and nothing else. */
export type PackageReleaseSummary = {
  version: string;
};

/** A pinned component whose family has a newer version than the release pins. */
export type OutdatedPackageComponent = {
  family: PackageComponentFamily;
  id: string;
  name: string;
  pinnedVersion: number;
  latestVersion: number;
};

/**
 * What the release panel needs to draw itself: the current version, the gate's
 * verdict, the three versions a cut will accept, and what has fallen behind.
 */
export type PackageReleaseReadiness = {
  /** `null` when the package has never been released. */
  currentVersion: string | null;
  verdict: PackageReleaseVerdict;
  /** patch, minor, major — the only three versions the cut will accept. */
  nextVersions: [string, string, string];
  /** Empty, never absent, when nothing is behind. */
  outdatedComponents: OutdatedPackageComponent[];
};

/** The three component families a package holds. */
export type PackageComponentFamily = 'recipe' | 'standard' | 'skill';
