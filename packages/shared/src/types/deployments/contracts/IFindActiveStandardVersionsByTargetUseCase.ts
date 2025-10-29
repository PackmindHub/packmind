import { StandardVersion } from '../../standards';
import { IUseCase, PackmindCommand } from '../../UseCase';
import { OrganizationId } from '../../accounts';
import { TargetId } from '../Target';

export type FindActiveStandardVersionsByTargetCommand = PackmindCommand & {
  organizationId: OrganizationId;
  targetId: TargetId;
};

export type FindActiveStandardVersionsByTargetResponse = StandardVersion[];

export type IFindActiveStandardVersionsByTargetUseCase = IUseCase<
  FindActiveStandardVersionsByTargetCommand,
  FindActiveStandardVersionsByTargetResponse
>;
