import { createOrganizationId } from './Organization';
import { createUserId } from './User';
import { userFactory } from '../../../test';

describe('User', () => {
  describe('User entity', () => {
    it('creates a valid user with all required fields', () => {
      const user = userFactory({
        id: createUserId('123e4567-e89b-12d3-a456-426614174000'),
        organizationId: createOrganizationId(
          '123e4567-e89b-12d3-a456-426614174001',
        ),
      });

      expect(user.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(user.username).toBe('testuser');
      expect(user.passwordHash).toBe('hashedpassword123');
      expect(user.organizationId).toBe('123e4567-e89b-12d3-a456-426614174001');
    });

    it('creates a user with organization ID', () => {
      const user = userFactory({
        id: createUserId('123e4567-e89b-12d3-a456-426614174000'),
        organizationId: createOrganizationId(
          '123e4567-e89b-12d3-a456-426614174001',
        ),
      });

      expect(user.organizationId).toBe('123e4567-e89b-12d3-a456-426614174001');
    });

    it('validates user type structure', () => {
      const user = userFactory({
        id: createUserId('123e4567-e89b-12d3-a456-426614174000'),
        organizationId: createOrganizationId(
          '123e4567-e89b-12d3-a456-426614174001',
        ),
      });

      expect(typeof user.id).toBe('string');
      expect(typeof user.username).toBe('string');
      expect(typeof user.passwordHash).toBe('string');
      expect(typeof user.organizationId).toBe('string');
    });
  });
});
