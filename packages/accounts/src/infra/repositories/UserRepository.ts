import { Repository } from 'typeorm';
import { User } from '../../domain/entities/User';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { UserSchema } from '../schemas/UserSchema';
import {
  PackmindLogger,
  localDataSource,
  AbstractRepository,
} from '@packmind/shared';

const origin = 'UserRepository';

export class UserRepository
  extends AbstractRepository<User>
  implements IUserRepository
{
  constructor(
    repository: Repository<User> = localDataSource.getRepository<User>(
      UserSchema,
    ),
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super('user', repository, logger, UserSchema);
    this.logger.info('UserRepository initialized');
  }

  protected override loggableEntity(entity: User): Partial<User> {
    return {
      id: entity.id,
      username: entity.username,
      organizationId: entity.organizationId,
    };
  }

  protected override makeDuplicationErrorMessage(user: User) {
    return `Username '${user.username}' already exists`;
  }

  async findByUsername(username: string): Promise<User | null> {
    this.logger.info('Finding user by username', { username });

    try {
      const user = await this.repository.findOne({ where: { username } });
      this.logger.info('User found by username', {
        username,
        found: !!user,
      });
      return user;
    } catch (error) {
      this.logger.error('Failed to find user by username', {
        username,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async list(): Promise<User[]> {
    this.logger.info('Listing users');

    try {
      const users = await this.repository.find();
      this.logger.info('Users listed successfully', {
        count: users.length,
      });
      return users;
    } catch (error) {
      this.logger.error('Failed to list users', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
