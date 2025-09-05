import { IUseCase, PackmindCommand } from '../../UseCase';
import { StandardVersionId } from '../../standards';
import { GitRepoId } from '../../git';
import { StandardsDeployment } from '../StandardsDeployment';

export type PublishStandardsCommand = PackmindCommand & {
  gitRepoIds: GitRepoId[];
  standardVersionIds: StandardVersionId[];
};
export type IPublishStandards = IUseCase<
  PublishStandardsCommand,
  StandardsDeployment
>;
