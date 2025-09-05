import { User, createUserId, UserId } from '../../domain/entities/User';
import { OrganizationId } from '../../domain/entities/Organization';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PackmindLogger, LogLevel } from '@packmind/shared';

const origin = 'UserService';

export class UserService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.INFO,
    ),
  ) {
    this.logger.info('UserService initialized');
  }

  async createUser(
    username: string,
    password: string,
    organizationId: OrganizationId,
  ): Promise<User> {
    this.logger.info('Creating user', { username, organizationId });

    try {
      // Validate input
      if (!username || !password || !organizationId) {
        throw new Error('Username, password, and organizationId are required');
      }

      // Hash password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user
      const user: User = {
        id: createUserId(uuidv4()),
        username,
        passwordHash,
        organizationId,
      };

      const createdUser = await this.userRepository.add(user);
      this.logger.info('User created successfully', {
        userId: createdUser.id,
        username,
      });
      return createdUser;
    } catch (error) {
      this.logger.error('Failed to create user', {
        username,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getUserById(id: UserId): Promise<User | null> {
    this.logger.info('Getting user by ID', { id });
    return this.userRepository.findById(id);
  }

  async getUserByUsername(username: string): Promise<User | null> {
    this.logger.info('Getting user by username', { username });
    return this.userRepository.findByUsername(username);
  }

  async validatePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  async listUsers(): Promise<User[]> {
    this.logger.info('Listing all users');
    return this.userRepository.list();
  }
}
