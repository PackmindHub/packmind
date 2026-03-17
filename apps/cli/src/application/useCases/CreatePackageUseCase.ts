import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';
import {
  ICreatePackageCommand,
  ICreatePackageResult,
  ICreatePackageUseCase,
} from '../../domain/useCases/ICreatePackageUseCase';
import { ISpaceService } from '../../domain/services/ISpaceService';
import { Space } from '@packmind/types';

export class CreatePackageUseCase implements ICreatePackageUseCase {
  constructor(
    private readonly gateway: IPackmindGateway,
    private readonly spaceService: ISpaceService,
  ) {}

  async execute(command: ICreatePackageCommand): Promise<ICreatePackageResult> {
    const space = await this.getSpace(command);

    const result = await this.gateway.packages.create({
      spaceId: space.id,
      name: command.name,
      description: command.description ?? '',
      recipeIds: [],
      standardIds: [],
      originSkill: command.originSkill,
    });

    return {
      packageId: result.package.id,
      name: result.package.name,
      slug: result.package.slug,
      spaceSlug: space.slug,
    };
  }

  private async getSpace(command: ICreatePackageCommand): Promise<Space> {
    const spaces = await this.spaceService.getSpaces();

    if (command.spaceSlug) {
      const found = spaces.find((s) => s.slug === command.spaceSlug);
      if (!found) {
        throw new Error(`Space '${command.spaceSlug}' not found.`);
      }
      return found;
    }

    if (spaces.length > 1) {
      const spaceList = spaces
        .map((s) => `  - ${s.name} (--space ${s.slug})`)
        .join('\n');
      throw new Error(
        `Your organization has multiple spaces. Please specify one using the --space option.\n\nAvailable spaces:\n${spaceList}`,
      );
    }
    return spaces[0];
  }
}
