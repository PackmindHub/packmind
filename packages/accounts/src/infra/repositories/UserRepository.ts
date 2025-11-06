import { Repository } from 'typeorm';
import { User } from '@packmind/types';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { UserSchema } from '../schemas/UserSchema';
import { PackmindLogger, maskEmail } from '@packmind/logger';
import { localDataSource, AbstractRepository } from '@packmind/node-utils';
import { QueryOption } from '@packmind/types';

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
          email: maskEmail(user.email),
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
      email: maskEmail(entity.email) as User['email'],
      active: entity.active,
      memberships: entity.memberships?.map((membership) => ({
        userId: membership.userId,
        organizationId: membership.organizationId,
        role: membership.role,
      })),
    };
  }

  protected override makeDuplicationErrorMessage(user: User) {
    return `Email '${maskEmail(user.email)}' already exists`;
  }

  async findByEmail(email: string): Promise<User | null> {
    this.logger.info('Finding user by email', { email: maskEmail(email) });

    try {
      const user = await this.repository.findOne({
        where: { email },
        relations: {
          memberships: {
            organization: true,
          },
        },
      });
      return user;
    } catch (error) {
      this.logger.error('Failed to find user by email', {
        email: maskEmail(email),
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async findByEmailCaseInsensitive(email: string): Promise<User | null> {
    this.logger.info('Finding user by email (case-insensitive)', {
      email: maskEmail(email),
    });

    try {
      const user = await this.repository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.memberships', 'memberships')
        .leftJoinAndSelect('memberships.organization', 'organization')
        .where('LOWER(user.email) = LOWER(:email)', { email })
        .getOne();

      this.logger.info('User found by email (case-insensitive)', {
        email: maskEmail(email),
        found: !!user,
        foundEmail: maskEmail(user?.email),
      });
      return user;
    } catch (error) {
      this.logger.error('Failed to find user by email (case-insensitive)', {
        email: maskEmail(email),
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
