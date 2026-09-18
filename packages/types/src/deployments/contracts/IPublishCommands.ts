import { IUseCase, PackmindCommand } from '../../UseCase';
import { CommandVersionId } from '../../commands/CommandVersion';
import { TargetId } from '../TargetId';
import { Distribution } from '../Distribution';

export type PublishCommandsCommand = PackmindCommand & {
  commandVersionIds: CommandVersionId[];
  targetIds: TargetId[];
};

export type IPublishCommands = IUseCase<PublishCommandsCommand, Distribution[]>;
