import {
  IAddToPackageCommand,
  IAddToPackageResult,
  IAddToPackageUseCase,
  ItemType,
} from '../../domain/useCases/IAddToPackageUseCase';
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';
import { AddArtefactsToPackageCommand } from '../../domain/repositories/IPackagesGateway';
import { Recipe, Skill, SpaceId, Standard } from '@packmind/types';

export class AddToPackageUseCase implements IAddToPackageUseCase {
  constructor(private readonly gateway: IPackmindGateway) {}

  async execute(command: IAddToPackageCommand): Promise<IAddToPackageResult> {
    const { packageSlug, itemType, itemSlugs } = command;

    // Get global space ID
    const space = await this.gateway.spaces.getGlobal();

    // Resolve slugs to IDs based on item type
    const ids = await this.resolveSlugsToIds(itemType, itemSlugs);

    // Build command based on item type
    const addCommand: AddArtefactsToPackageCommand = {
      packageSlug,
      spaceId: space.id,
    };

    if (itemType === 'standard') {
      addCommand.standardIds = ids;
    } else if (itemType === 'command') {
      addCommand.commandIds = ids;
    } else if (itemType === 'skill') {
      addCommand.skillIds = ids;
    }

    const result = await this.gateway.packages.addArtefacts(addCommand);

    // Extract the relevant added/skipped arrays based on item type
    const typeKey = itemType === 'command' ? 'commands' : `${itemType}s`;
    return {
      added: result.added[typeKey as keyof typeof result.added],
      skipped: result.skipped[typeKey as keyof typeof result.skipped],
    };
  }

  private async resolveSlugsToIds(
    itemType: ItemType,
    slugs: string[],
  ): Promise<string[]> {
    const ids: string[] = [];
    const globalSpace = await this.gateway.spaces.getGlobal();

    for (const slug of slugs) {
      let item: { id: string } | null = null;

      if (itemType === 'standard') {
        item = await this.findStandardBySlug(slug, globalSpace.id);
      } else if (itemType === 'command') {
        item = await this.findCommandBySlug(slug, globalSpace.id);
      } else if (itemType === 'skill') {
        item = await this.findSkillBySlug(slug, globalSpace.id);
      }

      if (!item) {
        throw new Error(`${itemType} '${slug}' not found`);
      }

      ids.push(item.id);
    }

    return ids;
  }

  private async findStandardBySlug(
    slug: string,
    spaceId: SpaceId,
  ): Promise<Standard | null> {
    const standards = await this.gateway.standards.list({ spaceId });
    return standards.standards.find((skill) => skill.slug === slug) ?? null;
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
