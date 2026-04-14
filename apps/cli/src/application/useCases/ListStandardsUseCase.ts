import {
  ListStandardsCommand,
  ListStandardsResult,
  IListStandardsUseCase,
} from '../../domain/useCases/IListStandardsUseCase';
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';
import { ISpaceService } from '../../domain/services/ISpaceService';

export class ListStandardsUseCase implements IListStandardsUseCase {
  constructor(
    private readonly packmindGateway: IPackmindGateway,
    private readonly spaceService: ISpaceService,
  ) {}

  public async execute(
    command: ListStandardsCommand,
  ): Promise<ListStandardsResult> {
    if (command.spaceId) {
      const response = await this.packmindGateway.standards.list({
        spaceId: command.spaceId,
      });
      return response.standards;
    }

    const spaces = await this.spaceService.getSpaces();
    const results = await Promise.all(
      spaces.map((space) =>
        this.packmindGateway.standards
          .list({ spaceId: space.id })
          .then((r) => r.standards),
      ),
    );
    return results.flat();
  }
}
