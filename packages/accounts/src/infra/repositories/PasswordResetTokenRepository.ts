import { Repository } from 'typeorm';
import { createCipheriv, createDecipheriv, createHash } from 'crypto';
import {
  PasswordResetTokenEntity,
  PasswordResetToken,
  PasswordResetTokenId,
} from '../../domain/entities/PasswordResetToken';
import { UserId } from '@packmind/types';
import { IPasswordResetTokenRepository } from '../../domain/repositories/IPasswordResetTokenRepository';
import { PasswordResetTokenSchema } from '../schemas/PasswordResetTokenSchema';
import { PackmindLogger } from '@packmind/logger';
import {
  localDataSource,
  AbstractRepository,
  QueryOption,
  Configuration,
  WithTimestamps,
} from '@packmind/shared';

const origin = 'PasswordResetTokenRepository';
const encryptionErrorMessage = 'Failed to encrypt password reset token';
const decryptionErrorMessage = 'Failed to decrypt password reset token';

export class PasswordResetTokenRepository
  extends AbstractRepository<PasswordResetTokenEntity>
  implements IPasswordResetTokenRepository
{
  private encryptionKey: Buffer | null = null;

  constructor(
    repository: Repository<
      WithTimestamps<PasswordResetTokenEntity>
    > = localDataSource.getRepository<WithTimestamps<PasswordResetTokenEntity>>(
      PasswordResetTokenSchema,
    ),
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super('passwordResetToken', repository, logger, PasswordResetTokenSchema);
    this.logger.info('PasswordResetTokenRepository initialized');
  }

  override async add(
    token: PasswordResetTokenEntity,
  ): Promise<PasswordResetTokenEntity> {
    this.logger.info('Adding password reset token', {
      id: token.id,
      userId: token.userId,
    });

    const encrypted = await this.encryptPasswordResetToken(token);
    const saved = await super.add(encrypted);
    return this.decryptPasswordResetToken(saved);
  }

  async findByToken(
    token: PasswordResetToken,
    opts?: QueryOption,
  ): Promise<PasswordResetTokenEntity | null> {
    const encryptedToken = await this.encryptToken(token);
    const maskedToken = this.maskToken(encryptedToken);

    this.logger.info('Finding password reset token by token hash', {
      tokenHash: maskedToken,
    });

    try {
      const passwordResetToken = await this.repository.findOne({
        where: { token: encryptedToken },
        withDeleted: opts?.includeDeleted ?? false,
      });

      if (!passwordResetToken) {
        this.logger.info('Password reset token not found', {
          tokenHash: maskedToken,
        });
        return null;
      }

      this.logger.info('Password reset token found', {
        id: passwordResetToken.id,
        tokenHash: maskedToken,
      });

      return this.decryptPasswordResetToken(passwordResetToken);
    } catch (error) {
      this.logger.error('Failed to find password reset token by token', {
        tokenHash: maskedToken,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  override async findById(
    id: PasswordResetTokenId,
  ): Promise<PasswordResetTokenEntity | null> {
    this.logger.info('Finding password reset token by ID', { id });

    try {
      const passwordResetToken = await this.repository.findOne({
        where: { id },
      });

      if (!passwordResetToken) {
        this.logger.info('Password reset token not found', { id });
        return null;
      }

      return this.decryptPasswordResetToken(passwordResetToken);
    } catch (error) {
      this.logger.error('Failed to find password reset token by ID', {
        id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async findLatestByUserId(
    userId: UserId,
  ): Promise<PasswordResetTokenEntity | null> {
    this.logger.info('Finding latest password reset token by user ID', {
      userId,
    });

    try {
      const passwordResetToken = await this.repository.findOne({
        where: { userId },
        order: { expirationDate: 'DESC' },
      });

      if (!passwordResetToken) {
        this.logger.info('No password reset token found for user', { userId });
        return null;
      }

      return this.decryptPasswordResetToken(passwordResetToken);
    } catch (error) {
      this.logger.error(
        'Failed to find latest password reset token by user ID',
        {
          userId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  async save(
    token: PasswordResetTokenEntity,
  ): Promise<PasswordResetTokenEntity> {
    const encrypted = await this.encryptPasswordResetToken(token);
    const saved = await this.repository.save(encrypted);
    return this.decryptPasswordResetToken(saved);
  }

  async delete(id: PasswordResetTokenId): Promise<void> {
    await this.repository.delete({ id });
  }

  async deleteByUserId(userId: UserId): Promise<void> {
    this.logger.info('Deleting all password reset tokens for user', { userId });

    try {
      await this.repository.delete({ userId });
      this.logger.info('Successfully deleted password reset tokens for user', {
        userId,
      });
    } catch (error) {
      this.logger.error('Failed to delete password reset tokens for user', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  protected override loggableEntity(
    entity: PasswordResetTokenEntity,
  ): Partial<PasswordResetTokenEntity> {
    return {
      id: entity.id,
      userId: entity.userId,
      expirationDate: entity.expirationDate,
    };
  }

  private toDomainEntity(
    token: WithTimestamps<PasswordResetTokenEntity>,
  ): PasswordResetTokenEntity {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { createdAt, updatedAt, ...domainToken } = token;
    return domainToken;
  }

  private async encryptPasswordResetToken(
    token: PasswordResetTokenEntity,
  ): Promise<PasswordResetTokenEntity> {
    return {
      ...token,
      token: await this.encryptToken(token.token),
    };
  }

  private async decryptPasswordResetToken(
    token: PasswordResetTokenEntity,
  ): Promise<PasswordResetTokenEntity> {
    return {
      ...token,
      token: await this.decryptToken(token.token),
    };
  }

  private async encryptToken(
    token: PasswordResetToken,
  ): Promise<PasswordResetToken> {
    const tokenString = token as string;
    const key = await this.getEncryptionKey();
    const iv = this.deriveInitializationVector(tokenString);

    try {
      const cipher = createCipheriv('aes-256-gcm', key, iv);
      let encrypted = cipher.update(tokenString, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      const authTag = cipher.getAuthTag().toString('base64');
      return `${iv.toString('base64')}:${encrypted}:${authTag}` as PasswordResetToken;
    } catch (error) {
      this.logger.error(encryptionErrorMessage, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(encryptionErrorMessage);
    }
  }

  private async decryptToken(
    token: PasswordResetToken,
  ): Promise<PasswordResetToken> {
    const tokenString = token as string;

    if (!tokenString.includes(':')) {
      return token;
    }

    const [ivBase64, encrypted, authTagBase64] = tokenString.split(':');

    try {
      const key = await this.getEncryptionKey();
      const decipher = createDecipheriv(
        'aes-256-gcm',
        key,
        Buffer.from(ivBase64, 'base64'),
      );
      decipher.setAuthTag(Buffer.from(authTagBase64, 'base64'));

      let decrypted = decipher.update(encrypted, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted as PasswordResetToken;
    } catch (error) {
      this.logger.error(decryptionErrorMessage, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(decryptionErrorMessage);
    }
  }

  private async getEncryptionKey(): Promise<Buffer> {
    if (this.encryptionKey) {
      return this.encryptionKey;
    }

    const key = await Configuration.getConfig('ENCRYPTION_KEY');
    if (!key) {
      throw new Error('ENCRYPTION_KEY not found in configuration');
    }

    this.encryptionKey = createHash('sha256').update(key).digest();
    return this.encryptionKey;
  }

  private deriveInitializationVector(token: string): Buffer {
    const hash = createHash('sha256').update(token).digest();
    return hash.subarray(0, 12);
  }

  private maskToken(token: PasswordResetToken): string {
    const tokenString = token as string;
    if (tokenString.length <= 8) {
      return '****';
    }

    return `${tokenString.slice(0, 6)}****${tokenString.slice(-2)}`;
  }
}
