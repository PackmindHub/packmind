import { createOrganizationId } from './Organization';
import { createUserId } from './User';
import { userFactory } from '../../../test';

describe('User', () => {
  describe('User entity', () => {
    it('creates a valid user with all required fields', () => {
      const organizationId = createOrganizationId(
        '123e4567-e89b-12d3-a456-426614174001',
      );
      const userId = createUserId('123e4567-e89b-12d3-a456-426614174000');
      const user = userFactory({
        id: userId,
        memberships: [
          {
            userId,
            organizationId,
            role: 'admin',
          },
        ],
      });

      expect(user.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(user.email).toBe('testuser@packmind.com');
      expect(user.passwordHash).toBe('hashedpassword123');
      expect(user.active).toBe(true);
      expect(user.memberships).toHaveLength(1);
      expect(user.memberships[0]).toEqual({
        userId,
        organizationId,
        role: 'admin',
      });
    });

    it('creates a user with organization membership', () => {
      const organizationId = createOrganizationId(
        '123e4567-e89b-12d3-a456-426614174001',
      );
      const userId = createUserId('123e4567-e89b-12d3-a456-426614174000');
      const user = userFactory({
        id: userId,
        memberships: [
          {
            userId,
            organizationId,
            role: 'admin',
          },
        ],
      });

      expect(user.memberships).toHaveLength(1);
      expect(user.memberships[0].organizationId).toBe(organizationId);
    });

    it('validates user type structure', () => {
      const organizationId = createOrganizationId(
        '123e4567-e89b-12d3-a456-426614174001',
      );
      const userId = createUserId('123e4567-e89b-12d3-a456-426614174000');
      const user = userFactory({
        id: userId,
        memberships: [
          {
            userId,
            organizationId,
            role: 'admin',
          },
        ],
      });

      expect(typeof user.id).toBe('string');
      expect(typeof user.email).toBe('string');
      expect(
        user.passwordHash === null || typeof user.passwordHash === 'string',
      ).toBe(true);
      expect(typeof user.active).toBe('boolean');
      expect(Array.isArray(user.memberships)).toBe(true);
      expect(user.memberships[0].organizationId).toBe(organizationId);
      expect(user.memberships[0].role).toBe('admin');
    });
  });
});
