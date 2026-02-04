import { Repository } from 'typeorm';
import { UserMetadata, UserId } from '@packmind/types';
import { IUserMetadataRepository } from '../../domain/repositories/IUserMetadataRepository';
import { UserMetadataSchema } from '../schemas/UserMetadataSchema';
import { PackmindLogger } from '@packmind/logger';
import {
  localDataSource,
  AbstractRepository,
  WithTimestamps,
} from '@packmind/node-utils';

const origin = 'UserMetadataRepository';

export class UserMetadataRepository
  extends AbstractRepository<UserMetadata>
  implements IUserMetadataRepository
{
  constructor(
    repository: Repository<
      WithTimestamps<UserMetadata>
    > = localDataSource.getRepository<WithTimestamps<UserMetadata>>(
      UserMetadataSchema,
    ),
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super('user_metadata', repository, UserMetadataSchema, logger);
  }

  async findByUserId(userId: UserId): Promise<UserMetadata | null> {
    this.logger.info('Finding user metadata by user ID', { userId });

    try {
      const userMetadata = await this.repository.findOne({
        where: { userId },
      });

      if (userMetadata) {
        this.logger.info('Found user metadata by user ID', {
          userId,
          id: userMetadata.id,
        });
      } else {
        this.logger.info('User metadata not found by user ID', { userId });
      }

      return userMetadata;
    } catch (error) {
      this.logger.error('Failed to find user metadata by user ID', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async save(userMetadata: UserMetadata): Promise<UserMetadata> {
    this.logger.info('Saving user metadata', {
      id: userMetadata.id,
      userId: userMetadata.userId,
    });

    try {
      const savedMetadata = await this.repository.save(userMetadata);
      this.logger.info('User metadata saved successfully', {
        id: savedMetadata.id,
        userId: savedMetadata.userId,
      });
      return savedMetadata;
    } catch (error) {
      this.logger.error('Failed to save user metadata', {
        id: userMetadata.id,
        userId: userMetadata.userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  protected override loggableEntity(
    entity: UserMetadata,
  ): Partial<UserMetadata> {
    return {
      id: entity.id,
      userId: entity.userId,
      onboardingCompleted: entity.onboardingCompleted,
    };
  }
}
