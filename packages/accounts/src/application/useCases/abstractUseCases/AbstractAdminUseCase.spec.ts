import { DataSource } from 'typeorm';
import { PackmindCommand, PackmindResult } from '@packmind/shared';
import { stubLogger } from '@packmind/shared/test';
import { AbstractAdminUseCase } from './AbstractAdminUseCase';
import { createUserId } from '../../../domain/entities/User';
import { createOrganizationId } from '../../../domain/entities/Organization';
import { userFactory } from '../../../../test/userFactory';
import { v4 as uuidv4 } from 'uuid';

jest.mock('../../services/EnhancedAccountsServices');
jest.mock('../../../infra/repositories/AccountsRepository');

class ConcreteAdminUseCase extends AbstractAdminUseCase<
  PackmindCommand,
  PackmindResult
> {
  async executeForAdmins(): Promise<PackmindResult> {
    return { success: true };
  }
}

describe('AbstractAdminUseCase', () => {
  let useCase: ConcreteAdminUseCase;
  let mockDataSource: jest.Mocked<DataSource>;
  let mockGetUserById: jest.Mock;
  const mockLogger = stubLogger();

  const userId = uuidv4();
  const organizationId = uuidv4();
  const command: PackmindCommand = {
    userId,
    organizationId,
  };

  beforeEach(() => {
    mockDataSource = {} as jest.Mocked<DataSource>;
    mockGetUserById = jest.fn();

    const EnhancedAccountsServices = jest.requireMock(
      '../../services/EnhancedAccountsServices',
    ).EnhancedAccountsServices;
    EnhancedAccountsServices.mockImplementation(() => ({
      getUserService: () => ({
        getUserById: mockGetUserById,
      }),
    }));

    useCase = new ConcreteAdminUseCase(mockDataSource, mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    describe('when user is an admin of the organization', () => {
      it('executes successfully', async () => {
        const adminUser = userFactory({
          id: createUserId(userId),
          memberships: [
            {
              userId: createUserId(userId),
              organizationId: createOrganizationId(organizationId),
              role: 'admin',
            },
          ],
        });

        mockGetUserById.mockResolvedValue(adminUser);

        const result = await useCase.execute(command);

        expect(result).toEqual({ success: true });
        expect(mockGetUserById).toHaveBeenCalledWith(createUserId(userId));
      });
    });

    describe('when user does not exist', () => {
      it('throws error', async () => {
        mockGetUserById.mockResolvedValue(null);

        await expect(useCase.execute(command)).rejects.toThrow(
          'User not found',
        );

        expect(mockGetUserById).toHaveBeenCalledWith(createUserId(userId));
      });
    });

    describe('when user does not belong to the organization', () => {
      it('throws error', async () => {
        const userWithDifferentOrg = userFactory({
          id: createUserId(userId),
          memberships: [
            {
              userId: createUserId(userId),
              organizationId: createOrganizationId(uuidv4()),
              role: 'admin',
            },
          ],
        });

        mockGetUserById.mockResolvedValue(userWithDifferentOrg);

        await expect(useCase.execute(command)).rejects.toThrow(
          'User does not belong to the organization',
        );
      });
    });

    describe('when user has no memberships', () => {
      it('throws error', async () => {
        const userWithNoMemberships = userFactory({
          id: createUserId(userId),
          memberships: [],
        });

        mockGetUserById.mockResolvedValue(userWithNoMemberships);

        await expect(useCase.execute(command)).rejects.toThrow(
          'User does not belong to the organization',
        );
      });
    });

    describe('when user is not an admin', () => {
      it('throws error', async () => {
        const nonAdminUser = userFactory({
          id: createUserId(userId),
          memberships: [
            {
              userId: createUserId(userId),
              organizationId: createOrganizationId(organizationId),
              role: 'member' as never,
            },
          ],
        });

        mockGetUserById.mockResolvedValue(nonAdminUser);

        await expect(useCase.execute(command)).rejects.toThrow(
          'User must be an admin to perform this action',
        );
      });
    });

    describe('when user has multiple memberships', () => {
      it('finds the correct one and executes successfully', async () => {
        const userWithMultipleMemberships = userFactory({
          id: createUserId(userId),
          memberships: [
            {
              userId: createUserId(userId),
              organizationId: createOrganizationId(uuidv4()),
              role: 'admin',
            },
            {
              userId: createUserId(userId),
              organizationId: createOrganizationId(organizationId),
              role: 'admin',
            },
            {
              userId: createUserId(userId),
              organizationId: createOrganizationId(uuidv4()),
              role: 'admin',
            },
          ],
        });

        mockGetUserById.mockResolvedValue(userWithMultipleMemberships);

        const result = await useCase.execute(command);

        expect(result).toEqual({ success: true });
      });
    });
  });
});
