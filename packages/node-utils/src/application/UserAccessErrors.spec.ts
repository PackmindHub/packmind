import {
  createOrganizationId,
  createUserId,
  isDomainError,
} from '@packmind/types';
import { SpaceAdminRequiredError } from './AbstractSpaceAdminUseCase';
import { SpaceMembershipRequiredError } from './AbstractSpaceMemberUseCase';
import {
  OrganizationAdminRequiredError,
  UserAccessError,
  UserNotFoundError,
  UserNotInOrganizationError,
} from './UserAccessErrors';

describe('UserAccessError kinds', () => {
  const userId = createUserId('user-id');
  const organizationId = createOrganizationId('organization-id');

  describe('when a UserNotFoundError is constructed', () => {
    const error = new UserNotFoundError({ userId });

    it('exposes the not_found kind', () => {
      expect(error.kind).toBe('not_found');
    });

    it('exposes its reason', () => {
      expect(error.reason).toBe('user_not_found');
    });

    it('exposes its name', () => {
      expect(error.name).toBe('UserNotFoundError');
    });

    it('satisfies the DomainError guard', () => {
      expect(isDomainError(error)).toBe(true);
    });
  });

  describe('when a UserNotInOrganizationError is constructed', () => {
    const error = new UserNotInOrganizationError({ userId, organizationId });

    it('exposes the forbidden kind', () => {
      expect(error.kind).toBe('forbidden');
    });

    it('exposes its reason', () => {
      expect(error.reason).toBe('user_not_in_organization');
    });

    it('exposes its name', () => {
      expect(error.name).toBe('UserNotInOrganizationError');
    });

    it('satisfies the DomainError guard', () => {
      expect(isDomainError(error)).toBe(true);
    });
  });

  describe('when an OrganizationAdminRequiredError is constructed', () => {
    const error = new OrganizationAdminRequiredError({
      userId,
      organizationId,
    });

    it('exposes the forbidden kind', () => {
      expect(error.kind).toBe('forbidden');
    });

    it('exposes its reason', () => {
      expect(error.reason).toBe('user_not_an_admin');
    });

    it('exposes its name', () => {
      expect(error.name).toBe('OrganizationAdminRequiredError');
    });

    it('satisfies the DomainError guard', () => {
      expect(isDomainError(error)).toBe(true);
    });
  });

  describe('when a UserAccessError is constructed directly', () => {
    const error = new UserAccessError(
      'forbidden',
      'user_not_an_admin',
      { userId, organizationId },
      'message',
    );

    it('exposes the kind it was given', () => {
      expect(error.kind).toBe('forbidden');
    });

    it('exposes its name', () => {
      expect(error.name).toBe('UserAccessError');
    });

    it('satisfies the DomainError guard', () => {
      expect(isDomainError(error)).toBe(true);
    });
  });
});

describe('access error messages', () => {
  const userId = createUserId('11111111-1111-1111-1111-111111111111');
  const organizationId = createOrganizationId(
    '22222222-2222-2222-2222-222222222222',
  );
  const spaceId = '33333333-3333-3333-3333-333333333333';

  describe('when a UserNotFoundError is constructed', () => {
    const error = new UserNotFoundError({ userId });

    it('leaves the user id out of the message', () => {
      expect(error.message).not.toContain(String(userId));
    });

    it('keeps the user id on the context', () => {
      expect(error.context.userId).toBe(userId);
    });
  });

  describe('when a UserNotInOrganizationError is constructed', () => {
    const error = new UserNotInOrganizationError({ userId, organizationId });

    it('leaves the user id out of the message', () => {
      expect(error.message).not.toContain(String(userId));
    });

    it('leaves the organization id out of the message', () => {
      expect(error.message).not.toContain(String(organizationId));
    });

    it('keeps the user id on the context', () => {
      expect(error.context.userId).toBe(userId);
    });

    it('keeps the organization id on the context', () => {
      expect(error.context.organizationId).toBe(organizationId);
    });
  });

  describe('when an OrganizationAdminRequiredError is constructed', () => {
    const error = new OrganizationAdminRequiredError({
      userId,
      organizationId,
    });

    it('leaves the user id out of the message', () => {
      expect(error.message).not.toContain(String(userId));
    });

    it('leaves the organization id out of the message', () => {
      expect(error.message).not.toContain(String(organizationId));
    });

    it('keeps the user id on the context', () => {
      expect(error.context.userId).toBe(userId);
    });

    it('keeps the organization id on the context', () => {
      expect(error.context.organizationId).toBe(organizationId);
    });
  });

  describe('when a SpaceMembershipRequiredError is constructed', () => {
    const error = new SpaceMembershipRequiredError(String(userId), spaceId);

    it('leaves the user id out of the message', () => {
      expect(error.message).not.toContain(String(userId));
    });

    it('leaves the space id out of the message', () => {
      expect(error.message).not.toContain(spaceId);
    });

    it('keeps the user id on the context', () => {
      expect(error.context.userId).toBe(String(userId));
    });

    it('keeps the space id on the context', () => {
      expect(error.context.spaceId).toBe(spaceId);
    });
  });

  describe('when a SpaceAdminRequiredError is constructed', () => {
    const error = new SpaceAdminRequiredError(String(userId), spaceId);

    it('leaves the user id out of the message', () => {
      expect(error.message).not.toContain(String(userId));
    });

    it('leaves the space id out of the message', () => {
      expect(error.message).not.toContain(spaceId);
    });

    it('keeps the user id on the context', () => {
      expect(error.context.userId).toBe(String(userId));
    });

    it('keeps the space id on the context', () => {
      expect(error.context.spaceId).toBe(spaceId);
    });
  });
});
