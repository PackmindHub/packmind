import { CommandService } from './CommandService';
import { CommandVersionService } from './CommandVersionService';
import { instrumentComponents } from '@packmind/node-utils';
import { ICommandsRepositories } from '../../domain/repositories/ICommandsRepositories';

export class CommandsServices {
  private readonly commandService: CommandService;
  private readonly commandVersionService: CommandVersionService;

  constructor(private readonly commandsRepositories: ICommandsRepositories) {
    this.commandService = new CommandService(
      this.commandsRepositories.getCommandRepository(),
      this.commandsRepositories.getCommandVersionRepository(),
    );
    this.commandVersionService = new CommandVersionService(
      this.commandsRepositories.getCommandVersionRepository(),
    );

    // Services are where the domain logic that is not a query lives, and they
    // have no shared base class to hook - so the aggregator is the seam.
    instrumentComponents([this.commandService, this.commandVersionService]);
  }

  getCommandService(): CommandService {
    return this.commandService;
  }

  getCommandVersionService(): CommandVersionService {
    return this.commandVersionService;
  }
}
