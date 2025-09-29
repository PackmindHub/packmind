import { IUseCase, PackmindCommand } from '@packmind/shared';
import { Invitation } from '../entities/Invitation';
import { UserId, UserOrganizationRole } from '../entities/User';

export type InvitationSkipReason =
  | 'duplicate-email'
  | 'invalid-email'
  | 'already-member';

export type InvitationCreationResult = {
  email: string;
  userId: UserId;
  invitation: Invitation;
};

export type DirectMembershipResult = {
  email: string;
  userId: UserId;
  organizationId: string;
  role: UserOrganizationRole;
};

export type InvitationSkipResult = {
  email: string;
  reason: InvitationSkipReason;
};

export type CreateInvitationsResponse = {
  created: InvitationCreationResult[];
  organizationInvitations: DirectMembershipResult[];
  skipped: InvitationSkipResult[];
};

export type CreateInvitationsCommand = PackmindCommand & {
  emails: string[];
  role: UserOrganizationRole;
};

export type ICreateInvitationsUseCase = IUseCase<
  CreateInvitationsCommand,
  CreateInvitationsResponse
>;
