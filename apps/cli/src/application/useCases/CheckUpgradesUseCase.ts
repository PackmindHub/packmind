import {
  CodingAgent,
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

    const existingLockFile = await this.lockFileRepository.read(baseDirectory);
    const localLockFile = existingLockFile ?? this.emptyLockFile();

    if (configSlugs.length === 0) {
      return this.checkFullRemoval(localLockFile);
    }

    const { packagesSlugs, packageVersions } = resolveInstallPackageVersions({
      configSlugs,
      configVersions,
      upgrade: true,
    });

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

    const agents =
      existingLockFile && serverLockFile?.agents
        ? this.diffAgents(existingLockFile.agents, serverLockFile.agents)
        : null;

    const hasUpgrades =
      agents !== null ||
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
      agents,
    };
  }

  /**
   * With no package left in packmind.json, install deletes every file the lock
   * file references and the lock file itself, without asking the server.
   * Default skills are left out: install deleting them is a known bug.
   */
  private checkFullRemoval(
    localLockFile: PackmindLockFile,
  ): ICheckUpgradesResult {
    const unattributedArtifacts = this.diffLockFiles(
      localLockFile,
      this.emptyLockFile(),
    ).map((diff) => diff.change);

    return {
      hasUpgrades: unattributedArtifacts.length > 0,
      packages: [],
      unattributedArtifacts,
      missingAccess: [],
      agents: null,
    };
  }

  private emptyLockFile(): PackmindLockFile {
    return {
      lockfileVersion: 1,
      packageSlugs: [],
      agents: [],
      artifacts: {},
    };
  }

  private diffAgents(
    local: CodingAgent[] | undefined,
    server: CodingAgent[],
  ): ICheckUpgradesResult['agents'] {
    const from = this.configurableAgents(local ?? []);
    const to = this.configurableAgents(server);
    return from.join(',') === to.join(',') ? null : { from, to };
  }

  /** `packmind` renders the `.packmind/` mirror; nobody lists it in packmind.json. */
  private configurableAgents(agents: CodingAgent[]): CodingAgent[] {
    return agents
      .filter((agent) => agent !== 'packmind')
      .sort((a, b) => a.localeCompare(b));
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
            name: this.displayNameOf(key, entry),
            change: 'added',
            toVersion: entry.version,
          },
          packageIds: entry.packageIds,
        });
      } else if (before.version !== entry.version) {
        diffs.push({
          change: {
            type: entry.type,
            name: this.displayNameOf(key, entry),
            change: 'updated',
            fromVersion: before.version,
            toVersion: entry.version,
          },
          packageIds: entry.packageIds,
        });
      } else if (this.filesSignature(before) !== this.filesSignature(entry)) {
        diffs.push({
          change: {
            type: entry.type,
            name: this.displayNameOf(key, entry),
            change: 'rerendered',
            fromVersion: entry.version,
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
            name: this.displayNameOf(key, entry),
            change: 'removed',
            fromVersion: entry.version,
          },
          packageIds: entry.packageIds,
        });
      }
    }

    return diffs;
  }

  private filesSignature(entry: PackmindLockFileEntry): string {
    return (entry.files ?? [])
      .map((file) => `${file.agent ?? ''}:${file.path}`)
      .sort((a, b) => a.localeCompare(b))
      .join('\n');
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

  /** Shows the name the app shows; keys (`${source}:${type}:${slug}`) only carry the slug. */
  private displayNameOf(key: string, entry: PackmindLockFileEntry): string {
    return entry.name || key.split(':').slice(2).join(':');
  }
}
