import { createOrganizationId } from './Organization';
import { organizationFactory } from '../../../test';

describe('Organization', () => {
  describe('Organization entity', () => {
    it('creates a valid organization with all required fields', () => {
      const organization = organizationFactory({
        id: createOrganizationId('123e4567-e89b-12d3-a456-426614174000'),
      });

      expect(organization.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(organization.name).toBe('Test Organization');
      expect(organization.slug).toBe('test-organization');
    });

    it('validates organization type structure', () => {
      const organization = organizationFactory({
        id: createOrganizationId('123e4567-e89b-12d3-a456-426614174000'),
      });

      expect(typeof organization.id).toBe('string');
      expect(typeof organization.name).toBe('string');
      expect(typeof organization.slug).toBe('string');
    });

    it('creates organization with different names and slugs', () => {
      const organization1 = organizationFactory({
        id: createOrganizationId('123e4567-e89b-12d3-a456-426614174000'),
        name: 'Tech Corp',
        slug: 'tech-corp',
      });

      const organization2 = organizationFactory({
        id: createOrganizationId('123e4567-e89b-12d3-a456-426614174001'),
        name: 'Marketing Inc',
        slug: 'marketing-inc',
      });

      expect(organization1.name).toBe('Tech Corp');
      expect(organization1.slug).toBe('tech-corp');
      expect(organization2.name).toBe('Marketing Inc');
      expect(organization2.slug).toBe('marketing-inc');
      expect(organization1.id).not.toBe(organization2.id);
    });
  });
});
