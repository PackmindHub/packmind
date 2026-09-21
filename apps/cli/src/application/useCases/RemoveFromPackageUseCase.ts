import {
  IRemoveFromPackageCommand,
  IRemoveFromPackageResult,
  IRemoveFromPackageUseCase,
} from '../../domain/useCases/IRemoveFromPackageUseCase';
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';
import { ISpaceService } from '../../domain/services/ISpaceService';
import {
  artefactIdsByType,
  fullPackageSlug,
  PackageArtefactService,
} from '../services/PackageArtefactService';

/**
 * Takes artefacts out of one package, leaving their membership in any other
 * package untouched. Reports what each artefact still belongs to afterwards,
 * since an artefact in no package at all is invisible to `install`.
 */
export class RemoveFromPackageUseCase implements IRemoveFromPackageUseCase {
  private readonly artefacts: PackageArtefactService;

  constructor(
    private readonly gateway: IPackmindGateway,
    spaceService: ISpaceService,
  ) {
    this.artefacts = new PackageArtefactService(gateway, spaceService);
  }

  async execute(
    command: IRemoveFromPackageCommand,
  ): Promise<IRemoveFromPackageResult> {
    const { packageSlug, spaceSlug, itemType, itemSlugs } = command;

    const space = await this.artefacts.resolveSpace(spaceSlug);
    const packages = await this.artefacts.listPackages(space.id);
    const source = this.artefacts.findPackageBySlug(packages, packageSlug);

    const resolved = await this.artefacts.resolveArtefacts(
      itemType,
      itemSlugs,
      space.id,
      spaceSlug,
    );

    const plan = resolved.map((artefact) => {
      const owners = this.artefacts.packagesContaining(
        packages,
        itemType,
        artefact.id,
      );
      return {
        artefact,
        removed: owners.some((pkg) => pkg.id === source.id),
        remaining: owners.filter((pkg) => pkg.id !== source.id),
      };
    });

    const toRemove = plan
      .filter((entry) => entry.removed)
      .map((entry) => entry.artefact.id);

    if (toRemove.length > 0) {
      await this.gateway.packages.removeArtefacts({
        packageId: source.id,
        spaceId: space.id,
        ...artefactIdsByType(itemType, toRemove),
      });
    }

    return {
      packageSlug: fullPackageSlug(space.slug, source.slug),
      removed: plan.map((entry) => ({
        slug: entry.artefact.slug,
        name: entry.artefact.name,
        removed: entry.removed,
        remainingPackageSlugs: entry.remaining.map((pkg) =>
          fullPackageSlug(space.slug, pkg.slug),
        ),
      })),
    };
  }
}
