import { IRepository, QueryOption } from '@packmind/shared';
import {
  PasswordResetTokenEntity,
  PasswordResetToken,
  PasswordResetTokenId,
} from '../entities/PasswordResetToken';
import { UserId } from '@packmind/types';

/**
 * Password reset token repository contract exposing persistence operations required by
 * password reset use cases.
 */
export interface IPasswordResetTokenRepository
  extends IRepository<PasswordResetTokenEntity> {
  /**
   * Find a password reset token by its deterministically encrypted token value.
   */
  findByToken(
    token: PasswordResetToken,
    opts?: QueryOption,
  ): Promise<PasswordResetTokenEntity | null>;

  /**
   * Find a password reset token by its ID.
   */
  findById(id: PasswordResetTokenId): Promise<PasswordResetTokenEntity | null>;

  /**
   * Retrieve the latest password reset token created for a given user identifier.
   */
  findLatestByUserId(userId: UserId): Promise<PasswordResetTokenEntity | null>;

  /**
   * Save a password reset token.
   */
  save(token: PasswordResetTokenEntity): Promise<PasswordResetTokenEntity>;

  /**
   * Delete a password reset token by ID.
   */
  delete(id: PasswordResetTokenId): Promise<void>;

  /**
   * Delete all password reset tokens for a specific user.
   */
  deleteByUserId(userId: UserId): Promise<void>;
}
