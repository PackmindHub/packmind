import { Repository } from 'typeorm';
import { User } from '../../domain/entities/User';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { UserSchema } from '../schemas/UserSchema';
import {
  PackmindLogger,
  localDataSource,
  AbstractRepository,
  QueryOption,
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

  override async findById(
    id: User['id'],
    opts?: QueryOption,
  ): Promise<User | null> {
    this.logger.info('Finding user by ID with memberships', { id });

    try {
      const user = await this.repository.findOne({
        where: { id },
        withDeleted: opts?.includeDeleted ?? false,
        relations: {
          memberships: {
            organization: true,
          },
        },
      });

      if (user) {
        this.logger.info('Found user by ID with memberships', {
          id: user.id,
          email: user.email,
        });
      } else {
        this.logger.warn('User not found by ID', { id });
      }

      return user;
    } catch (error) {
      this.logger.error('Failed to find user by ID', {
        id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  protected override loggableEntity(entity: User): Partial<User> {
    return {
      id: entity.id,
      email: entity.email,
      active: entity.active,
      memberships: entity.memberships?.map((membership) => ({
        userId: membership.userId,
        organizationId: membership.organizationId,
        role: membership.role,
      })),
    };
  }

  protected override makeDuplicationErrorMessage(user: User) {
    return `Email '${user.email}' already exists`;
  }

  async findByEmail(email: string): Promise<User | null> {
    this.logger.info('Finding user by email', { email });

    try {
      const user = await this.repository.findOne({
        where: { email },
        relations: {
          memberships: {
            organization: true,
          },
        },
      });
      this.logger.info('User found by email', {
        email,
        found: !!user,
        active: user?.active,
      });
      return user;
    } catch (error) {
      this.logger.error('Failed to find user by email', {
        email,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async findByEmailCaseInsensitive(email: string): Promise<User | null> {
    this.logger.info('Finding user by email (case-insensitive)', { email });

    try {
      const user = await this.repository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.memberships', 'memberships')
        .leftJoinAndSelect('memberships.organization', 'organization')
        .where('LOWER(user.email) = LOWER(:email)', { email })
        .getOne();

      this.logger.info('User found by email (case-insensitive)', {
        email,
        found: !!user,
        foundEmail: user?.email,
      });
      return user;
    } catch (error) {
      this.logger.error('Failed to find user by email (case-insensitive)', {
        email,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async list(): Promise<User[]> {
    this.logger.info('Listing users');

    try {
      const users = await this.repository.find({
        relations: {
          memberships: {
            organization: true,
          },
        },
      });
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

  async listByOrganization(organizationId: string): Promise<User[]> {
    this.logger.info('Listing users by organization', { organizationId });

    try {
      const users = await this.repository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.memberships', 'memberships')
        .leftJoinAndSelect('memberships.organization', 'organization')
        .where('memberships.organizationId = :organizationId', {
          organizationId,
        })
        .getMany();

      this.logger.info('Users listed successfully by organization', {
        organizationId,
        count: users.length,
      });
      return users;
    } catch (error) {
      this.logger.error('Failed to list users by organization', {
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
