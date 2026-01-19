import { createOrganizationId } from '@packmind/types';
import { createUserId } from '@packmind/types';
import { userFactory } from '../../../test';

describe('User', () => {
  describe('User entity', () => {
    const organizationId = createOrganizationId(
      '123e4567-e89b-12d3-a456-426614174001',
    );
    const userId = createUserId('123e4567-e89b-12d3-a456-426614174000');

    describe('when created with all required fields', () => {
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

      it('has the correct id', () => {
        expect(user.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      });

      it('has the correct email', () => {
        expect(user.email).toBe('testuser@packmind.com');
      });

      it('has the correct passwordHash', () => {
        expect(user.passwordHash).toBe('hashedpassword123');
      });

      it('has active set to true', () => {
        expect(user.active).toBe(true);
      });

      it('has one membership', () => {
        expect(user.memberships).toHaveLength(1);
      });

      it('has membership with correct properties', () => {
        expect(user.memberships[0]).toEqual({
          userId,
          organizationId,
          role: 'admin',
        });
      });
    });

    describe('when created with organization membership', () => {
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

      it('has one membership', () => {
        expect(user.memberships).toHaveLength(1);
      });

      it('has the correct organizationId', () => {
        expect(user.memberships[0].organizationId).toBe(organizationId);
      });
    });

    describe('when validating type structure', () => {
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

      it('has id as string type', () => {
        expect(typeof user.id).toBe('string');
      });

      it('has email as string type', () => {
        expect(typeof user.email).toBe('string');
      });

      it('has passwordHash as null or string type', () => {
        expect(
          user.passwordHash === null || typeof user.passwordHash === 'string',
        ).toBe(true);
      });

      it('has active as boolean type', () => {
        expect(typeof user.active).toBe('boolean');
      });

      it('has memberships as array', () => {
        expect(Array.isArray(user.memberships)).toBe(true);
      });

      it('has membership with correct organizationId', () => {
        expect(user.memberships[0].organizationId).toBe(organizationId);
      });

      it('has membership with correct role', () => {
        expect(user.memberships[0].role).toBe('admin');
      });
    });
  });
});
