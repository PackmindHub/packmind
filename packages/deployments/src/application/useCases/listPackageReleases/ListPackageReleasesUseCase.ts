import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  IAccountsPort,
  ICommandsPort,
  IListPackageReleasesUseCase,
  ISkillsPort,
  IStandardsPort,
  ListPackageReleasesCommand,
  ListPackageReleasesResponse,
  OutdatedPackageComponent,
  PackageRelease,
  PackageReleaseSummary,
  comparePackageReleaseVersions,
  nextVersions,
  parsePackageReleaseVersion,
} from '@packmind/types';
import { DeploymentsServices } from '../../services/DeploymentsServices';
import {
  PackageGateSnapshot,
  evaluatePackageReleaseGate,
} from '../../services/packageReleaseGateHelpers';
import {
  ResolvedComponentVersion,
  ResolvedComponentVersions,
  currentVersionOf,
  resolveLatestComponentVersions,
} from '../../services/packageReleaseResolution';
import { PackageNotFoundError } from '../../../domain/errors/PackageNotFoundError';

const origin = 'ListPackageReleasesUseCase';

/** Newest first by parsed triple — never by the version string (D-009). */
const byVersionDescending = (a: PackageRelease, b: PackageRelease): number => {
  const parsedA = parsePackageReleaseVersion(a.version);
  const parsedB = parsePackageReleaseVersion(b.version);

  if (!parsedA || !parsedB) {
    return 0;
  }

  return comparePackageReleaseVersions(parsedB, parsedA);
};

/** What a release pins, keyed by `${family}:${componentId}`. */
const pinnedByComponent = (
  release: PackageRelease,
): Map<string, { versionId: string; versionNumber: number }> => {
  const pinned = new Map<
    string,
    { versionId: string; versionNumber: number }
  >();

  release.recipeVersions.forEach((version) => {
    pinned.set(`recipe:${version.recipeId}`, {
      versionId: version.id,
      versionNumber: version.version,
    });
  });
  release.standardVersions.forEach((version) => {
    pinned.set(`standard:${version.standardId}`, {
      versionId: version.id,
      versionNumber: version.version,
    });
  });
  release.skillVersions.forEach((version) => {
    pinned.set(`skill:${version.skillId}`, {
      versionId: version.id,
      versionNumber: version.version,
    });
  });

  return pinned;
};

const toGateSnapshot = (
  name: string,
  description: string,
  resolution: ResolvedComponentVersions,
): PackageGateSnapshot => {
  const snapshot: PackageGateSnapshot = {
    name,
    description,
    recipes: [],
    standards: [],
    skills: [],
  };

  // Add resolved components with their version IDs
  for (const component of resolution.resolved) {
    const entry = {
      id: component.componentId,
      latestVersionId: component.versionId,
    };

    if (component.family === 'recipe') {
      snapshot.recipes.push(entry);
    } else if (component.family === 'standard') {
      snapshot.standards.push(entry);
    } else {
      snapshot.skills.push(entry);
    }
  }

  // Add unresolved components with null version IDs
  for (const component of resolution.unresolved) {
    const entry = {
      id: component.componentId,
      latestVersionId: null,
    };

    if (component.family === 'recipe') {
      snapshot.recipes.push(entry);
    } else if (component.family === 'standard') {
      snapshot.standards.push(entry);
    } else {
      snapshot.skills.push(entry);
    }
  }

  return snapshot;
};

/**
 * Every component the latest release pins at a version id other than the one
 * currently resolved. Empty when there is no release at all.
 */
const findOutdatedComponents = (
  resolved: ResolvedComponentVersion[],
  latestRelease: PackageRelease | null,
): OutdatedPackageComponent[] => {
  if (!latestRelease) {
    return [];
  }

  const pinned = pinnedByComponent(latestRelease);
  const outdated: OutdatedPackageComponent[] = [];

  for (const component of resolved) {
    const pin = pinned.get(`${component.family}:${component.componentId}`);
    if (!pin || pin.versionId === component.versionId) {
      continue;
    }

    outdated.push({
      family: component.family,
      id: component.componentId,
      name: component.name,
      pinnedVersion: pin.versionNumber,
      latestVersion: component.versionNumber,
    });
  }

  return outdated;
};

export class ListPackageReleasesUseCase
  extends AbstractMemberUseCase<
    ListPackageReleasesCommand,
    ListPackageReleasesResponse
  >
  implements IListPackageReleasesUseCase
{
  constructor(
    accountsPort: IAccountsPort,
    private readonly services: DeploymentsServices,
    private readonly commandsPort: ICommandsPort,
    private readonly standardsPort: IStandardsPort,
    private readonly skillsPort: ISkillsPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
    this.logger.info('ListPackageReleasesUseCase initialized');
  }

  async executeForMembers(
    command: ListPackageReleasesCommand & MemberContext,
  ): Promise<ListPackageReleasesResponse> {
    const { packageId, spaceId } = command;

    this.logger.info('Listing package releases', { packageId });

    const pkg = await this.services.getPackageService().findById(packageId);
    if (!pkg) {
      throw new PackageNotFoundError(packageId);
    }

    if (pkg.spaceId !== spaceId) {
      throw new PackageNotFoundError(packageId);
    }

    const releases = await this.services
      .getPackageReleaseService()
      .listReleases(packageId);

    const currentSentinel = currentVersionOf(releases);

    // An unresolved component is reported as a snapshot component with no version (D-036, D-059).
    const resolution = await resolveLatestComponentVersions(
      {
        recipeIds: pkg.recipes ?? [],
        standardIds: pkg.standards ?? [],
        skillIds: pkg.skills ?? [],
      },
      {
        commandsPort: this.commandsPort,
        standardsPort: this.standardsPort,
        skillsPort: this.skillsPort,
      },
    );

    const snapshot = toGateSnapshot(pkg.name, pkg.description, resolution);

    const latestRelease =
      releases.find((release) => release.version === currentSentinel) ?? null;

    const verdict = evaluatePackageReleaseGate(snapshot, latestRelease);

    const summaries: PackageReleaseSummary[] = [...releases]
      .sort(byVersionDescending)
      .map((release) => ({ version: release.version }));

    return {
      releases: summaries,
      readiness: {
        currentVersion: releases.length > 0 ? currentSentinel : null,
        verdict,
        nextVersions: nextVersions(currentSentinel),
        outdatedComponents: findOutdatedComponents(
          resolution.resolved,
          latestRelease,
        ),
      },
    };
  }
}
