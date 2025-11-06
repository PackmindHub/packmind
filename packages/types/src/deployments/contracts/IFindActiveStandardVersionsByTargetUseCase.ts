import { StandardVersion } from '../../standards/StandardVersion';
import { IUseCase, PackmindCommand } from '../../UseCase';
import { OrganizationId } from '../../accounts/Organization';
import { TargetId } from '../TargetId';

export type FindActiveStandardVersionsByTargetCommand = PackmindCommand & {
  organizationId: OrganizationId;
  targetId: TargetId;
};

export type FindActiveStandardVersionsByTargetResponse = StandardVersion[];

export type IFindActiveStandardVersionsByTargetUseCase = IUseCase<
  FindActiveStandardVersionsByTargetCommand,
  FindActiveStandardVersionsByTargetResponse
>;
