import { IUseCase, PackmindCommand } from '../../UseCase';
import { CommandVersionId } from '../../commands/CommandVersion';
import { TargetId } from '../TargetId';
import { Distribution } from '../Distribution';

export type PublishCommandsCommand = PackmindCommand & {
  recipeVersionIds: CommandVersionId[];
  targetIds: TargetId[];
};

export type IPublishCommands = IUseCase<PublishCommandsCommand, Distribution[]>;
