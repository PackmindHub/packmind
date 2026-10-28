import { Configuration } from '@packmind/node-utils';
import { createMockInstance, stubLogger } from '@packmind/test-utils';
import { createOrganizationId, createUserId, User } from '@packmind/types';
import { userFactory } from '../../../test';
import { OrganizationCreationRestrictedError } from '../../domain/errors';
import { OrganizationCreationPolicyService } from './OrganizationCreationPolicyService';
import { OrganizationService } from './OrganizationService';

describe('OrganizationCreationPolicyService', () => {
  let service: OrganizationCreationPolicyService;
  let mockOrganizationService: jest.Mocked<OrganizationService>;

  const userWithRole = (role: 'admin' | 'member'): User => {
    const userId = createUserId('user-1');
    return userFactory({
      id: userId,
      memberships: [
        {
          userId,
          organizationId: createOrganizationId('org-1'),
          role,
        },
      ],
    });
  };

  const givenRestriction = (value: string | null) => {
    jest
      .spyOn(Configuration, 'getConfig')
      .mockImplementation(async (key) =>
        key === 'RESTRICT_ORGANIZATION_CREATION_TO_ADMINS' ? value : null,
      );
  };

  beforeEach(() => {
    mockOrganizationService = createMockInstance(OrganizationService);
    mockOrganizationService.countOrganizations.mockResolvedValue(2);

    service = new OrganizationCreationPolicyService(
      mockOrganizationService,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('.canCreateOrganization', () => {
    describe('when the restriction is not configured', () => {
      beforeEach(() => givenRestriction(null));

      it('allows an anonymous caller', async () => {
        expect(await service.canCreateOrganization(null)).toBe(true);
      });

      it('does not count organizations', async () => {
        await service.canCreateOrganization(null);

        expect(
          mockOrganizationService.countOrganizations,
        ).not.toHaveBeenCalled();
      });
    });

    describe('when the restriction is set to another value than "true"', () => {
      beforeEach(() => givenRestriction('false'));

      it('allows a member', async () => {
        expect(
          await service.canCreateOrganization(userWithRole('member')),
        ).toBe(true);
      });
    });

    describe('when the restriction is enabled', () => {
      beforeEach(() => givenRestriction('true'));

      describe('when no organization exists yet', () => {
        beforeEach(() => {
          mockOrganizationService.countOrganizations.mockResolvedValue(0);
        });

        it('allows an anonymous caller', async () => {
          expect(await service.canCreateOrganization(null)).toBe(true);
        });
      });

      describe('when organizations already exist', () => {
        it('allows a user who is admin of an organization', async () => {
          expect(
            await service.canCreateOrganization(userWithRole('admin')),
          ).toBe(true);
        });

        it('refuses a user who is only a member', async () => {
          expect(
            await service.canCreateOrganization(userWithRole('member')),
          ).toBe(false);
        });

        it('refuses a user without any membership', async () => {
          expect(
            await service.canCreateOrganization(
              userFactory({ memberships: [] }),
            ),
          ).toBe(false);
        });

        it('refuses an anonymous caller', async () => {
          expect(await service.canCreateOrganization(null)).toBe(false);
        });
      });
    });
  });

  describe('.assertCanCreateOrganization', () => {
    beforeEach(() => givenRestriction('true'));

    describe('when the caller is allowed', () => {
      it('resolves', async () => {
        await expect(
          service.assertCanCreateOrganization(userWithRole('admin')),
        ).resolves.toBeUndefined();
      });
    });

    describe('when the caller is refused', () => {
      it('throws OrganizationCreationRestrictedError', async () => {
        await expect(
          service.assertCanCreateOrganization(userWithRole('member')),
        ).rejects.toBeInstanceOf(OrganizationCreationRestrictedError);
      });
    });
  });
});
