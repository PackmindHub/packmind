import {
  User,
  createUserId,
  UserId,
  UserOrganizationMembership,
} from '../../domain/entities/User';
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
    email: string,
    password: string,
    organizationId: OrganizationId,
  ): Promise<User> {
    this.logger.info('Creating user', { email, organizationId });

    try {
      // Validate input
      if (!email || !password || !organizationId) {
        throw new Error('Email, password, and organizationId are required');
      }

      // Check if user already exists (case-insensitive)
      const existingUser = await this.getUserByEmailCaseInsensitive(email);
      if (existingUser) {
        throw new Error(`Email '${email}' already exists`);
      }

      // Hash password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user
      const id = createUserId(uuidv4());
      const membership: UserOrganizationMembership = {
        userId: id,
        organizationId,
        role: 'admin',
      };

      const user: User = {
        id,
        email,
        passwordHash,
        active: true,
        memberships: [membership],
      };

      const createdUser = await this.userRepository.add(user);
      this.logger.info('User created successfully', {
        userId: createdUser.id,
        email,
        organizationId,
      });
      return createdUser;
    } catch (error) {
      this.logger.error('Failed to create user', {
        email,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getUserById(id: UserId): Promise<User | null> {
    this.logger.info('Getting user by ID', { id });
    return this.userRepository.findById(id);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    this.logger.info('Getting user by email', { email });
    return this.userRepository.findByEmail(email);
  }

  async getUserByEmailCaseInsensitive(email: string): Promise<User | null> {
    this.logger.info('Getting user by email (case-insensitive)', { email });
    return this.userRepository.findByEmailCaseInsensitive(email);
  }

  async validatePassword(
    password: string,
    hash: string | null,
  ): Promise<boolean> {
    if (!hash) {
      return false;
    }
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
