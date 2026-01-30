import { stubLogger } from '@packmind/test-utils';
import {
  createOrganizationId,
  createUserId,
  IAccountsPort,
  RenameOrganizationCommand,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { organizationFactory, userFactory } from '../../../../test';
import { InvalidOrganizationNameError } from '../../../domain/errors';
import { OrganizationService } from '../../services/OrganizationService';
import { RenameOrganizationUseCase } from './RenameOrganizationUseCase';

describe('RenameOrganizationUseCase', () => {
  let useCase: RenameOrganizationUseCase;
  let mockGetUserById: jest.Mock;
  let mockGetOrganizationById: jest.Mock;
  let mockRenameOrganization: jest.Mock;
  let organizationService: jest.Mocked<OrganizationService>;
  const mockLogger = stubLogger();

  const adminUserId = uuidv4();
  const organizationId = uuidv4();

  const organization = organizationFactory({
    id: createOrganizationId(organizationId),
    name: 'Original Name',
    slug: 'original-name',
  });

  beforeEach(() => {
    mockGetUserById = jest.fn();
    mockGetOrganizationById = jest.fn();
    mockRenameOrganization = jest.fn();

    const accountsPort = {
      getUserById: mockGetUserById,
      getOrganizationById: mockGetOrganizationById,
    } as unknown as IAccountsPort;

    organizationService = {
      renameOrganization: mockRenameOrganization,
    } as unknown as jest.Mocked<OrganizationService>;

    mockGetOrganizationById.mockResolvedValue(organization);

    useCase = new RenameOrganizationUseCase(
      accountsPort,
      organizationService,
      mockLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createCommand = (name: string): RenameOrganizationCommand => ({
    userId: adminUserId,
    organizationId,
    name,
  });

  const createAdminUser = () =>
    userFactory({
      id: createUserId(adminUserId),
      memberships: [
        {
          userId: createUserId(adminUserId),
          organizationId: createOrganizationId(organizationId),
          role: 'admin',
        },
      ],
    });

  describe('execute', () => {
    describe('when admin renames organization with valid name', () => {
      const newName = 'New Organization Name';
      const newSlug = 'new-organization-name';

      beforeEach(() => {
        const adminUser = createAdminUser();
        mockGetUserById.mockResolvedValueOnce(adminUser);

        const updatedOrganization = organizationFactory({
          id: createOrganizationId(organizationId),
          name: newName,
          slug: newSlug,
        });
        mockRenameOrganization.mockResolvedValue(updatedOrganization);
      });

      it('returns the renamed organization', async () => {
        const result = await useCase.execute(createCommand(newName));

        expect(result.organization.name).toBe(newName);
      });

      it('returns organization with updated slug', async () => {
        const result = await useCase.execute(createCommand(newName));

        expect(result.organization.slug).toBe(newSlug);
      });

      it('calls renameOrganization with organization and new name', async () => {
        await useCase.execute(createCommand(newName));

        expect(mockRenameOrganization).toHaveBeenCalledWith(
          organization,
          newName,
        );
      });
    });

    describe('when admin renames organization with name containing whitespace', () => {
      const nameWithWhitespace = '  Trimmed Name  ';
      const trimmedName = 'Trimmed Name';

      beforeEach(() => {
        const adminUser = createAdminUser();
        mockGetUserById.mockResolvedValueOnce(adminUser);

        const updatedOrganization = organizationFactory({
          id: createOrganizationId(organizationId),
          name: trimmedName,
          slug: 'trimmed-name',
        });
        mockRenameOrganization.mockResolvedValue(updatedOrganization);
      });

      it('trims the name before saving', async () => {
        await useCase.execute(createCommand(nameWithWhitespace));

        expect(mockRenameOrganization).toHaveBeenCalledWith(
          organization,
          trimmedName,
        );
      });
    });

    describe('when name is empty', () => {
      beforeEach(() => {
        const adminUser = createAdminUser();
        mockGetUserById.mockResolvedValueOnce(adminUser);
      });

      it('throws InvalidOrganizationNameError', async () => {
        await expect(useCase.execute(createCommand(''))).rejects.toBeInstanceOf(
          InvalidOrganizationNameError,
        );
      });

      it('does not call renameOrganization', async () => {
        try {
          await useCase.execute(createCommand(''));
        } catch {
          // Expected to throw
        }

        expect(mockRenameOrganization).not.toHaveBeenCalled();
      });
    });

    describe('when name is whitespace only', () => {
      beforeEach(() => {
        const adminUser = createAdminUser();
        mockGetUserById.mockResolvedValueOnce(adminUser);
      });

      it('throws InvalidOrganizationNameError', async () => {
        await expect(
          useCase.execute(createCommand('   ')),
        ).rejects.toBeInstanceOf(InvalidOrganizationNameError);
      });

      it('does not call renameOrganization', async () => {
        try {
          await useCase.execute(createCommand('   '));
        } catch {
          // Expected to throw
        }

        expect(mockRenameOrganization).not.toHaveBeenCalled();
      });
    });

    describe('when name is null', () => {
      beforeEach(() => {
        const adminUser = createAdminUser();
        mockGetUserById.mockResolvedValueOnce(adminUser);
      });

      it('throws InvalidOrganizationNameError', async () => {
        await expect(
          useCase.execute(createCommand(null as unknown as string)),
        ).rejects.toBeInstanceOf(InvalidOrganizationNameError);
      });
    });

    describe('when name is undefined', () => {
      beforeEach(() => {
        const adminUser = createAdminUser();
        mockGetUserById.mockResolvedValueOnce(adminUser);
      });

      it('throws InvalidOrganizationNameError', async () => {
        await expect(
          useCase.execute(createCommand(undefined as unknown as string)),
        ).rejects.toBeInstanceOf(InvalidOrganizationNameError);
      });
    });

    describe('when service throws an error', () => {
      beforeEach(() => {
        const adminUser = createAdminUser();
        mockGetUserById.mockResolvedValueOnce(adminUser);
        mockRenameOrganization.mockRejectedValue(new Error('Database error'));
      });

      it('propagates the error', async () => {
        await expect(
          useCase.execute(createCommand('New Name')),
        ).rejects.toThrow('Database error');
      });
    });
  });
});
