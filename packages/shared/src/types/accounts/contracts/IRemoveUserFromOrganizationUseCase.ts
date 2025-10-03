import { IUseCase, PackmindCommand } from '../../UseCase';
import { UserId } from '../index';

export type RemoveUserFromOrganizationCommand = PackmindCommand & {
  targetUserId: UserId;
};

export type RemoveUserFromOrganizationResponse = {
  removed: boolean;
};

export type IRemoveUserFromOrganizationUseCase = IUseCase<
  RemoveUserFromOrganizationCommand,
  RemoveUserFromOrganizationResponse
>;
