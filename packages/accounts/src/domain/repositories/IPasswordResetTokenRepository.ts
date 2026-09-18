import { IRepository } from '@packmind/types';
import { QueryOption } from '@packmind/types';
import {
  PasswordResetTokenEntity,
  PasswordResetToken,
  PasswordResetTokenId,
} from '../entities/PasswordResetToken';
import { UserId } from '@packmind/types';

export interface IPasswordResetTokenRepository extends IRepository<PasswordResetTokenEntity> {
  /**
   * Tokens are stored encrypted, so the caller passes the plaintext token and
   * the implementation encrypts it to build the lookup. This only works because
   * that encryption is deterministic.
   */
  findByToken(
    token: PasswordResetToken,
    opts?: QueryOption,
  ): Promise<PasswordResetTokenEntity | null>;

  findById(id: PasswordResetTokenId): Promise<PasswordResetTokenEntity | null>;

  findLatestByUserId(userId: UserId): Promise<PasswordResetTokenEntity | null>;

  save(token: PasswordResetTokenEntity): Promise<PasswordResetTokenEntity>;

  delete(id: PasswordResetTokenId): Promise<void>;

  deleteByUserId(userId: UserId): Promise<void>;
}
