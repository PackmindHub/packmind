import { CommandService } from './CommandService';
import { CommandVersionService } from './CommandVersionService';
import { CommandSummaryService } from './CommandSummaryService';
import { ICommandsRepositories } from '../../domain/repositories/ICommandsRepositories';
import type { ILlmPort } from '@packmind/types';

export class CommandsServices {
  private readonly commandService: CommandService;
  private readonly commandVersionService: CommandVersionService;
  private commandSummaryService: CommandSummaryService;

  constructor(
    private readonly commandsRepositories: ICommandsRepositories,
    private llmPort?: ILlmPort,
  ) {
    this.commandService = new CommandService(
      this.commandsRepositories.getCommandRepository(),
      this.commandsRepositories.getCommandVersionRepository(),
    );
    this.commandVersionService = new CommandVersionService(
      this.commandsRepositories.getCommandVersionRepository(),
    );
    // RecipeSummaryService created with llmPort (may be undefined initially)
    this.commandSummaryService = new CommandSummaryService(this.llmPort);
  }

  getCommandService(): CommandService {
    return this.commandService;
  }

  getCommandVersionService(): CommandVersionService {
    return this.commandVersionService;
  }

  getCommandSummaryService(): CommandSummaryService {
    return this.commandSummaryService;
  }

  setLlmPort(port: ILlmPort): void {
    this.llmPort = port;
    // Recreate RecipeSummaryService with the llmPort
    this.commandSummaryService = new CommandSummaryService(this.llmPort);
  }
}
