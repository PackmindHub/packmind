import {
  createOrganizationId,
  createUserId,
  isDomainError,
} from '@packmind/types';
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
