import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  CreatePackageReleaseCommand,
  CreatePackageReleaseResponse,
  IAccountsPort,
  ICommandsPort,
  ICreatePackageReleaseUseCase,
  ISkillsPort,
  IStandardsPort,
  createPackageReleaseId,
  validatePackageReleaseVersion,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { DeploymentsServices } from '../../services/DeploymentsServices';
import {
  resolveLatestComponentVersions,
  currentVersionOf,
  toPackageReleaseVersionIds,
} from '../../services/packageReleaseResolution';
import { PackageNotFoundError } from '../../../domain/errors/PackageNotFoundError';
import { PackageReleaseRefusedError } from '../../../domain/errors/PackageReleaseRefusedError';
import { PackageComponentHasNoVersionError } from '../../../domain/errors/PackageComponentHasNoVersionError';

const origin = 'CreatePackageReleaseUseCase';

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

    const releases = await this.services
      .getPackageReleaseService()
      .listReleases(packageId);
    const currentVersion = currentVersionOf(releases);

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

    const resolution = await resolveLatestComponentVersions(
      {
        recipeIds,
        standardIds,
        skillIds,
      },
      {
        commandsPort: this.commandsPort,
        standardsPort: this.standardsPort,
        skillsPort: this.skillsPort,
      },
    );

    // Throw for unresolved components in family order: recipe, standard, skill
    for (const unresolved of resolution.unresolved) {
      if (unresolved.family === 'recipe') {
        throw new PackageComponentHasNoVersionError(
          unresolved.family,
          unresolved.componentId,
        );
      }
    }
    for (const unresolved of resolution.unresolved) {
      if (unresolved.family === 'standard') {
        throw new PackageComponentHasNoVersionError(
          unresolved.family,
          unresolved.componentId,
        );
      }
    }
    for (const unresolved of resolution.unresolved) {
      if (unresolved.family === 'skill') {
        throw new PackageComponentHasNoVersionError(
          unresolved.family,
          unresolved.componentId,
        );
      }
    }

    const versions = toPackageReleaseVersionIds(resolution.resolved);

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
        const freshReleases = await this.services
          .getPackageReleaseService()
          .listReleases(packageId);
        const freshCurrentVersion = currentVersionOf(freshReleases);
        throw new PackageReleaseRefusedError(
          'not_greater',
          freshCurrentVersion,
        );
      }

      throw error;
    }
  }
}
