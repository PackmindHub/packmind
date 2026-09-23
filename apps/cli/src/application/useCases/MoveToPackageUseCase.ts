import {
  ArtefactsRemovedFromPackage,
  MoveArtefactsToPackageResponse,
  Package,
} from '@packmind/types';
import {
  IMoveToPackageCommand,
  IMoveToPackageResult,
  IMoveToPackageUseCase,
} from '../../domain/useCases/IMoveToPackageUseCase';
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';
import { ISpaceService } from '../../domain/services/ISpaceService';
import {
  artefactIdsByType,
  fullPackageSlug,
  PackageArtefactService,
} from '../services/PackageArtefactService';

/**
 * Makes a package the sole owner of artefacts: adds them to the target and
 * takes them out of every other package of the space.
 *
 * One server-side call, which either lands whole or is rolled back, so a
 * failure leaves membership exactly as it was rather than half-moved.
 *
 * Idempotent — an artefact already in the target and nowhere else is left
 * alone, and the result says so, so the handler can tell the user nothing
 * changed.
 */
export class MoveToPackageUseCase implements IMoveToPackageUseCase {
  private readonly artefacts: PackageArtefactService;

  constructor(
    private readonly gateway: IPackmindGateway,
    spaceService: ISpaceService,
  ) {
    this.artefacts = new PackageArtefactService(gateway, spaceService);
  }

  async execute(command: IMoveToPackageCommand): Promise<IMoveToPackageResult> {
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

    const result = await this.gateway.packages.moveArtefacts({
      packageId: target.id,
      spaceId: space.id,
      ...artefactIdsByType(
        itemType,
        resolved.map((artefact) => artefact.id),
      ),
      originSkill: command.originSkill,
    });

    // What the move did, reported from the server's answer rather than from the
    // state read before it: the two agree, and only one of them is the record
    // of what happened.
    const added = new Set(addedIds(result));
    const leftBehind = leftPackagesByArtefact(result.removedFrom, packages);

    return {
      targetPackageSlug: fullPackageSlug(space.slug, target.slug),
      moved: resolved.map((artefact) => ({
        slug: artefact.slug,
        name: artefact.name,
        addedToTarget: added.has(artefact.id),
        removedFrom: (leftBehind.get(artefact.id) ?? []).map((pkg) =>
          fullPackageSlug(space.slug, pkg.slug),
        ),
      })),
    };
  }
}

function addedIds(result: MoveArtefactsToPackageResponse): string[] {
  return [
    ...result.added.standards,
    ...result.added.commands,
    ...result.added.skills,
  ];
}

/**
 * Inverts the server's per-package report into the per-artefact one the user
 * reads: each line names an artefact, then the packages it left.
 */
function leftPackagesByArtefact(
  removedFrom: ArtefactsRemovedFromPackage[],
  packages: Package[],
): Map<string, Package[]> {
  const byArtefact = new Map<string, Package[]>();

  for (const emptied of removedFrom) {
    const pkg = packages.find(
      (candidate) => candidate.id === emptied.packageId,
    );
    if (!pkg) continue;

    const ids = [...emptied.standards, ...emptied.commands, ...emptied.skills];
    for (const artefactId of ids) {
      byArtefact.set(artefactId, [...(byArtefact.get(artefactId) ?? []), pkg]);
    }
  }

  return byArtefact;
}
