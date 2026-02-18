import {
  createOrganizationId,
  createUserId,
  Organization,
  User,
  UserOrganizationMembership,
} from '@packmind/types';
import { MembershipResolutionService } from './MembershipResolutionService';
import { OrganizationService } from './OrganizationService';
import { InvalidEmailOrPasswordError } from '../../domain/errors/InvalidEmailOrPasswordError';
import { userFactory } from '../../../test';

describe('MembershipResolutionService', () => {
  let service: MembershipResolutionService;
  let organizationService: jest.Mocked<OrganizationService>;

  const userId = createUserId('user-123');
  const organizationId = createOrganizationId('org-123');

  const membership: UserOrganizationMembership = {
    userId,
    organizationId,
    role: 'admin',
  };

  const testUser: User = userFactory({
    id: userId,
    email: 'testuser@packmind.com',
    memberships: [membership],
  });

  const testOrganization: Organization = {
    id: organizationId,
    name: 'Test Organization',
    slug: 'test-org',
  };

  beforeEach(() => {
    organizationService = {
      getOrganizationById: jest.fn(),
    } as unknown as jest.Mocked<OrganizationService>;

    service = new MembershipResolutionService(organizationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when user has a single membership', () => {
    beforeEach(() => {
      organizationService.getOrganizationById.mockResolvedValue(
        testOrganization,
      );
    });

    it('returns the organization and role', async () => {
      const result = await service.resolveUserOrganizations(testUser);

      expect(result).toEqual({
        organization: testOrganization,
        role: 'admin',
      });
    });

    it('calls getOrganizationById with the membership organizationId', async () => {
      await service.resolveUserOrganizations(testUser);

      expect(organizationService.getOrganizationById).toHaveBeenCalledWith(
        organizationId,
      );
    });

    describe('when organization does not exist', () => {
      beforeEach(() => {
        organizationService.getOrganizationById.mockResolvedValue(null);
      });

      it('throws InvalidEmailOrPasswordError', async () => {
        await expect(
          service.resolveUserOrganizations(testUser),
        ).rejects.toThrow(InvalidEmailOrPasswordError);
      });
    });
  });

  describe('when user has no memberships', () => {
    const userWithNoMemberships: User = {
      ...testUser,
      memberships: [],
    };

    it('returns empty organizations array', async () => {
      const result = await service.resolveUserOrganizations(
        userWithNoMemberships,
      );

      expect(result).toEqual({ organizations: [] });
    });

    it('does not call getOrganizationById', async () => {
      await service.resolveUserOrganizations(userWithNoMemberships);

      expect(organizationService.getOrganizationById).not.toHaveBeenCalled();
    });
  });

  describe('when user has multiple memberships', () => {
    const organizationId2 = createOrganizationId('org-456');
    const membership2: UserOrganizationMembership = {
      userId,
      organizationId: organizationId2,
      role: 'member',
    };

    const testOrganization2: Organization = {
      id: organizationId2,
      name: 'Second Organization',
      slug: 'second-org',
    };

    const userWithMultipleOrgs: User = {
      ...testUser,
      memberships: [membership, membership2],
    };

    beforeEach(() => {
      organizationService.getOrganizationById
        .mockResolvedValueOnce(testOrganization)
        .mockResolvedValueOnce(testOrganization2);
    });

    it('returns the list of organizations with roles', async () => {
      const result =
        await service.resolveUserOrganizations(userWithMultipleOrgs);

      expect(result).toEqual({
        organizations: [
          { organization: testOrganization, role: 'admin' },
          { organization: testOrganization2, role: 'member' },
        ],
      });
    });

    it('calls getOrganizationById for each membership', async () => {
      await service.resolveUserOrganizations(userWithMultipleOrgs);

      expect(organizationService.getOrganizationById).toHaveBeenCalledTimes(2);
    });

    it('calls getOrganizationById with first organizationId', async () => {
      await service.resolveUserOrganizations(userWithMultipleOrgs);

      expect(organizationService.getOrganizationById).toHaveBeenCalledWith(
        organizationId,
      );
    });

    it('calls getOrganizationById with second organizationId', async () => {
      await service.resolveUserOrganizations(userWithMultipleOrgs);

      expect(organizationService.getOrganizationById).toHaveBeenCalledWith(
        organizationId2,
      );
    });

    describe('when one organization does not exist', () => {
      it('throws InvalidEmailOrPasswordError', async () => {
        organizationService.getOrganizationById.mockReset();
        organizationService.getOrganizationById
          .mockResolvedValueOnce(testOrganization)
          .mockResolvedValueOnce(null);

        await expect(
          service.resolveUserOrganizations(userWithMultipleOrgs),
        ).rejects.toThrow(InvalidEmailOrPasswordError);
      });
    });
  });
});
