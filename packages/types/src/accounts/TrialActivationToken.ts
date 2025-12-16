import { Branded, brandedIdFactory } from '../brandedTypes';
import { UserId } from './User';

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
