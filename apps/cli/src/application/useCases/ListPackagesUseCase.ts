import {
  IListPackagesCommand,
  IListPackagesResult,
  IListPackagesUseCase,
} from '../../domain/useCases/IListPackagesUseCase';
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';
import { ISpaceService } from '../../domain/services/ISpaceService';

export class ListPackagesUseCase implements IListPackagesUseCase {
  constructor(
    private readonly packmindGateway: IPackmindGateway,
    private readonly spaceService: ISpaceService,
  ) {}

  public async execute(
    command: IListPackagesCommand,
  ): Promise<IListPackagesResult> {
    if (command.spaceId) {
      const response = await this.packmindGateway.packages.list({
        spaceId: command.spaceId,
      });
      return response.packages;
    }

    const spaces = await this.spaceService.getSpaces();
    const results = await Promise.all(
      spaces.map((space) =>
        this.packmindGateway.packages
          .list({ spaceId: space.id })
          .then((r) => r.packages),
      ),
    );
    return results.flat();
  }
}
