import { IUseCase, PackmindCommand, PackmindResult } from '../../UseCase';
import { UserId, UserOrganizationRole } from '../User';
import { OrganizationId } from '../Organization';

export type InvitationStatus = 'pending' | 'expired' | 'accepted' | 'none';

export type UserStatus = {
  userId: UserId;
  email: string;
  role: UserOrganizationRole;
  isActive: boolean;
  invitationStatus: InvitationStatus;
  invitationExpirationDate?: Date;
  invitationLink?: string;
};

export type ListOrganizationUserStatusesCommand = PackmindCommand & {
  organizationId: OrganizationId;
};

export type ListOrganizationUserStatusesResponse = PackmindResult & {
  userStatuses: UserStatus[];
};

export type IListOrganizationUserStatusesUseCase = IUseCase<
  ListOrganizationUserStatusesCommand,
  ListOrganizationUserStatusesResponse
>;
