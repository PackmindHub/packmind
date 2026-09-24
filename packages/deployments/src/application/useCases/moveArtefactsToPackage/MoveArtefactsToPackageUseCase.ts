import { PackmindLogger } from '@packmind/logger';
import {
  AbstractSpaceMemberUseCase,
  SpaceMemberContext,
  PackmindEventEmitterService,
} from '@packmind/node-utils';
import {
  ArtefactRemovedFromPackageEvent,
  ArtefactsRemovedFromPackage,
  CommandId,
  IAccountsPort,
  ICommandsPort,
  IMoveArtefactsToPackageUseCase,
  ISkillsPort,
  ISpacesPort,
  IStandardsPort,
  MoveArtefactsToPackageCommand,
  MoveArtefactsToPackageResponse,
  Package,
  PackageId,
  SkillId,
  StandardId,
  createOrganizationId,
  createUserId,
} from '@packmind/types';
import { ArtefactsMoveFailedError } from '../../../domain/errors/ArtefactsMoveFailedError';
import { PackageNotFoundError } from '../../../domain/errors/PackageNotFoundError';
import { PackageReloadFailedError } from '../../../domain/errors/PackageReloadFailedError';
import { SpaceNotAccessibleError } from '../../../domain/errors/SpaceNotAccessibleError';
import { IPackageRepository } from '../../../domain/repositories/IPackageRepository';
import { DeploymentsServices } from '../../services/DeploymentsServices';
import { PackageChangeNotifier } from '../../services/PackageChangeNotifier';
import { assertArtefactsInSpace } from '../../utils/assertArtefactsInSpace';

const origin = 'MoveArtefactsToPackageUseCase';

/** The three artefact kinds a package holds, always travelling together. */
type ArtefactBuckets = {
  standards: StandardId[];
  commands: CommandId[];
  skills: SkillId[];
};

const isEmpty = (buckets: ArtefactBuckets): boolean =>
  buckets.standards.length === 0 &&
  buckets.commands.length === 0 &&
  buckets.skills.length === 0;

/**
 * Moves artefacts into one package and out of every other package in the
 * space, so that an artefact belongs to a single package.
 *
 * The target is written first: an artefact is therefore never in no package at
 * all, even mid-flight. Every write registers how to undo itself, so a failure
 * anywhere puts the packages back the way they were — the alternative is a
 * half-moved artefact nobody asked for, which is worse than the rule this use
 * case exists to enforce.
 */
export class MoveArtefactsToPackageUseCase
  extends AbstractSpaceMemberUseCase<
    MoveArtefactsToPackageCommand,
    MoveArtefactsToPackageResponse
  >
  implements IMoveArtefactsToPackageUseCase
{
  constructor(
    spacesPort: ISpacesPort,
    accountsPort: IAccountsPort,
    private readonly services: DeploymentsServices,
    private readonly commandsPort: ICommandsPort,
    private readonly standardsPort: IStandardsPort,
    private readonly skillsPort: ISkillsPort,
    private readonly eventEmitterService: PackmindEventEmitterService,
    private readonly packageChangeNotifier: PackageChangeNotifier,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(spacesPort, accountsPort, logger);
    this.logger.info('MoveArtefactsToPackageUseCase initialized');
  }

  async executeForSpaceMembers(
    command: MoveArtefactsToPackageCommand & SpaceMemberContext,
  ): Promise<MoveArtefactsToPackageResponse> {
    const {
      packageId,
      spaceId,
      recipeIds = [],
      standardIds = [],
      skillIds = [],
    } = command;

    this.logger.info('Moving artefacts to package', {
      packageId,
      recipeCount: recipeIds.length,
      standardCount: standardIds.length,
      skillCount: skillIds.length,
    });

    // Missing and belonging-to-another-tenant are one branch on purpose: they
    // have to be indistinguishable from outside, and a single throw is what
    // keeps them that way.
    const space = await this.spacesPort.getSpaceById(spaceId);
    if (!space || space.organizationId !== command.organizationId) {
      throw new SpaceNotAccessibleError(spaceId, command.organizationId);
    }

    const targetPackage = await this.services
      .getPackageService()
      .findById(packageId);
    if (!targetPackage || targetPackage.spaceId !== spaceId) {
      throw new PackageNotFoundError(packageId, spaceId);
    }

    const held = heldByPackage(targetPackage, {
      standards: standardIds,
      commands: recipeIds,
      skills: skillIds,
    });
    const toAdd: ArtefactBuckets = {
      standards: standardIds.filter((id) => !held.standards.includes(id)),
      commands: recipeIds.filter((id) => !held.commands.includes(id)),
      skills: skillIds.filter((id) => !held.skills.includes(id)),
    };

    await assertArtefactsInSpace(
      {
        commandsPort: this.commandsPort,
        standardsPort: this.standardsPort,
        skillsPort: this.skillsPort,
      },
      targetPackage.spaceId,
      {
        standardIds: toAdd.standards,
        commandIds: toAdd.commands,
        skillIds: toAdd.skills,
      },
    );

    const allPackages = await this.services
      .getPackageService()
      .getPackagesBySpaceId(spaceId);

    const sources = allPackages
      .filter((pkg) => pkg.id !== packageId)
      .map((pkg) => ({
        packageId: pkg.id,
        artefacts: heldByPackage(pkg, {
          standards: standardIds,
          commands: recipeIds,
          skills: skillIds,
        }),
      }))
      .filter((source) => !isEmpty(source.artefacts));

    await this.applyMove(packageId, toAdd, sources);

    const updatedPackage = await this.services
      .getPackageService()
      .findById(packageId);

    if (!updatedPackage) {
      throw new PackageReloadFailedError(packageId);
    }

    this.emitRemovals(command, sources);

    await this.packageChangeNotifier.packagesChanged(
      command.organizationId,
      spaceId,
    );

    this.logger.info('Artefacts moved to package successfully', {
      packageId: updatedPackage.id,
      addedRecipes: toAdd.commands.length,
      addedStandards: toAdd.standards.length,
      addedSkills: toAdd.skills.length,
      emptiedPackages: sources.length,
    });

    return {
      package: updatedPackage,
      added: {
        standards: toAdd.standards,
        commands: toAdd.commands,
        skills: toAdd.skills,
      },
      skipped: {
        standards: held.standards,
        commands: held.commands,
        skills: held.skills,
      },
      removedFrom: sources.map(
        (source): ArtefactsRemovedFromPackage => ({
          packageId: source.packageId,
          standards: source.artefacts.standards,
          commands: source.artefacts.commands,
          skills: source.artefacts.skills,
        }),
      ),
    };
  }

  /**
   * Writes the target first, then empties the sources, collecting an undo for
   * each write as it lands. Anything thrown rolls the lot back before it
   * surfaces, so a caller that sees an error sees the packages unchanged.
   */
  private async applyMove(
    packageId: PackageId,
    toAdd: ArtefactBuckets,
    sources: { packageId: PackageId; artefacts: ArtefactBuckets }[],
  ): Promise<void> {
    const packageRepository = this.services
      .getRepositories()
      .getPackageRepository();
    const undos: (() => Promise<void>)[] = [];

    try {
      await this.addTo(packageRepository, packageId, toAdd, undos);

      for (const source of sources) {
        await this.removeFrom(
          packageRepository,
          source.packageId,
          source.artefacts,
          undos,
        );
      }
    } catch (error) {
      const reverted = await this.revert(undos);
      this.logger.error('Move failed, packages restored to their prior state', {
        packageId,
        reverted,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new ArtefactsMoveFailedError(packageId, reverted, error);
    }
  }

  private async addTo(
    packageRepository: IPackageRepository,
    packageId: PackageId,
    artefacts: ArtefactBuckets,
    undos: (() => Promise<void>)[],
  ): Promise<void> {
    if (artefacts.commands.length > 0) {
      await packageRepository.addCommands(packageId, artefacts.commands);
      undos.push(() =>
        packageRepository.removeCommands(packageId, artefacts.commands),
      );
    }

    if (artefacts.standards.length > 0) {
      await packageRepository.addStandards(packageId, artefacts.standards);
      undos.push(() =>
        packageRepository.removeStandards(packageId, artefacts.standards),
      );
    }

    if (artefacts.skills.length > 0) {
      await packageRepository.addSkills(packageId, artefacts.skills);
      undos.push(() =>
        packageRepository.removeSkills(packageId, artefacts.skills),
      );
    }
  }

  private async removeFrom(
    packageRepository: IPackageRepository,
    packageId: PackageId,
    artefacts: ArtefactBuckets,
    undos: (() => Promise<void>)[],
  ): Promise<void> {
    if (artefacts.commands.length > 0) {
      await packageRepository.removeCommands(packageId, artefacts.commands);
      undos.push(() =>
        packageRepository.addCommands(packageId, artefacts.commands),
      );
    }

    if (artefacts.standards.length > 0) {
      await packageRepository.removeStandards(packageId, artefacts.standards);
      undos.push(() =>
        packageRepository.addStandards(packageId, artefacts.standards),
      );
    }

    if (artefacts.skills.length > 0) {
      await packageRepository.removeSkills(packageId, artefacts.skills);
      undos.push(() =>
        packageRepository.addSkills(packageId, artefacts.skills),
      );
    }
  }

  /**
   * Undoes the writes in reverse. Every undo is attempted even after one of
   * them fails, since each restores a different package and giving up early
   * would leave more of them wrong than necessary.
   */
  private async revert(undos: (() => Promise<void>)[]): Promise<boolean> {
    let reverted = true;

    for (const undo of [...undos].reverse()) {
      try {
        await undo();
      } catch (error) {
        reverted = false;
        this.logger.error('Could not undo part of a failed move', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return reverted;
  }

  /**
   * One event per artefact and source package, matching what a plain removal
   * emits so deployment drift is tracked the same way. The move leaves each
   * artefact in the target and nowhere else, hence the single remaining
   * package.
   */
  private emitRemovals(
    command: MoveArtefactsToPackageCommand & SpaceMemberContext,
    sources: { packageId: PackageId; artefacts: ArtefactBuckets }[],
  ): void {
    for (const source of sources) {
      const artefactIds = [
        ...source.artefacts.standards,
        ...source.artefacts.commands,
        ...source.artefacts.skills,
      ].map(String);

      for (const artefactId of artefactIds) {
        this.eventEmitterService.emit(
          new ArtefactRemovedFromPackageEvent({
            artefactId,
            spaceId: command.spaceId,
            packageId: source.packageId,
            remainingPackagesCount: 1,
            userId: createUserId(command.userId),
            organizationId: createOrganizationId(command.organizationId),
            source: command.source ?? 'ui',
          }),
        );
      }
    }
  }
}

/** The slice of a requested selection that a package currently holds. */
function heldByPackage(pkg: Package, wanted: ArtefactBuckets): ArtefactBuckets {
  const standards = pkg.standards ?? [];
  const commands = pkg.recipes ?? [];
  const skills = pkg.skills ?? [];

  return {
    standards: wanted.standards.filter((id: StandardId) =>
      standards.includes(id),
    ),
    commands: wanted.commands.filter((id: CommandId) => commands.includes(id)),
    skills: wanted.skills.filter((id: SkillId) => skills.includes(id)),
  };
}
