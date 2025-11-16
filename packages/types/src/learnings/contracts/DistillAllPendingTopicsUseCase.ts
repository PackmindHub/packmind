import { IUseCase, PackmindCommand } from '../../UseCase';
import { SpaceId } from '../../spaces/SpaceId';
import { OrganizationId } from '../../accounts/Organization';

export type DistillAllPendingTopicsCommand = PackmindCommand & {
  spaceId: SpaceId;
  organizationId: OrganizationId;
  userId: string;
};

export type DistillAllPendingTopicsResponse = {
  jobId: string;
};

export type IDistillAllPendingTopicsUseCase = IUseCase<
  DistillAllPendingTopicsCommand,
  DistillAllPendingTopicsResponse
>;
