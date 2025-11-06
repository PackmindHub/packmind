import { IUseCase, PackmindCommand } from '@packmind/types';
import { StandardVersionId } from '../../standards';
import { TargetId } from '../Target';
import { StandardsDeployment } from '../StandardsDeployment';

export type PublishStandardsCommand = PackmindCommand & {
  targetIds: TargetId[];
  standardVersionIds: StandardVersionId[];
};
export type IPublishStandards = IUseCase<
  PublishStandardsCommand,
  StandardsDeployment[]
>;
