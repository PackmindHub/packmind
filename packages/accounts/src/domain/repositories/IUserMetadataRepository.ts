import { UserMetadata, UserId } from '@packmind/types';

export interface IUserMetadataRepository {
  findByUserId(userId: UserId): Promise<UserMetadata | null>;

  add(userMetadata: UserMetadata): Promise<UserMetadata>;

  save(userMetadata: UserMetadata): Promise<UserMetadata>;
}
