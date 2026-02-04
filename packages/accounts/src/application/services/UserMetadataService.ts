import { PackmindLogger } from '@packmind/logger';
import { UserMetadata, UserId, createUserMetadataId } from '@packmind/types';
import { IUserMetadataRepository } from '../../domain/repositories/IUserMetadataRepository';
import { v4 as uuidv4 } from 'uuid';

const origin = 'UserMetadataService';

export class UserMetadataService {
  constructor(
    private readonly userMetadataRepository: IUserMetadataRepository,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('UserMetadataService initialized');
  }

  async getOrCreateMetadata(userId: UserId): Promise<UserMetadata> {
    let metadata = await this.userMetadataRepository.findByUserId(userId);

    if (!metadata) {
      metadata = await this.userMetadataRepository.add({
        id: createUserMetadataId(uuidv4()),
        userId,
        onboardingCompleted: false,
      });
      this.logger.info('Created new user metadata', { userId });
    }

    return metadata;
  }

  async markOnboardingCompleted(userId: UserId): Promise<UserMetadata> {
    let metadata = await this.userMetadataRepository.findByUserId(userId);

    if (!metadata) {
      metadata = {
        id: createUserMetadataId(uuidv4()),
        userId,
        onboardingCompleted: true,
      };
      return this.userMetadataRepository.add(metadata);
    }

    metadata.onboardingCompleted = true;
    return this.userMetadataRepository.save(metadata);
  }

  async isOnboardingCompleted(userId: UserId): Promise<boolean> {
    const metadata = await this.userMetadataRepository.findByUserId(userId);
    return metadata?.onboardingCompleted ?? false;
  }
}
