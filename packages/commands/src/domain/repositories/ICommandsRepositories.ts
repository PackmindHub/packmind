import { ICommandRepository } from './ICommandRepository';
import { ICommandVersionRepository } from './ICommandVersionRepository';

export interface ICommandsRepositories {
  getCommandRepository(): ICommandRepository;
  getCommandVersionRepository(): ICommandVersionRepository;
}
