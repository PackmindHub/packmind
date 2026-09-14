import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  CommandId,
  CommandVersionId,
  CreatePackageReleaseCommand,
  CreatePackageReleaseResponse,
  IAccountsPort,
  ICommandsPort,
  ICreatePackageReleaseUseCase,
  ISkillsPort,
  IStandardsPort,
  PackageId,
  SkillId,
  SkillVersionId,
  StandardId,
  StandardVersionId,
  comparePackageReleaseVersions,
  createPackageReleaseId,
  parsePackageReleaseVersion,
  validatePackageReleaseVersion,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { DeploymentsServices } from '../../services/DeploymentsServices';
import { PackageNotFoundError } from '../../../domain/errors/PackageNotFoundError';
import { PackageReleaseRefusedError } from '../../../domain/errors/PackageReleaseRefusedError';
import { PackageReleaseVersionIds } from '../../../domain/repositories/IPackageReleaseRepository';

const origin = 'CreatePackageReleaseUseCase';

/** A package that has never been released; internal, never rendered. */
const NEVER_RELEASED = '0.0.0';

/** Postgres unique_violation. */
const UNIQUE_VIOLATION = '23505';

const isUniqueViolation = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  (error as { code?: unknown }).code === UNIQUE_VIOLATION;

export class CreatePackageReleaseUseCase
  extends AbstractMemberUseCase<
    CreatePackageReleaseCommand,
    CreatePackageReleaseResponse
  >
  implements ICreatePackageReleaseUseCase
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
    this.logger.info('CreatePackageReleaseUseCase initialized');
  }

  async executeForMembers(
    command: CreatePackageReleaseCommand & MemberContext,
  ): Promise<CreatePackageReleaseResponse> {
    const { packageId, version } = command;

    this.logger.info('Cutting package release', { packageId, version });

    const pkg = await this.services.getPackageService().findById(packageId);
    if (!pkg) {
      throw new PackageNotFoundError(packageId);
    }

    const recipeIds = pkg.recipes ?? [];
    const standardIds = pkg.standards ?? [];
    const skillIds = pkg.skills ?? [];

    const currentVersion = await this.readCurrentVersion(packageId);

    // Before the version is even looked at: an empty package with a malformed
    // version reports the empty package.
    if (
      recipeIds.length === 0 &&
      standardIds.length === 0 &&
      skillIds.length === 0
    ) {
      throw new PackageReleaseRefusedError('no_components', currentVersion);
    }

    const refusal = validatePackageReleaseVersion(version, currentVersion);
    if (refusal) {
      throw new PackageReleaseRefusedError(refusal, currentVersion);
    }

    const versions = await this.pinLatestVersions(
      recipeIds,
      standardIds,
      skillIds,
    );

    try {
      const release = await this.services
        .getPackageReleaseService()
        .createRelease(
          {
            id: createPackageReleaseId(uuidv4()),
            packageId,
            version,
            name: pkg.name,
            description: pkg.description,
          },
          versions,
        );

      this.logger.info('Package release cut', {
        packageId,
        version,
        packageReleaseId: release.id,
      });

      return { release };
    } catch (error) {
      // The unique index is the arbiter of the race; the pre-check above only
      // produces the good message when nobody is racing.
      if (isUniqueViolation(error)) {
        const freshCurrentVersion = await this.readCurrentVersion(packageId);
        throw new PackageReleaseRefusedError(
          'not_greater',
          freshCurrentVersion,
        );
      }

      throw error;
    }
  }

  /**
   * The greatest release by parsed triple, or the never-released sentinel.
   * Never orders by the version string: `0.10.0` sorts below `0.9.0`.
   */
  private async readCurrentVersion(packageId: PackageId): Promise<string> {
    const releases = await this.services
      .getPackageReleaseService()
      .listReleases(packageId);

    let current = NEVER_RELEASED;
    let currentParsed = parsePackageReleaseVersion(NEVER_RELEASED);

    for (const release of releases) {
      const parsed = parsePackageReleaseVersion(release.version);
      if (!parsed) {
        continue;
      }
      if (
        !currentParsed ||
        comparePackageReleaseVersions(parsed, currentParsed) > 0
      ) {
        current = release.version;
        currentParsed = parsed;
      }
    }

    return current;
  }

  /**
   * Resolves every component to its latest version, caching per component id.
   * A component with no version at all refuses the whole release: a release is
   * a claim about a set, so it is never quietly cut short.
   */
  private async pinLatestVersions(
    recipeIds: CommandId[],
    standardIds: StandardId[],
    skillIds: SkillId[],
  ): Promise<PackageReleaseVersionIds> {
    const recipeVersionIds: CommandVersionId[] = [];
    const standardVersionIds: StandardVersionId[] = [];
    const skillVersionIds: SkillVersionId[] = [];

    const commandVersionCache = new Map<CommandId, CommandVersionId>();
    const standardVersionCache = new Map<StandardId, StandardVersionId>();
    const skillVersionCache = new Map<SkillId, SkillVersionId>();

    for (const recipeId of recipeIds) {
      if (!commandVersionCache.has(recipeId)) {
        const versions = await this.commandsPort.listCommandVersions(recipeId);
        if (versions.length > 0) {
          const latestVersion = [...versions].sort(
            (a, b) => b.version - a.version,
          )[0];
          commandVersionCache.set(recipeId, latestVersion.id);
        }
      }

      const versionId = commandVersionCache.get(recipeId);
      if (!versionId) {
        throw new Error(`Command ${recipeId} has no version to pin`);
      }
      recipeVersionIds.push(versionId);
    }

    for (const standardId of standardIds) {
      if (!standardVersionCache.has(standardId)) {
        const latestVersion =
          await this.standardsPort.getLatestStandardVersion(standardId);
        if (latestVersion) {
          standardVersionCache.set(standardId, latestVersion.id);
        }
      }

      const versionId = standardVersionCache.get(standardId);
      if (!versionId) {
        throw new Error(`Standard ${standardId} has no version to pin`);
      }
      standardVersionIds.push(versionId);
    }

    for (const skillId of skillIds) {
      if (!skillVersionCache.has(skillId)) {
        const latestVersion =
          await this.skillsPort.getLatestSkillVersion(skillId);
        if (latestVersion) {
          skillVersionCache.set(skillId, latestVersion.id);
        }
      }

      const versionId = skillVersionCache.get(skillId);
      if (!versionId) {
        throw new Error(`Skill ${skillId} has no version to pin`);
      }
      skillVersionIds.push(versionId);
    }

    return { recipeVersionIds, standardVersionIds, skillVersionIds };
  }
}
