import { Package } from '@packmind/types';
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
  ResolvedArtefact,
} from '../services/PackageArtefactService';

/**
 * Makes a package the sole owner of artefacts: adds them to the target and
 * takes them out of every other package of the space.
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

    const plan = resolved.map((artefact) => {
      const owners = this.artefacts.packagesContaining(
        packages,
        itemType,
        artefact.id,
      );
      return {
        artefact,
        alreadyInTarget: owners.some((pkg) => pkg.id === target.id),
        sources: owners.filter((pkg) => pkg.id !== target.id),
      };
    });

    const toAdd = plan
      .filter((entry) => !entry.alreadyInTarget)
      .map((entry) => entry.artefact.id);

    if (toAdd.length > 0) {
      await this.gateway.packages.addArtefacts({
        packageId: target.id,
        spaceId: space.id,
        ...artefactIdsByType(itemType, toAdd),
        originSkill: command.originSkill,
      });
    }

    // One call per source package, each carrying every artefact it loses.
    for (const source of groupBySource(plan).values()) {
      await this.gateway.packages.removeArtefacts({
        packageId: source.pkg.id,
        spaceId: space.id,
        ...artefactIdsByType(
          itemType,
          source.artefacts.map((artefact) => artefact.id),
        ),
      });
    }

    return {
      targetPackageSlug: fullPackageSlug(space.slug, target.slug),
      moved: plan.map((entry) => ({
        slug: entry.artefact.slug,
        name: entry.artefact.name,
        addedToTarget: !entry.alreadyInTarget,
        removedFrom: entry.sources.map((pkg) =>
          fullPackageSlug(space.slug, pkg.slug),
        ),
      })),
    };
  }
}

type MovePlanEntry = {
  artefact: ResolvedArtefact;
  alreadyInTarget: boolean;
  sources: Package[];
};

/** Inverts the plan: one entry per source package, with what it gives up. */
function groupBySource(
  plan: MovePlanEntry[],
): Map<string, { pkg: Package; artefacts: ResolvedArtefact[] }> {
  const bySource = new Map<
    string,
    { pkg: Package; artefacts: ResolvedArtefact[] }
  >();

  for (const entry of plan) {
    for (const source of entry.sources) {
      const grouped = bySource.get(source.id) ?? { pkg: source, artefacts: [] };
      grouped.artefacts.push(entry.artefact);
      bySource.set(source.id, grouped);
    }
  }

  return bySource;
}
