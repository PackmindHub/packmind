import { Branded, brandedIdFactory } from '../brandedTypes';
import { UserId } from './User';

export type UserMetadataId = Branded<'UserMetadataId'>;
export const createUserMetadataId = brandedIdFactory<UserMetadataId>();

export type UserMetadata = {
  id: UserMetadataId;
  userId: UserId;
  onboardingCompleted: boolean;
};
