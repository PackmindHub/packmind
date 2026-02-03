import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';
import {
  ICreatePackageCommand,
  ICreatePackageResult,
  ICreatePackageUseCase,
} from '../../domain/useCases/ICreatePackageUseCase';

export class CreatePackageUseCase implements ICreatePackageUseCase {
  constructor(private readonly gateway: IPackmindGateway) {}

  async execute(command: ICreatePackageCommand): Promise<ICreatePackageResult> {
    const space = await this.gateway.spaces.getGlobal();
    const result = await this.gateway.packages.create(space.id, {
      name: command.name,
      description: command.description,
    });

    return {
      packageId: result.id,
      name: result.name,
      slug: result.slug,
    };
  }
}
