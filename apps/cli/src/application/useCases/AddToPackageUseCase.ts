import {
  IAddToPackageCommand,
  IAddToPackageResult,
  IAddToPackageUseCase,
  ItemType,
} from '../../domain/useCases/IAddToPackageUseCase';
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';
import { ItemNotFoundError } from '../../domain/errors/ItemNotFoundError';
import { ISpaceService } from '../../domain/services/ISpaceService';
import {
  AddArtefactsToPackageCommand,
  createRecipeId,
  createSkillId,
  createStandardId,
  Recipe,
  Skill,
  SpaceId,
  Standard,
} from '@packmind/types';

export class AddToPackageUseCase implements IAddToPackageUseCase {
  constructor(
    private readonly gateway: IPackmindGateway,
    private readonly spaceService: ISpaceService,
  ) {}

  async execute(command: IAddToPackageCommand): Promise<IAddToPackageResult> {
    const { packageSlug, spaceSlug, itemType, itemSlugs } = command;

    const space = spaceSlug
      ? await this.resolveSpaceBySlug(spaceSlug)
      : await this.spaceService.getDefaultSpace();

    const packages = await this.gateway.packages.list({});
    const pkg = packages.packages.find(
      (pkg) => pkg.slug === packageSlug && pkg.spaceId === space.id,
    );
    if (!pkg) {
      throw new ItemNotFoundError('package', packageSlug);
    }

    // Resolve slugs to IDs based on item type (also builds ID->slug mapping)
    const { ids, idToSlugMap } = await this.resolveSlugsToIds(
      itemType,
      itemSlugs,
      space.id,
      spaceSlug,
    );

    // Build command based on item type
    const addCommand: Omit<
      AddArtefactsToPackageCommand,
      'userId' | 'organizationId'
    > = {
      packageId: pkg.id,
      spaceId: space.id,
      standardIds: [],
      recipeIds: [],
      skillIds: [],
      originSkill: command.originSkill,
    };

    if (itemType === 'standard') {
      addCommand.standardIds = ids.map(createStandardId);
    } else if (itemType === 'command') {
      addCommand.recipeIds = ids.map(createRecipeId);
    } else if (itemType === 'skill') {
      addCommand.skillIds = ids.map(createSkillId);
    }

    const result = await this.gateway.packages.addArtefacts(addCommand);

    // Extract the relevant added/skipped arrays based on item type
    const typeKey = itemType === 'command' ? 'commands' : `${itemType}s`;
    const addedIds = result.added[typeKey as keyof typeof result.added];
    const skippedIds = result.skipped[typeKey as keyof typeof result.skipped];

    // Convert IDs back to slugs
    return {
      added: addedIds.map((id) => idToSlugMap.get(id) ?? id),
      skipped: skippedIds.map((id) => idToSlugMap.get(id) ?? id),
    };
  }

  private async resolveSpaceBySlug(spaceSlug: string) {
    const spaces = await this.spaceService.getSpaces();
    const space = spaces.find((s) => s.slug === spaceSlug);
    if (!space) {
      throw new Error(`Space '@${spaceSlug}' not found`);
    }
    return space;
  }

  private async resolveSlugsToIds(
    itemType: ItemType,
    slugs: string[],
    spaceId: SpaceId,
    spaceSlug?: string,
  ): Promise<{ ids: string[]; idToSlugMap: Map<string, string> }> {
    const ids: string[] = [];
    const idToSlugMap = new Map<string, string>();

    for (const slug of slugs) {
      let item: { id: string } | null = null;

      if (itemType === 'standard') {
        item = await this.findStandardBySlug(slug, spaceId);
      } else if (itemType === 'command') {
        item = await this.findCommandBySlug(slug, spaceId);
      } else if (itemType === 'skill') {
        item = await this.findSkillBySlug(slug, spaceId);
      }

      if (!item) {
        throw new ItemNotFoundError(itemType, slug, spaceSlug);
      }

      ids.push(item.id);
      idToSlugMap.set(item.id, slug);
    }

    return { ids, idToSlugMap };
  }

  private async findStandardBySlug(
    slug: string,
    spaceId: SpaceId,
  ): Promise<Standard | null> {
    const standards = await this.gateway.standards.list({ spaceId });
    return (
      standards.standards.find((standard) => standard.slug === slug) ?? null
    );
  }

  private async findCommandBySlug(
    slug: string,
    spaceId: SpaceId,
  ): Promise<Recipe | null> {
    const commands = await this.gateway.commands.list({ spaceId });
    return commands.recipes.find((command) => command.slug === slug) ?? null;
  }

  private async findSkillBySlug(
    slug: string,
    spaceId: SpaceId,
  ): Promise<Skill | null> {
    const skills = await this.gateway.skills.list({ spaceId });
    return skills.find((skill) => skill.slug === slug) ?? null;
  }
}
