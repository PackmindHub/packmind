import { IUseCase, PackmindCommand } from '../../UseCase';
import { StandardVersionId } from '../../standards/StandardVersionId';
import { TargetId } from '../TargetId';
import { StandardsDeployment } from '../StandardsDeployment';

export type PublishStandardsCommand = PackmindCommand & {
  targetIds: TargetId[];
  standardVersionIds: StandardVersionId[];
};
export type IPublishStandards = IUseCase<
  PublishStandardsCommand,
  StandardsDeployment[]
>;
