import { Branded, brandedIdFactory } from '@packmind/types';
import { UserId } from '@packmind/types';

export type InvitationId = Branded<'InvitationId'>;
export const createInvitationId = brandedIdFactory<InvitationId>();

export type InvitationToken = Branded<'InvitationToken'>;
export const createInvitationToken = brandedIdFactory<InvitationToken>();

export type Invitation = {
  id: InvitationId;
  userId: UserId;
  token: InvitationToken;
  expirationDate: Date;
};
