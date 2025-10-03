import {
  User,
  createUserId,
  UserId,
  UserOrganizationMembership,
  UserOrganizationRole,
} from '../../domain/entities/User';
import { OrganizationId } from '../../domain/entities/Organization';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { IUserOrganizationMembershipRepository } from '../../domain/repositories/IUserOrganizationMembershipRepository';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import {
  PackmindLogger,
  LogLevel,
  SSEEventPublisher,
  UserContextChangeType,
} from '@packmind/shared';
import {
  InvalidInvitationEmailError,
  UserNotInOrganizationError,
  UserCannotExcludeSelfError,
} from '../../domain/errors';

const origin = 'UserService';

export type ExcludeUserFromOrganizationParams = {
  requestingUser: User;
  targetUser: User;
  organizationId: OrganizationId;
};

export class UserService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly userOrganizationMembershipRepository: IUserOrganizationMembershipRepository,
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

  async createInactiveUser(email: string): Promise<User> {
    const normalizedEmail = email.trim().toLowerCase();
    this.logger.info('Creating inactive user for invitation', {
      email: normalizedEmail,
    });

    if (!normalizedEmail) {
      throw new InvalidInvitationEmailError(email);
    }

    const existingUser =
      await this.getUserByEmailCaseInsensitive(normalizedEmail);
    if (existingUser) {
      this.logger.info('Inactive user creation skipped - user already exists', {
        email: normalizedEmail,
      });
      return existingUser;
    }

    const newUser: User = {
      id: createUserId(uuidv4()),
      email: normalizedEmail,
      passwordHash: null,
      active: false,
      memberships: [],
    };

    const createdUser = await this.userRepository.add(newUser);
    this.logger.info('Inactive user created successfully', {
      userId: createdUser.id,
      email: normalizedEmail,
    });
    return createdUser;
  }

  async addOrganizationMembership(
    user: User,
    organizationId: OrganizationId,
    role: UserOrganizationRole,
  ): Promise<User> {
    const alreadyMember = user.memberships?.some(
      (membership) => membership.organizationId === organizationId,
    );

    if (alreadyMember) {
      this.logger.info('User already member of organization', {
        userId: user.id,
        organizationId,
      });
      return user;
    }

    const membership: UserOrganizationMembership = {
      userId: user.id,
      organizationId,
      role,
    };

    const updatedUser: User = {
      ...user,
      memberships: [...(user.memberships ?? []), membership],
    };

    const savedUser = await this.userRepository.add(updatedUser);

    await this.publishUserContextChange(user.id, organizationId, 'invited');

    this.logger.info('User organization membership created', {
      userId: user.id,
      organizationId,
      role,
    });

    return savedUser;
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

  async excludeUserFromOrganization(
    params: ExcludeUserFromOrganizationParams,
  ): Promise<void> {
    const { requestingUser, targetUser, organizationId } = params;

    this.logger.info('Excluding user from organization', {
      organizationId,
      requestingUserId: requestingUser.id,
      targetUserId: targetUser.id,
    });

    if (requestingUser.id === targetUser.id) {
      throw new UserCannotExcludeSelfError();
    }

    const removed =
      await this.userOrganizationMembershipRepository.removeMembership(
        targetUser.id,
        organizationId,
      );

    if (!removed) {
      throw new UserNotInOrganizationError({
        userId: String(targetUser.id),
        organizationId: String(organizationId),
      });
    }

    this.logger.info('User exclusion completed', {
      organizationId,
      requestingUserId: requestingUser.id,
      targetUserId: targetUser.id,
    });

    await this.publishUserContextChange(
      targetUser.id,
      organizationId,
      'removed',
    );
  }

  async updateUser(user: User): Promise<User> {
    this.logger.info('Updating user', { userId: user.id, email: user.email });
    return this.userRepository.add(user);
  }

  async changeUserRole(
    targetUserId: UserId,
    organizationId: OrganizationId,
    newRole: UserOrganizationRole,
  ): Promise<boolean> {
    this.logger.info('Changing user role', {
      targetUserId,
      organizationId,
      newRole,
    });

    const success = await this.userOrganizationMembershipRepository.updateRole(
      targetUserId,
      organizationId,
      newRole,
    );

    if (success) {
      this.logger.info('User role updated successfully', {
        targetUserId,
        organizationId,
        newRole,
      });

      await this.publishUserContextChange(
        targetUserId,
        organizationId,
        'role_changed',
        newRole,
      );
    } else {
      this.logger.warn('Failed to update user role - membership not found', {
        targetUserId,
        organizationId,
        newRole,
      });
    }

    return success;
  }

  private async publishUserContextChange(
    targetUserId: UserId,
    organizationId: OrganizationId,
    changeType: UserContextChangeType,
    role?: UserOrganizationRole,
  ): Promise<void> {
    try {
      await SSEEventPublisher.publishUserContextChangeEvent(
        String(targetUserId),
        String(organizationId),
        changeType,
        role,
      );
    } catch (error) {
      this.logger.error('Failed to publish user context change event', {
        targetUserId,
        organizationId,
        changeType,
        role,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
