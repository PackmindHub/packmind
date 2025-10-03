import { CreateOrganizationUseCase } from './CreateOrganizationUseCase';
import { OrganizationService } from '../../services/OrganizationService';
import { UserService } from '../../services/UserService';
import { stubLogger } from '@packmind/shared/test';
import { createUserId, PackmindLogger, UserId } from '@packmind/shared';
import {
  Organization,
  createOrganizationId,
} from '../../../domain/entities/Organization';
import { User } from '../../../domain/entities/User';
import { v4 as uuidv4 } from 'uuid';

describe('CreateOrganizationUseCase', () => {
  let createOrganizationUseCase: CreateOrganizationUseCase;
  let mockOrganizationService: jest.Mocked<OrganizationService>;
  let mockUserService: jest.Mocked<UserService>;
  let stubbedLogger: PackmindLogger;

  beforeEach(() => {
    mockOrganizationService = {
      createOrganization: jest.fn(),
    } as unknown as jest.Mocked<OrganizationService>;

    mockUserService = {
      getUserById: jest.fn(),
      addOrganizationMembership: jest.fn(),
    } as unknown as jest.Mocked<UserService>;

    stubbedLogger = stubLogger();

    createOrganizationUseCase = new CreateOrganizationUseCase(
      mockOrganizationService,
      mockUserService,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    const userId: UserId = createUserId(uuidv4());
    const validCommand = {
      userId,
      name: 'Test Organization',
    };

    const mockOrganization: Organization = {
      id: createOrganizationId('org-123'),
      name: 'Test Organization',
      slug: 'test-organization',
    };

    describe('with valid organization name', () => {
      it('creates organization successfully and adds user as admin', async () => {
        const mockUser: User = {
          id: userId,
          email: 'test@example.com',
          passwordHash: 'hash',
          active: true,
          memberships: [],
        };

        mockUserService.getUserById.mockResolvedValue(mockUser);
        mockOrganizationService.createOrganization.mockResolvedValue(
          mockOrganization,
        );
        mockUserService.addOrganizationMembership.mockResolvedValue(mockUser);

        const result = await createOrganizationUseCase.execute(validCommand);

        expect(result).toEqual({ organization: mockOrganization });
        expect(mockUserService.getUserById).toHaveBeenCalledWith(userId);
        expect(mockOrganizationService.createOrganization).toHaveBeenCalledWith(
          'Test Organization',
        );
        expect(mockUserService.addOrganizationMembership).toHaveBeenCalledWith(
          mockUser,
          mockOrganization.id,
          'admin',
        );
      });

      it('throws error if user not found', async () => {
        mockUserService.getUserById.mockResolvedValue(null);

        await expect(
          createOrganizationUseCase.execute(validCommand),
        ).rejects.toThrow('User not found');

        expect(mockUserService.getUserById).toHaveBeenCalledWith(userId);
        expect(
          mockOrganizationService.createOrganization,
        ).not.toHaveBeenCalled();
        expect(
          mockUserService.addOrganizationMembership,
        ).not.toHaveBeenCalled();
      });
    });

    describe('with organization name having whitespace', () => {
      it('trims whitespace and creates organization', async () => {
        const commandWithWhitespace = {
          userId,
          name: '  Test Organization  ',
        };
        const mockUser: User = {
          id: userId,
          email: 'test@example.com',
          passwordHash: 'hash',
          active: true,
          memberships: [],
        };

        mockUserService.getUserById.mockResolvedValue(mockUser);
        mockOrganizationService.createOrganization.mockResolvedValue(
          mockOrganization,
        );
        mockUserService.addOrganizationMembership.mockResolvedValue(mockUser);

        const result = await createOrganizationUseCase.execute(
          commandWithWhitespace,
        );

        expect(result).toEqual({ organization: mockOrganization });
        expect(mockOrganizationService.createOrganization).toHaveBeenCalledWith(
          'Test Organization',
        );
      });
    });

    describe('with missing userId', () => {
      it('throws validation error', async () => {
        const invalidCommand = {
          userId: null as unknown as UserId,
          name: 'Test Organization',
        };

        await expect(
          createOrganizationUseCase.execute(invalidCommand),
        ).rejects.toThrow('User ID is required');

        expect(mockUserService.getUserById).not.toHaveBeenCalled();
        expect(
          mockOrganizationService.createOrganization,
        ).not.toHaveBeenCalled();
      });
    });

    describe('with empty organization name', () => {
      it('throws validation error', async () => {
        const invalidCommand = {
          userId,
          name: '',
        };

        await expect(
          createOrganizationUseCase.execute(invalidCommand),
        ).rejects.toThrow('Organization name is required');

        expect(
          mockOrganizationService.createOrganization,
        ).not.toHaveBeenCalled();
      });
    });

    describe('with whitespace-only organization name', () => {
      it('throws validation error', async () => {
        const invalidCommand = {
          userId,
          name: '   ',
        };

        await expect(
          createOrganizationUseCase.execute(invalidCommand),
        ).rejects.toThrow('Organization name is required');

        expect(
          mockOrganizationService.createOrganization,
        ).not.toHaveBeenCalled();
      });
    });

    describe('with null organization name', () => {
      it('throws validation error', async () => {
        const invalidCommand = {
          userId,
          name: null as unknown as string,
        };

        await expect(
          createOrganizationUseCase.execute(invalidCommand),
        ).rejects.toThrow('Organization name is required');

        expect(
          mockOrganizationService.createOrganization,
        ).not.toHaveBeenCalled();
      });
    });

    describe('with undefined organization name', () => {
      it('throws validation error', async () => {
        const invalidCommand = {
          userId,
          name: undefined as unknown as string,
        };

        await expect(
          createOrganizationUseCase.execute(invalidCommand),
        ).rejects.toThrow('Organization name is required');

        expect(
          mockOrganizationService.createOrganization,
        ).not.toHaveBeenCalled();
      });
    });

    describe('with service error', () => {
      it('rethrows error', async () => {
        const mockUser: User = {
          id: userId,
          email: 'test@example.com',
          passwordHash: 'hash',
          active: true,
          memberships: [],
        };

        mockUserService.getUserById.mockResolvedValue(mockUser);
        const serviceError = new Error('Organization already exists');
        mockOrganizationService.createOrganization.mockRejectedValue(
          serviceError,
        );

        await expect(
          createOrganizationUseCase.execute(validCommand),
        ).rejects.toThrow('Organization already exists');

        expect(mockUserService.getUserById).toHaveBeenCalledWith(userId);
        expect(mockOrganizationService.createOrganization).toHaveBeenCalledWith(
          'Test Organization',
        );
        expect(
          mockUserService.addOrganizationMembership,
        ).not.toHaveBeenCalled();
      });
    });

    describe('with non-Error exception', () => {
      it('rethrows exception', async () => {
        const mockUser: User = {
          id: userId,
          email: 'test@example.com',
          passwordHash: 'hash',
          active: true,
          memberships: [],
        };

        mockUserService.getUserById.mockResolvedValue(mockUser);
        const serviceError = 'Database connection failed';
        mockOrganizationService.createOrganization.mockRejectedValue(
          serviceError,
        );

        await expect(
          createOrganizationUseCase.execute(validCommand),
        ).rejects.toBe('Database connection failed');
      });
    });

    describe('with minimal valid organization name', () => {
      it('creates organization successfully', async () => {
        const minimalCommand = {
          userId,
          name: 'A',
        };
        const minimalOrganization: Organization = {
          ...mockOrganization,
          name: 'A',
          slug: 'a',
        };
        const mockUser: User = {
          id: userId,
          email: 'test@example.com',
          passwordHash: 'hash',
          active: true,
          memberships: [],
        };

        mockUserService.getUserById.mockResolvedValue(mockUser);
        mockOrganizationService.createOrganization.mockResolvedValue(
          minimalOrganization,
        );
        mockUserService.addOrganizationMembership.mockResolvedValue(mockUser);

        const result = await createOrganizationUseCase.execute(minimalCommand);

        expect(result).toEqual({ organization: minimalOrganization });
        expect(mockOrganizationService.createOrganization).toHaveBeenCalledWith(
          'A',
        );
      });
    });
  });
});
