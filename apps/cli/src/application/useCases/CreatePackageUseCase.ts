import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';
import {
  ICreatePackageCommand,
  ICreatePackageResult,
  ICreatePackageUseCase,
} from '../../domain/useCases/ICreatePackageUseCase';
import { ISpaceService } from '../../domain/services/ISpaceService';

export class CreatePackageUseCase implements ICreatePackageUseCase {
  constructor(
    private readonly gateway: IPackmindGateway,
    private readonly spaceService: ISpaceService,
  ) {}

  async execute(command: ICreatePackageCommand): Promise<ICreatePackageResult> {
    const space = await this.spaceService.getDefaultSpace();
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
    };
  }
}
