import { Repository, In } from 'typeorm';
import { createCipheriv, createDecipheriv, createHash } from 'crypto';
import {
  Invitation,
  InvitationToken,
  InvitationId,
} from '../../domain/entities/Invitation';
import { UserId } from '@packmind/types';
import { IInvitationRepository } from '../../domain/repositories/IInvitationRepository';
import { InvitationSchema } from '../schemas/InvitationSchema';
import { PackmindLogger } from '@packmind/logger';
import {
  localDataSource,
  AbstractRepository,
  QueryOption,
  Configuration,
  WithTimestamps,
} from '@packmind/shared';

const origin = 'InvitationRepository';
const encryptionErrorMessage = 'Failed to encrypt invitation token';
const decryptionErrorMessage = 'Failed to decrypt invitation token';

export class InvitationRepository
  extends AbstractRepository<Invitation>
  implements IInvitationRepository
{
  private encryptionKey: Buffer | null = null;

  constructor(
    repository: Repository<
      WithTimestamps<Invitation>
    > = localDataSource.getRepository<WithTimestamps<Invitation>>(
      InvitationSchema,
    ),
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super('invitation', repository, logger, InvitationSchema);
    this.logger.info('InvitationRepository initialized');
  }

  override async add(invitation: Invitation): Promise<Invitation> {
    this.logger.info('Adding invitation', {
      id: invitation.id,
      userId: invitation.userId,
    });

    const encrypted = await this.encryptInvitation(invitation);
    const saved = await super.add(encrypted);
    return this.decryptInvitation(saved);
  }

  async addMany(invitations: Invitation[]): Promise<Invitation[]> {
    if (invitations.length === 0) {
      this.logger.warn('No invitations provided for bulk insert');
      return [];
    }

    this.logger.info('Adding invitations in bulk', {
      count: invitations.length,
    });

    try {
      const encrypted = await Promise.all(
        invitations.map((invitation) => this.encryptInvitation(invitation)),
      );
      const saved = await this.repository.save(encrypted);
      this.logger.info('Bulk invitation insert succeeded', {
        count: saved.length,
      });
      return Promise.all(
        saved.map((invitation) => this.decryptInvitation(invitation)),
      );
    } catch (error) {
      this.logger.error('Failed to add invitations in bulk', {
        count: invitations.length,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async findByToken(
    token: InvitationToken,
    opts?: QueryOption,
  ): Promise<Invitation | null> {
    const encryptedToken = await this.encryptToken(token);
    const maskedToken = this.maskToken(encryptedToken);

    this.logger.info('Finding invitation by token hash', {
      tokenHash: maskedToken,
    });

    try {
      const invitation = await this.repository.findOne({
        where: { token: encryptedToken },
        withDeleted: opts?.includeDeleted ?? false,
      });

      if (!invitation) {
        this.logger.warn('Invitation not found by token hash', {
          tokenHash: maskedToken,
        });
        return null;
      }

      this.logger.info('Invitation found by token hash', {
        tokenHash: maskedToken,
        invitationId: invitation.id,
      });

      return this.decryptInvitation(invitation);
    } catch (error) {
      this.logger.error('Failed to find invitation by token hash', {
        tokenHash: maskedToken,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  override async findById(id: InvitationId): Promise<Invitation | null> {
    const invitation = await this.repository.findOne({ where: { id } });
    return invitation ? this.decryptInvitation(invitation) : null;
  }

  async findByUserId(userId: UserId): Promise<Invitation[]> {
    const invitations = await this.repository.find({
      where: { userId },
      order: { expirationDate: 'DESC' },
    });
    return Promise.all(
      invitations.map((invitation) => this.decryptInvitation(invitation)),
    );
  }

  async findLatestByUserId(userId: UserId): Promise<Invitation | null> {
    const invitation = await this.repository.findOne({
      where: { userId },
      order: { expirationDate: 'DESC' },
    });
    return invitation ? this.decryptInvitation(invitation) : null;
  }

  async findByUserIds(userIds: UserId[]): Promise<Invitation[]> {
    if (userIds.length === 0) {
      return [];
    }

    const invitations = await this.repository
      .createQueryBuilder('invitation')
      .where('invitation.user_id IN (:...userIds)', { userIds })
      .orderBy('invitation.user_id', 'ASC')
      .addOrderBy('invitation.expiration_date', 'DESC')
      .getMany();

    return Promise.all(
      invitations.map((invitation) => this.decryptInvitation(invitation)),
    );
  }

  async listByUserIds(
    userIds: UserId[],
    opts?: QueryOption,
  ): Promise<Invitation[]> {
    if (userIds.length === 0) {
      this.logger.warn('No user IDs provided for invitation lookup');
      return [];
    }

    this.logger.info('Listing invitations by user IDs', {
      count: userIds.length,
    });

    try {
      const invitations = await this.repository.find({
        where: { userId: In(userIds) },
        withDeleted: opts?.includeDeleted ?? false,
        order: {
          expirationDate: 'DESC',
        },
      });

      this.logger.info('Invitations listed by user IDs', {
        count: invitations.length,
      });

      return Promise.all(
        invitations.map((invitation) => this.decryptInvitation(invitation)),
      );
    } catch (error) {
      this.logger.error('Failed to list invitations by user IDs', {
        count: userIds.length,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async save(invitation: Invitation): Promise<Invitation> {
    const encrypted = await this.encryptInvitation(invitation);
    const saved = await this.repository.save(encrypted);
    return this.decryptInvitation(saved);
  }

  async delete(id: InvitationId): Promise<void> {
    await this.repository.delete({ id });
  }

  protected override loggableEntity(entity: Invitation): Partial<Invitation> {
    return {
      id: entity.id,
      userId: entity.userId,
      expirationDate: entity.expirationDate,
    };
  }

  private toDomainEntity(invitation: WithTimestamps<Invitation>): Invitation {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { createdAt, updatedAt, ...domainInvitation } = invitation;
    return domainInvitation;
  }

  private async encryptInvitation(invitation: Invitation): Promise<Invitation> {
    return {
      ...invitation,
      token: await this.encryptToken(invitation.token),
    };
  }

  private async decryptInvitation(invitation: Invitation): Promise<Invitation> {
    return {
      ...invitation,
      token: await this.decryptToken(invitation.token),
    };
  }

  private async encryptToken(token: InvitationToken): Promise<InvitationToken> {
    const tokenString = token as string;
    const key = await this.getEncryptionKey();
    const iv = this.deriveInitializationVector(tokenString);

    try {
      const cipher = createCipheriv('aes-256-gcm', key, iv);
      let encrypted = cipher.update(tokenString, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      const authTag = cipher.getAuthTag().toString('base64');
      return `${iv.toString('base64')}:${encrypted}:${authTag}` as InvitationToken;
    } catch (error) {
      this.logger.error(encryptionErrorMessage, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(encryptionErrorMessage);
    }
  }

  private async decryptToken(token: InvitationToken): Promise<InvitationToken> {
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

      return decrypted as InvitationToken;
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

  private maskToken(token: InvitationToken): string {
    const tokenString = token as string;
    if (tokenString.length <= 8) {
      return '****';
    }

    return `${tokenString.slice(0, 6)}****${tokenString.slice(-2)}`;
  }
}
