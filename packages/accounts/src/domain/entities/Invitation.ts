import { Branded, brandedIdFactory } from '@packmind/shared';
import { UserId } from './User';

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
