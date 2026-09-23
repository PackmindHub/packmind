import {
  Command,
  Package,
  Skill,
  Space,
  SpaceId,
  Standard,
  createCommandId,
  createSkillId,
  createStandardId,
} from '@packmind/types';
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';
import { ISpaceService } from '../../domain/services/ISpaceService';
import { ItemNotFoundError } from '../../domain/errors/ItemNotFoundError';
import { ItemType } from '../../domain/entities/ItemType';

/**
 * An artefact (standard, command or skill) resolved from the slug the user
 * typed. Carries the `name` because the membership commands report what moved
 * using the artefact's display name, not its slug.
 */
export type ResolvedArtefact = {
  id: string;
  slug: string;
  name: string;
};

/** The id arrays an add/remove artefacts command expects, one type filled. */
export type ArtefactIdsByType = {
  standardIds: ReturnType<typeof createStandardId>[];
  recipeIds: ReturnType<typeof createCommandId>[];
  skillIds: ReturnType<typeof createSkillId>[];
};

/**
 * Shared reads behind `packages add`, `packages move` and `packages remove`.
 *
 * All three answer the same two questions before they touch anything: which
 * artefact does this slug denote, and which packages of the space already hold
 * it. Package membership now decides whether each command proceeds — one
 * artefact is meant to live in a single package — so the lookup belongs in one
 * place rather than in each use case.
 */
export class PackageArtefactService {
  constructor(
    private readonly gateway: IPackmindGateway,
    private readonly spaceService: ISpaceService,
  ) {}

  async resolveSpace(spaceSlug?: string): Promise<Space> {
    if (!spaceSlug) {
      return this.spaceService.getDefaultSpace();
    }

    const spaces = await this.spaceService.getSpaces();
    const space = spaces.find((s) => s.slug === spaceSlug);
    if (!space) {
      throw new Error(`Space '@${spaceSlug}' not found`);
    }
    return space;
  }

  async listPackages(spaceId: SpaceId): Promise<Package[]> {
    const { packages } = await this.gateway.packages.list({ spaceId });
    return packages;
  }

  findPackageBySlug(packages: Package[], packageSlug: string): Package {
    const pkg = packages.find((candidate) => candidate.slug === packageSlug);
    if (!pkg) {
      throw new ItemNotFoundError('package', packageSlug);
    }
    return pkg;
  }

  async resolveArtefacts(
    itemType: ItemType,
    slugs: string[],
    spaceId: SpaceId,
    spaceSlug?: string,
  ): Promise<ResolvedArtefact[]> {
    const artefacts: ResolvedArtefact[] = [];

    for (const slug of slugs) {
      const item = await this.findBySlug(itemType, slug, spaceId);
      if (!item) {
        throw new ItemNotFoundError(itemType, slug, spaceSlug);
      }
      artefacts.push({ id: item.id, slug, name: item.name });
    }

    return artefacts;
  }

  /** The packages of `packages` whose membership list holds `artefactId`. */
  packagesContaining(
    packages: Package[],
    itemType: ItemType,
    artefactId: string,
  ): Package[] {
    return packages.filter((pkg) =>
      membershipOf(pkg, itemType).includes(artefactId),
    );
  }

  private async findBySlug(
    itemType: ItemType,
    slug: string,
    spaceId: SpaceId,
  ): Promise<Standard | Command | Skill | null> {
    if (itemType === 'standard') {
      const { standards } = await this.gateway.standards.list({ spaceId });
      return standards.find((standard) => standard.slug === slug) ?? null;
    }

    if (itemType === 'command') {
      const { recipes } = await this.gateway.commands.list({ spaceId });
      return recipes.find((command) => command.slug === slug) ?? null;
    }

    const skills = await this.gateway.skills.list({ spaceId });
    return skills.find((skill) => skill.slug === slug) ?? null;
  }
}

/** The package field holding the memberships of `itemType`. */
function membershipOf(pkg: Package, itemType: ItemType): string[] {
  if (itemType === 'standard') return pkg.standards;
  if (itemType === 'command') return pkg.recipes;
  return pkg.skills;
}

/**
 * Spreads `ids` onto the single id array of its type, leaving the two others
 * empty — the shape both `add-artifacts` and `remove-artifacts` take.
 */
export function artefactIdsByType(
  itemType: ItemType,
  ids: string[],
): ArtefactIdsByType {
  return {
    standardIds: itemType === 'standard' ? ids.map(createStandardId) : [],
    recipeIds: itemType === 'command' ? ids.map(createCommandId) : [],
    skillIds: itemType === 'skill' ? ids.map(createSkillId) : [],
  };
}

/** `@space/package`, the form the user types and the CLI reports back. */
export function fullPackageSlug(spaceSlug: string, packageSlug: string) {
  return `@${spaceSlug}/${packageSlug}`;
}
