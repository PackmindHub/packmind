import { IUseCase, PackmindCommand } from '../../UseCase';
import { StandardVersionId } from '../../standards/StandardVersionId';
import { TargetId } from '../TargetId';
import { Distribution } from '../Distribution';

export type PublishStandardsCommand = PackmindCommand & {
  targetIds: TargetId[];
  standardVersionIds: StandardVersionId[];
};
export type IPublishStandards = IUseCase<
  PublishStandardsCommand,
  Distribution[]
>;
