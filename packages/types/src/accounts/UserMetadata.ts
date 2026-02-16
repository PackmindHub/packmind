import { Branded, brandedIdFactory } from '../brandedTypes';
import { SocialProvider } from './SocialProvider';
import { UserId } from './User';

export type UserMetadataId = Branded<'UserMetadataId'>;
export const createUserMetadataId = brandedIdFactory<UserMetadataId>();

export type UserMetadata = {
  id: UserMetadataId;
  userId: UserId;
  onboardingCompleted: boolean;
  socialProviders: SocialProvider[];
};
