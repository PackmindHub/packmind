import { isDomainError } from '@packmind/types';
import { SpaceAdminRequiredError } from './AbstractSpaceAdminUseCase';
import { SpaceMembershipRequiredError } from './AbstractSpaceMemberUseCase';
import { UserAccessError } from './UserAccessErrors';

describe('space access error contract', () => {
  const userId = 'user-2a1f4c7e';
  const spaceId = 'space-9d3b8e05';

  describe('when a SpaceMembershipRequiredError is constructed', () => {
    const error = new SpaceMembershipRequiredError(userId, spaceId);

    it('exposes the not_found kind', () => {
      expect(error.kind).toBe('not_found');
    });

    it('exposes the space_membership_required reason', () => {
      expect(error.reason).toBe('space_membership_required');
    });

    it('exposes its name', () => {
      expect(error.name).toBe('SpaceMembershipRequiredError');
    });

    it('carries the user id on its context', () => {
      expect(error.context.userId).toBe(userId);
    });

    it('carries the space id on its context', () => {
      expect(error.context.spaceId).toBe(spaceId);
    });

    it('is an Error', () => {
      expect(error).toBeInstanceOf(Error);
    });

    it('is a UserAccessError', () => {
      expect(error).toBeInstanceOf(UserAccessError);
    });

    it('satisfies the DomainError guard', () => {
      expect(isDomainError(error)).toBe(true);
    });

    it('does not name the user in its message', () => {
      expect(error.message).not.toContain(userId);
    });

    it('does not name the space in its message', () => {
      expect(error.message).not.toContain(spaceId);
    });
  });

  describe('when a SpaceAdminRequiredError is constructed', () => {
    const error = new SpaceAdminRequiredError(userId, spaceId);

    it('exposes the forbidden kind', () => {
      expect(error.kind).toBe('forbidden');
    });

    it('exposes the space_admin_required reason', () => {
      expect(error.reason).toBe('space_admin_required');
    });

    it('exposes its name', () => {
      expect(error.name).toBe('SpaceAdminRequiredError');
    });

    it('carries the user id on its context', () => {
      expect(error.context.userId).toBe(userId);
    });

    it('carries the space id on its context', () => {
      expect(error.context.spaceId).toBe(spaceId);
    });

    it('is an Error', () => {
      expect(error).toBeInstanceOf(Error);
    });

    it('is a UserAccessError', () => {
      expect(error).toBeInstanceOf(UserAccessError);
    });

    it('satisfies the DomainError guard', () => {
      expect(isDomainError(error)).toBe(true);
    });

    it('does not name the user in its message', () => {
      expect(error.message).not.toContain(userId);
    });

    it('does not name the space in its message', () => {
      expect(error.message).not.toContain(spaceId);
    });
  });
});
