import { UserMetadata, UserId } from '@packmind/types';

/**
 * User metadata repository contract exposing persistence operations required by
 * user metadata and onboarding use cases.
 */
export interface IUserMetadataRepository {
  /**
   * Find user metadata by user ID.
   */
  findByUserId(userId: UserId): Promise<UserMetadata | null>;

  /**
   * Add new user metadata.
   */
  add(userMetadata: UserMetadata): Promise<UserMetadata>;

  /**
   * Save user metadata.
   */
  save(userMetadata: UserMetadata): Promise<UserMetadata>;
}
