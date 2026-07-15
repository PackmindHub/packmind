import { CommandService } from './CommandService';
import { CommandVersionService } from './CommandVersionService';
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
  }

  getCommandService(): CommandService {
    return this.commandService;
  }

  getCommandVersionService(): CommandVersionService {
    return this.commandVersionService;
  }
}
