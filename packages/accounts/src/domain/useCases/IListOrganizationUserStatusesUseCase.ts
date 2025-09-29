import { IUseCase } from '@packmind/shared';
import { UserId, UserOrganizationRole } from '../entities/User';
import { OrganizationId } from '../entities/Organization';

export type InvitationStatus = 'pending' | 'expired' | 'accepted' | 'none';

export type UserStatus = {
  userId: UserId;
  email: string;
  role: UserOrganizationRole;
  isActive: boolean;
  invitationStatus: InvitationStatus;
  invitationExpirationDate?: Date;
};

export type ListOrganizationUserStatusesCommand = {
  userId: UserId;
  organizationId: OrganizationId;
};

export type ListOrganizationUserStatusesResponse = {
  userStatuses: UserStatus[];
};

export type IListOrganizationUserStatusesUseCase = IUseCase<
  ListOrganizationUserStatusesCommand,
  ListOrganizationUserStatusesResponse
>;
