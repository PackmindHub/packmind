import {
  PackmindLockFile,
  PackmindLockFileEntry,
  parsePackageVersionSpec,
} from '@packmind/types';
import {
  CheckUpgradesArtifactChange,
  CheckUpgradesPackage,
  ICheckUpgradesCommand,
  ICheckUpgradesResult,
  ICheckUpgradesUseCase,
} from '../../domain/useCases/ICheckUpgradesUseCase';
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';
import { ILockFileRepository } from '../../domain/repositories/ILockFileRepository';
import { IConfigFileRepository } from '../../domain/repositories/IConfigFileRepository';
import { ISpaceService } from '../../domain/services/ISpaceService';
import { PackmindConfigNotFoundError } from '../../domain/errors/PackmindConfigNotFoundError';
import { PackmindConfigInvalidError } from '../../domain/errors/PackmindConfigInvalidError';
import { normalizeConfigPackages } from '../utils/normalizePackageSlugs';
import { resolveInstallPackageVersions } from '../services/resolveInstallPackageVersions';

const USER_ENTRY_PREFIX = 'user:';
const LOCK_FILE_PATH = 'packmind-lock.json';

type ArtifactDiff = {
  change: CheckUpgradesArtifactChange;
  packageIds: string[];
};

/**
 * Only ever reads: packmind.json is not normalised back to disk, the lock file
 * is not rewritten, no artifact file is touched, and the server is asked for a
 * preview so the request is not counted as a pull.
 */
export class CheckUpgradesUseCase implements ICheckUpgradesUseCase {
  constructor(
    private readonly packmindGateway: IPackmindGateway,
    private readonly lockFileRepository: ILockFileRepository,
    private readonly configFileRepository: IConfigFileRepository,
    private readonly spaceService: ISpaceService,
  ) {}

  public async execute(
    command: ICheckUpgradesCommand,
  ): Promise<ICheckUpgradesResult> {
    const { baseDirectory } = command;

    const config = await this.configFileRepository.readConfig(baseDirectory);
    if (!config) {
      if (await this.configFileRepository.configExists(baseDirectory)) {
        throw new PackmindConfigInvalidError(baseDirectory);
      }
      throw new PackmindConfigNotFoundError(baseDirectory);
    }

    const { slugs: configSlugs, versions: configVersions } =
      await normalizeConfigPackages(config.packages, this.spaceService);

    if (configSlugs.length === 0) {
      return {
        hasUpgrades: false,
        packages: [],
        unattributedArtifacts: [],
        missingAccess: [],
      };
    }

    const { packagesSlugs, packageVersions } = resolveInstallPackageVersions({
      configSlugs,
      configVersions,
      upgrade: true,
    });

    const localLockFile = (await this.lockFileRepository.read(
      baseDirectory,
    )) ?? {
      lockfileVersion: 1,
      packageSlugs: [],
      agents: [],
      artifacts: {},
    };

    const response = await this.packmindGateway.deployment.install({
      packagesSlugs,
      packageVersions,
      packmindLockFile: { ...localLockFile, cliVersion: command.cliVersion },
      agents: config.agents,
      preview: true,
    });

    const serverLockFile = this.parseServerLockFile(
      response.fileUpdates.createOrUpdate,
    );
    const diffs = serverLockFile
      ? this.diffLockFiles(localLockFile, serverLockFile)
      : [];

    const missingAccess = new Set(response.missingAccess);
    const packageIds = response.resolvedPackageIds ?? {};
    const attributed = new Set<ArtifactDiff>();

    const packages: CheckUpgradesPackage[] = [...new Set(configSlugs)]
      .filter((slug) => !missingAccess.has(slug))
      .map((slug) => {
        const packageId = packageIds[slug];
        const packageDiffs = packageId
          ? diffs.filter((diff) => diff.packageIds.includes(packageId))
          : [];
        packageDiffs.forEach((diff) => attributed.add(diff));

        const from = configVersions[slug];
        return {
          slug,
          from,
          to: this.resolveTargetVersion(
            from,
            response.resolvedPackageVersions?.[slug],
          ),
          artifacts: packageDiffs.map((diff) => diff.change),
        };
      });

    const unattributedArtifacts = diffs
      .filter((diff) => !attributed.has(diff))
      .map((diff) => diff.change);

    const hasUpgrades =
      unattributedArtifacts.length > 0 ||
      packages.some(
        (pkg) =>
          pkg.artifacts.length > 0 || (pkg.to !== null && pkg.to !== pkg.from),
      );

    return {
      hasUpgrades,
      packages,
      unattributedArtifacts,
      missingAccess: response.missingAccess,
    };
  }

  private resolveTargetVersion(
    from: string,
    resolved: string | undefined,
  ): string | null {
    if (parsePackageVersionSpec(from)?.kind !== 'exact') return null;
    return resolved ?? from;
  }

  private parseServerLockFile(
    files: Array<{ path: string; content?: string }>,
  ): PackmindLockFile | null {
    const content = files.find((file) => file.path === LOCK_FILE_PATH)?.content;
    if (!content) return null;
    try {
      return JSON.parse(content) as PackmindLockFile;
    } catch {
      return null;
    }
  }

  private diffLockFiles(
    local: PackmindLockFile,
    server: PackmindLockFile,
  ): ArtifactDiff[] {
    const localEntries = this.userEntries(local);
    const serverEntries = this.userEntries(server);
    const diffs: ArtifactDiff[] = [];

    for (const [key, entry] of serverEntries) {
      const before = localEntries.get(key);
      if (!before) {
        diffs.push({
          change: {
            type: entry.type,
            name: this.slugOf(key),
            change: 'added',
            toVersion: entry.version,
          },
          packageIds: entry.packageIds,
        });
      } else if (before.version !== entry.version) {
        diffs.push({
          change: {
            type: entry.type,
            name: this.slugOf(key),
            change: 'updated',
            fromVersion: before.version,
            toVersion: entry.version,
          },
          packageIds: entry.packageIds,
        });
      }
    }

    for (const [key, entry] of localEntries) {
      if (!serverEntries.has(key)) {
        diffs.push({
          change: {
            type: entry.type,
            name: this.slugOf(key),
            change: 'removed',
            fromVersion: entry.version,
          },
          packageIds: entry.packageIds,
        });
      }
    }

    return diffs;
  }

  private userEntries(
    lockFile: PackmindLockFile,
  ): Map<string, PackmindLockFileEntry> {
    return new Map(
      Object.entries(lockFile.artifacts ?? {}).filter(([key]) =>
        key.startsWith(USER_ENTRY_PREFIX),
      ),
    );
  }

  /** Keys are `${source}:${type}:${slug}`. */
  private slugOf(key: string): string {
    return key.split(':').slice(2).join(':');
  }
}
