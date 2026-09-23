import {
  IAddToPackageCommand,
  IAddToPackageResult,
  IAddToPackageUseCase,
} from '../../domain/useCases/IAddToPackageUseCase';
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';
import { ISpaceService } from '../../domain/services/ISpaceService';
import { ArtefactAlreadyInPackageError } from '../../domain/errors/ArtefactAlreadyInPackageError';
import {
  artefactIdsByType,
  fullPackageSlug,
  PackageArtefactService,
} from '../services/PackageArtefactService';

/**
 * Adds artefacts to a package, provided they belong to no other one.
 *
 * Throws {@link ArtefactAlreadyInPackageError} when an artefact already sits in
 * another package: an artefact is meant to live in a single package, and moving
 * it is `packmind packages move`, a deliberate command rather than a silent
 * side effect of `add`. Also throws `ItemNotFoundError` for an unknown package
 * or artefact slug.
 */
export class AddToPackageUseCase implements IAddToPackageUseCase {
  private readonly artefacts: PackageArtefactService;

  constructor(
    private readonly gateway: IPackmindGateway,
    spaceService: ISpaceService,
  ) {
    this.artefacts = new PackageArtefactService(gateway, spaceService);
  }

  async execute(command: IAddToPackageCommand): Promise<IAddToPackageResult> {
    const { packageSlug, spaceSlug, itemType, itemSlugs } = command;

    const space = await this.artefacts.resolveSpace(spaceSlug);
    const packages = await this.artefacts.listPackages(space.id);
    const target = this.artefacts.findPackageBySlug(packages, packageSlug);

    const resolved = await this.artefacts.resolveArtefacts(
      itemType,
      itemSlugs,
      space.id,
      spaceSlug,
    );

    const conflicts = resolved
      .map((artefact) => ({
        artefact,
        packages: this.artefacts
          .packagesContaining(packages, itemType, artefact.id)
          .filter((pkg) => pkg.id !== target.id),
      }))
      .filter(({ packages: owners }) => owners.length > 0);

    if (conflicts.length > 0) {
      throw new ArtefactAlreadyInPackageError(
        itemType,
        conflicts.map(({ artefact, packages: owners }) => ({
          slug: artefact.slug,
          name: artefact.name,
          packageSlugs: owners.map((pkg) =>
            fullPackageSlug(space.slug, pkg.slug),
          ),
        })),
        fullPackageSlug(space.slug, target.slug),
      );
    }

    const result = await this.gateway.packages.addArtefacts({
      packageId: target.id,
      spaceId: space.id,
      ...artefactIdsByType(
        itemType,
        resolved.map((artefact) => artefact.id),
      ),
      originSkill: command.originSkill,
    });

    const idToSlug = new Map(
      resolved.map((artefact) => [artefact.id, artefact.slug]),
    );
    const typeKey = itemType === 'command' ? 'commands' : `${itemType}s`;
    const toSlugs = (ids: string[]) => ids.map((id) => idToSlug.get(id) ?? id);

    return {
      added: toSlugs(result.added[typeKey as keyof typeof result.added]),
      skipped: toSlugs(result.skipped[typeKey as keyof typeof result.skipped]),
    };
  }
}
