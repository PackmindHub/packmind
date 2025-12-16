import { Branded, brandedIdFactory, UserId } from '@packmind/types';

export type TrialActivationTokenId = Branded<'InvitationId'>;
export const createTrialActivationTokenId =
  brandedIdFactory<TrialActivationTokenId>();

export type TrialActivationToken = Branded<'InvitationToken'>;
export const createTrialActivationToken =
  brandedIdFactory<TrialActivationToken>();

export type TrialActivation = {
  id: TrialActivationTokenId;
  userId: UserId;
  token: TrialActivationToken;
  expirationDate: Date;
};
