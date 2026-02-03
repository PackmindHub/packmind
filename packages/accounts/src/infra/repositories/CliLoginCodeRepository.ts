import { Repository, LessThan } from 'typeorm';
import { createCipheriv, createDecipheriv, createHash } from 'crypto';
import {
  CliLoginCode,
  CliLoginCodeId,
  CliLoginCodeToken,
} from '../../domain/entities/CliLoginCode';
import { ICliLoginCodeRepository } from '../../domain/repositories/ICliLoginCodeRepository';
import { CliLoginCodeSchema } from '../schemas/CliLoginCodeSchema';
import { PackmindLogger } from '@packmind/logger';
import {
  AbstractRepository,
  Configuration,
  WithTimestamps,
} from '@packmind/node-utils';

const origin = 'CliLoginCodeRepository';
const encryptionErrorMessage = 'Failed to encrypt CLI login code';
const decryptionErrorMessage = 'Failed to decrypt CLI login code';

export class CliLoginCodeRepository
  extends AbstractRepository<CliLoginCode>
  implements ICliLoginCodeRepository
{
  private encryptionKey: Buffer | null = null;

  constructor(
    repository: Repository<WithTimestamps<CliLoginCode>>,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super('cli_login_code', repository, CliLoginCodeSchema, logger);
  }

  override async add(cliLoginCode: CliLoginCode): Promise<CliLoginCode> {
    const encrypted = await this.encryptCliLoginCode(cliLoginCode);
    const saved = await super.add(encrypted);
    return this.decryptCliLoginCode(saved);
  }

  async findByCode(code: CliLoginCodeToken): Promise<CliLoginCode | null> {
    const encryptedCode = await this.encryptCode(code);

    const cliLoginCode = await this.repository.findOne({
      where: { code: encryptedCode },
    });

    if (!cliLoginCode) {
      return null;
    }

    return this.decryptCliLoginCode(cliLoginCode);
  }

  override async findById(id: CliLoginCodeId): Promise<CliLoginCode | null> {
    const cliLoginCode = await this.repository.findOne({ where: { id } });
    return cliLoginCode ? this.decryptCliLoginCode(cliLoginCode) : null;
  }

  async save(cliLoginCode: CliLoginCode): Promise<CliLoginCode> {
    const encrypted = await this.encryptCliLoginCode(cliLoginCode);
    const saved = await this.repository.save(encrypted);
    return this.decryptCliLoginCode(saved);
  }

  async delete(id: CliLoginCodeId): Promise<void> {
    await this.repository.delete({ id });
  }

  async deleteExpired(): Promise<number> {
    const result = await this.repository.delete({
      expiresAt: LessThan(new Date()),
    });

    return result.affected ?? 0;
  }

  protected override loggableEntity(
    entity: CliLoginCode,
  ): Partial<CliLoginCode> {
    return {
      id: entity.id,
      userId: entity.userId,
      organizationId: entity.organizationId,
      expiresAt: entity.expiresAt,
    };
  }

  private async encryptCliLoginCode(
    cliLoginCode: CliLoginCode,
  ): Promise<CliLoginCode> {
    return {
      ...cliLoginCode,
      code: await this.encryptCode(cliLoginCode.code),
    };
  }

  private async decryptCliLoginCode(
    cliLoginCode: CliLoginCode,
  ): Promise<CliLoginCode> {
    return {
      ...cliLoginCode,
      code: await this.decryptCode(cliLoginCode.code),
    };
  }

  private async encryptCode(
    code: CliLoginCodeToken,
  ): Promise<CliLoginCodeToken> {
    const codeString = code as string;
    const key = await this.getEncryptionKey();
    const iv = this.deriveInitializationVector(codeString);

    try {
      const cipher = createCipheriv('aes-256-gcm', key, iv);
      let encrypted = cipher.update(codeString, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      const authTag = cipher.getAuthTag().toString('base64');
      return `${iv.toString('base64')}:${encrypted}:${authTag}` as CliLoginCodeToken;
    } catch (error) {
      this.logger.error(encryptionErrorMessage, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(encryptionErrorMessage);
    }
  }

  private async decryptCode(
    code: CliLoginCodeToken,
  ): Promise<CliLoginCodeToken> {
    const codeString = code as string;

    if (!codeString.includes(':')) {
      return code;
    }

    const [ivBase64, encrypted, authTagBase64] = codeString.split(':');

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

      return decrypted as CliLoginCodeToken;
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

  private deriveInitializationVector(code: string): Buffer {
    const hash = createHash('sha256').update(code).digest();
    return hash.subarray(0, 12);
  }
}
