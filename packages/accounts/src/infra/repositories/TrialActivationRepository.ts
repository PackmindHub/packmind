import { Repository } from 'typeorm';
import { createCipheriv, createDecipheriv, createHash } from 'crypto';
import {
  TrialActivation,
  TrialActivationToken,
  TrialActivationTokenId,
  UserId,
} from '@packmind/types';
import { ITrialActivationRepository } from '../../domain/repositories/ITrialActivationRepository';
import { TrialActivationSchema } from '../schemas/TrialActivationSchema';
import { PackmindLogger } from '@packmind/logger';
import {
  localDataSource,
  AbstractRepository,
  Configuration,
  WithTimestamps,
} from '@packmind/node-utils';

const origin = 'TrialActivationRepository';
const encryptionErrorMessage = 'Failed to encrypt trial activation token';
const decryptionErrorMessage = 'Failed to decrypt trial activation token';

export class TrialActivationRepository
  extends AbstractRepository<TrialActivation>
  implements ITrialActivationRepository
{
  private encryptionKey: Buffer | null = null;

  constructor(
    repository: Repository<
      WithTimestamps<TrialActivation>
    > = localDataSource.getRepository<WithTimestamps<TrialActivation>>(
      TrialActivationSchema,
    ),
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super('trial_activation', repository, TrialActivationSchema, logger);
    this.logger.info('TrialActivationRepository initialized');
  }

  override async add(
    trialActivation: TrialActivation,
  ): Promise<TrialActivation> {
    this.logger.info('Adding trial activation', {
      id: trialActivation.id,
      userId: trialActivation.userId,
    });

    const encrypted = await this.encryptTrialActivation(trialActivation);
    const saved = await super.add(encrypted);
    return this.decryptTrialActivation(saved);
  }

  async findByToken(
    token: TrialActivationToken,
  ): Promise<TrialActivation | null> {
    const encryptedToken = await this.encryptToken(token);
    const maskedToken = this.maskToken(encryptedToken);

    this.logger.info('Finding trial activation by token hash', {
      tokenHash: maskedToken,
    });

    try {
      const trialActivation = await this.repository.findOne({
        where: { token: encryptedToken },
      });

      if (!trialActivation) {
        this.logger.warn('Trial activation not found by token hash', {
          tokenHash: maskedToken,
        });
        return null;
      }

      this.logger.info('Trial activation found by token hash', {
        tokenHash: maskedToken,
        trialActivationId: trialActivation.id,
      });

      return this.decryptTrialActivation(trialActivation);
    } catch (error) {
      this.logger.error('Failed to find trial activation by token hash', {
        tokenHash: maskedToken,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  override async findById(
    id: TrialActivationTokenId,
  ): Promise<TrialActivation | null> {
    const trialActivation = await this.repository.findOne({ where: { id } });
    return trialActivation
      ? this.decryptTrialActivation(trialActivation)
      : null;
  }

  async findByUserId(userId: UserId): Promise<TrialActivation[]> {
    const trialActivations = await this.repository.find({
      where: { userId },
      order: { expirationDate: 'DESC' },
    });
    return Promise.all(
      trialActivations.map((ta) => this.decryptTrialActivation(ta)),
    );
  }

  async findLatestByUserId(userId: UserId): Promise<TrialActivation | null> {
    const trialActivation = await this.repository.findOne({
      where: { userId },
      order: { expirationDate: 'DESC' },
    });
    return trialActivation
      ? this.decryptTrialActivation(trialActivation)
      : null;
  }

  async save(trialActivation: TrialActivation): Promise<TrialActivation> {
    const encrypted = await this.encryptTrialActivation(trialActivation);
    const saved = await this.repository.save(encrypted);
    return this.decryptTrialActivation(saved);
  }

  async delete(id: TrialActivationTokenId): Promise<void> {
    await this.repository.delete({ id });
  }

  protected override loggableEntity(
    entity: TrialActivation,
  ): Partial<TrialActivation> {
    return {
      id: entity.id,
      userId: entity.userId,
      expirationDate: entity.expirationDate,
    };
  }

  private async encryptTrialActivation(
    trialActivation: TrialActivation,
  ): Promise<TrialActivation> {
    return {
      ...trialActivation,
      token: await this.encryptToken(trialActivation.token),
    };
  }

  private async decryptTrialActivation(
    trialActivation: TrialActivation,
  ): Promise<TrialActivation> {
    return {
      ...trialActivation,
      token: await this.decryptToken(trialActivation.token),
    };
  }

  private async encryptToken(
    token: TrialActivationToken,
  ): Promise<TrialActivationToken> {
    const tokenString = token as string;
    const key = await this.getEncryptionKey();
    const iv = this.deriveInitializationVector(tokenString);

    try {
      const cipher = createCipheriv('aes-256-gcm', key, iv);
      let encrypted = cipher.update(tokenString, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      const authTag = cipher.getAuthTag().toString('base64');
      return `${iv.toString('base64')}:${encrypted}:${authTag}` as TrialActivationToken;
    } catch (error) {
      this.logger.error(encryptionErrorMessage, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(encryptionErrorMessage);
    }
  }

  private async decryptToken(
    token: TrialActivationToken,
  ): Promise<TrialActivationToken> {
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

      return decrypted as TrialActivationToken;
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

    const key =
      (await Configuration.getConfig('ENCRYPTION_KEY')) || 'ENCRYPTION_KEY';
    this.encryptionKey = createHash('sha256').update(key).digest();
    return this.encryptionKey;
  }

  private deriveInitializationVector(token: string): Buffer {
    const hash = createHash('sha256').update(token).digest();
    return hash.subarray(0, 12);
  }

  private maskToken(token: TrialActivationToken): string {
    const tokenString = token as string;
    if (tokenString.length <= 8) {
      return '****';
    }

    return `${tokenString.slice(0, 6)}****${tokenString.slice(-2)}`;
  }
}
