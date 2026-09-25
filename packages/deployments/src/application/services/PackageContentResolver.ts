import {
  CommandVersion,
  ICommandsPort,
  ISkillsPort,
  IStandardsPort,
  PackageId,
  PackageReleaseEntry,
  PackageVersionSpec,
  PackageWithArtefacts,
  SkillVersion,
  SkillVersionId,
  StandardVersion,
  WILDCARD_VERSION_SPEC,
  comparePackageReleaseVersions,
  parsePackageReleaseVersion,
  parsePackageVersionSpec,
} from '@packmind/types';
import { PackageReleaseService } from './PackageReleaseService';

/**
 * Every artifact read made while resolving one set of packages, memoized by
 * artifact id so two packages that share a component query for it once.
 */
type ArtifactLookups = {
  commandVersion: Map<string, Promise<CommandVersion | null>>;
  standardVersion: Map<string, Promise<StandardVersion | null>>;
  skillVersion: Map<string, Promise<SkillVersion | null>>;
  skillFiles: Map<string, Promise<SkillVersionFiles>>;
};

type SkillVersionFiles = Awaited<ReturnType<ISkillsPort['getSkillFiles']>>;

/** Memoizes by key, caching the promise so concurrent callers share one read. */
const once = <T>(
  cache: Map<string, Promise<T>>,
  key: string,
  read: () => Promise<T>,
): Promise<T> => {
  const pending = cache.get(key);
  if (pending) return pending;
  const started = read();
  cache.set(key, started);
  return started;
};
import { PackageVersionNotAvailableError } from '../../domain/errors/PackageVersionNotAvailableError';
import { InvalidPackageVersionSpecError } from '../../domain/errors/InvalidPackageVersionSpecError';
import {
  ArtifactMetadataMap,
  buildArtifactMetadataMap,
} from '../utils/ArtifactMetadataUtils';

/** One package, and which version of it the caller asked for. */
export type PackageContentRequest = {
  pkg: PackageWithArtefacts;
  /** The slug as the repo spells it, used in the refusal message. */
  slug: string;
  /**
   * Null when the caller named no version. That is a request for the newest
   * release — answered once, here, and reported back as the concrete version
   * it found, because nothing a repo can write down floats.
   */
  spec: PackageVersionSpec | null;
};

/** What one package resolved to, before the three families are merged. */
type ResolvedPackage = {
  packageId: PackageId;
  spaceId: string;
  /** What `packmind.json` should record: `*`, or the released version. */
  resolvedVersion: string;
  commandVersions: CommandVersion[];
  standardVersions: StandardVersion[];
  skillVersions: SkillVersion[];
};

export type ResolvedPackagesContent = {
  commandVersions: CommandVersion[];
  standardVersions: StandardVersion[];
  skillVersions: SkillVersion[];
  artifactMetadata: ArtifactMetadataMap;
  /** Keyed by package id — the caller knows which slug each id came from. */
  resolvedVersions: Map<PackageId, string>;
};

/**
 * Turns "these packages, at these versions" into the three flat version lists
 * the renderers take.
 *
 * It exists because pinning is the one thing pull and install must agree on to
 * the letter: the same `packmind.json` is read by `packmind install` and
 * written by a distribution from the app, and a repo whose files disagree with
 * its lockfile about which release it is on is worse than one that never
 * pinned at all. Both use cases used to resolve component versions inline, in
 * two copies of the same twenty lines.
 *
 * A release is read as captured — the component versions it pinned, including
 * ones whose component has since been deleted — which is the same reading
 * `RenderPackageAsPluginUseCase` already does.
 */
export class PackageContentResolver {
  constructor(
    private readonly commandsPort: ICommandsPort,
    private readonly standardsPort: IStandardsPort,
    private readonly skillsPort: ISkillsPort,
    private readonly packageReleaseService: PackageReleaseService,
  ) {}

  async resolve(
    requests: PackageContentRequest[],
  ): Promise<ResolvedPackagesContent> {
    // One cache per call, not per instance: a use case is long-lived and a
    // component's latest version moves under it. Within one install, though,
    // two packages sharing a component must not each query for it — the
    // inline code this replaced deduplicated artifacts before looking their
    // versions up, and that saving has to survive per-package resolution.
    const lookups: ArtifactLookups = {
      commandVersion: new Map(),
      standardVersion: new Map(),
      skillVersion: new Map(),
      skillFiles: new Map(),
    };

    const resolved = await Promise.all(
      requests.map((request) => this.resolveOne(request, lookups)),
    );
    return this.merge(resolved);
  }

  private async resolveOne(
    request: PackageContentRequest,
    lookups: ArtifactLookups,
  ): Promise<ResolvedPackage> {
    const { pkg, spec } = request;

    if (spec === null) {
      const releases = await this.packageReleaseService.listReleases(pkg.id);
      const newest = highestVersionOf(releases);
      // A package nobody ever released has one readable state, and it is the
      // live one. Answering `*` rather than refusing keeps `install @space/ops`
      // working on a package the team has not got round to cutting yet.
      if (newest === null) {
        return this.fromLivePackage(pkg, lookups);
      }
      return this.fromRelease(request, newest, lookups);
    }

    if (spec.kind === 'exact') {
      return this.fromRelease(request, spec.version, lookups);
    }

    return this.fromLivePackage(pkg, lookups);
  }

  private async fromLivePackage(
    pkg: PackageWithArtefacts,
    lookups: ArtifactLookups,
  ): Promise<ResolvedPackage> {
    const [commandVersions, standardVersions, skillVersions] =
      await Promise.all([
        Promise.all(
          pkg.recipes.map((recipe) =>
            once(lookups.commandVersion, recipe.id as string, async () => {
              const versions = await this.commandsPort.listCommandVersions(
                recipe.id,
              );
              versions.sort(
                (a: CommandVersion, b: CommandVersion) => b.version - a.version,
              );
              return versions[0] ?? null;
            }),
          ),
        ),
        Promise.all(
          pkg.standards.map((standard) =>
            once(lookups.standardVersion, standard.id as string, () =>
              this.standardsPort.getLatestStandardVersion(standard.id),
            ),
          ),
        ),
        Promise.all(
          pkg.skills.map((skill) =>
            once(lookups.skillVersion, skill.id as string, async () => {
              const latest = await this.skillsPort.getLatestSkillVersion(
                skill.id,
              );
              if (!latest) return null;
              return {
                ...latest,
                files: await this.skillFiles(latest.id, lookups),
              };
            }),
          ),
        ),
      ]);

    return {
      packageId: pkg.id,
      spaceId: pkg.spaceId as string,
      resolvedVersion: WILDCARD_VERSION_SPEC,
      commandVersions: commandVersions.filter((cv) => cv != null),
      standardVersions: standardVersions.filter((sv) => sv != null),
      skillVersions: skillVersions.filter((skv) => skv != null),
    };
  }

  private async fromRelease(
    request: PackageContentRequest,
    version: string,
    lookups: ArtifactLookups,
  ): Promise<ResolvedPackage> {
    const { pkg, slug } = request;
    const release = await this.packageReleaseService.findContentByVersion(
      pkg.id,
      version,
    );

    if (!release) {
      const releases = await this.packageReleaseService.listReleases(pkg.id);
      throw new PackageVersionNotAvailableError(
        slug,
        version,
        sortVersionsLatestFirst(releases),
      );
    }

    const skillVersions = await Promise.all(
      release.skillVersions.map(async (skillVersion) => ({
        ...skillVersion,
        files: await this.skillFiles(skillVersion.id, lookups),
      })),
    );

    return {
      packageId: pkg.id,
      spaceId: pkg.spaceId as string,
      resolvedVersion: release.version,
      commandVersions: release.recipeVersions,
      standardVersions: release.standardVersions,
      skillVersions,
    };
  }

  private skillFiles(
    skillVersionId: SkillVersionId,
    lookups: ArtifactLookups,
  ): Promise<SkillVersionFiles> {
    return once(lookups.skillFiles, skillVersionId as string, () =>
      this.skillsPort.getSkillFiles(skillVersionId),
    );
  }

  /**
   * Flattens the per-package resolutions, first writer winning on a shared
   * artifact — the same rule the two use cases applied when they deduplicated
   * by artifact id. Two packages pinned to different releases of one shared
   * component render one of them; which one is the order the caller listed
   * its packages in.
   */
  private merge(resolved: ResolvedPackage[]): ResolvedPackagesContent {
    const commandVersions = new Map<string, CommandVersion>();
    const standardVersions = new Map<string, StandardVersion>();
    const skillVersions = new Map<string, SkillVersion>();

    const spaceIds = {
      command: new Map<string, string>(),
      standard: new Map<string, string>(),
      skill: new Map<string, string>(),
    };
    const packageIds = {
      command: new Map<string, string[]>(),
      standard: new Map<string, string[]>(),
      skill: new Map<string, string[]>(),
    };
    const resolvedVersions = new Map<PackageId, string>();

    const record = <V>(
      family: 'command' | 'standard' | 'skill',
      artifactId: string,
      version: V,
      versions: Map<string, V>,
      pkg: ResolvedPackage,
    ) => {
      if (!versions.has(artifactId)) {
        versions.set(artifactId, version);
        spaceIds[family].set(artifactId, pkg.spaceId);
      }
      const owners = packageIds[family].get(artifactId);
      if (owners) {
        owners.push(pkg.packageId as string);
      } else {
        packageIds[family].set(artifactId, [pkg.packageId as string]);
      }
    };

    for (const pkg of resolved) {
      resolvedVersions.set(pkg.packageId, pkg.resolvedVersion);
      for (const version of pkg.commandVersions) {
        record(
          'command',
          version.recipeId as string,
          version,
          commandVersions,
          pkg,
        );
      }
      for (const version of pkg.standardVersions) {
        record(
          'standard',
          version.standardId as string,
          version,
          standardVersions,
          pkg,
        );
      }
      for (const version of pkg.skillVersions) {
        record('skill', version.skillId as string, version, skillVersions, pkg);
      }
    }

    const mergedCommands = [...commandVersions.values()];
    const mergedStandards = [...standardVersions.values()];
    const mergedSkills = [...skillVersions.values()];

    return {
      commandVersions: mergedCommands,
      standardVersions: mergedStandards,
      skillVersions: mergedSkills,
      artifactMetadata: buildArtifactMetadataMap({
        recipes: {
          spaceIdMap: spaceIds.command,
          packageIdMap: packageIds.command,
          versions: mergedCommands,
        },
        standards: {
          spaceIdMap: spaceIds.standard,
          packageIdMap: packageIds.standard,
          versions: mergedStandards,
        },
        skills: {
          spaceIdMap: spaceIds.skill,
          packageIdMap: packageIds.skill,
          versions: mergedSkills,
        },
      }),
      resolvedVersions,
    };
  }
}

/** The greatest release version by parsed triple, or null for none. */
export const highestVersionOf = (
  releases: PackageReleaseEntry[],
): string | null => {
  let highest: string | null = null;
  let highestParsed = null;

  for (const release of releases) {
    const parsed = parsePackageReleaseVersion(release.version);
    if (!parsed) continue;
    if (
      highestParsed === null ||
      comparePackageReleaseVersions(parsed, highestParsed) > 0
    ) {
      highest = release.version;
      highestParsed = parsed;
    }
  }

  return highest;
};

/** Every released version, newest first; unparseable rows are dropped. */
export const sortVersionsLatestFirst = (
  releases: PackageReleaseEntry[],
): string[] =>
  releases
    .flatMap((release) => {
      const parsed = parsePackageReleaseVersion(release.version);
      return parsed ? [{ version: release.version, parsed }] : [];
    })
    .sort((a, b) => comparePackageReleaseVersions(b.parsed, a.parsed))
    .map((entry) => entry.version);

/**
 * Reads the spec a caller wrote for one package.
 *
 * `versions` absent altogether is a caller that predates pinning: every slug
 * it names tracks the live package, which is what it has always meant. Once a
 * caller sends the map at all, a slug missing from it named no version, and
 * null asks for the newest release.
 */
export const readPackageVersionSpec = (
  slug: string,
  versions: Record<string, string> | undefined,
): PackageVersionSpec | null => {
  if (versions === undefined) {
    return { kind: 'wildcard' };
  }
  const raw = versions[slug];
  if (raw === undefined) {
    return null;
  }
  const spec = parsePackageVersionSpec(raw);
  if (!spec) {
    throw new InvalidPackageVersionSpecError(slug, raw);
  }
  return spec;
};
