import { instrumentComponents } from '@packmind/node-utils';
import { DataSource } from 'typeorm';
import { ICommandsRepositories } from '../../domain/repositories/ICommandsRepositories';
import { ICommandRepository } from '../../domain/repositories/ICommandRepository';
import { ICommandVersionRepository } from '../../domain/repositories/ICommandVersionRepository';
import { CommandRepository } from './CommandRepository';
import { CommandVersionRepository } from './CommandVersionRepository';
import { CommandSchema } from '../schemas/CommandSchema';
import { CommandVersionSchema } from '../schemas/CommandVersionSchema';

export class CommandsRepositories implements ICommandsRepositories {
  private readonly commandRepository: ICommandRepository;
  private readonly commandVersionRepository: ICommandVersionRepository;

  constructor(private readonly dataSource: DataSource) {
    this.commandRepository = new CommandRepository(
      this.dataSource.getRepository(CommandSchema),
    );
    this.commandVersionRepository = new CommandVersionRepository(
      this.dataSource.getRepository(CommandVersionSchema),
    );

    instrumentComponents([
      this.commandRepository,
      this.commandVersionRepository,
    ]);
  }

  getCommandRepository(): ICommandRepository {
    return this.commandRepository;
  }

  getCommandVersionRepository(): ICommandVersionRepository {
    return this.commandVersionRepository;
  }
}
