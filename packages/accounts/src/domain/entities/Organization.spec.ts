import { createOrganizationId } from '@packmind/types';
import { organizationFactory } from '../../../test';

describe('Organization', () => {
  describe('when creating with required fields', () => {
    const organization = organizationFactory({
      id: createOrganizationId('123e4567-e89b-12d3-a456-426614174000'),
    });

    it('assigns the provided id', () => {
      expect(organization.id).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('assigns the default name', () => {
      expect(organization.name).toBe('Test Organization');
    });

    it('assigns the default slug', () => {
      expect(organization.slug).toBe('test-organization');
    });
  });

  describe('when validating type structure', () => {
    const organization = organizationFactory({
      id: createOrganizationId('123e4567-e89b-12d3-a456-426614174000'),
    });

    it('has id as string type', () => {
      expect(typeof organization.id).toBe('string');
    });

    it('has name as string type', () => {
      expect(typeof organization.name).toBe('string');
    });

    it('has slug as string type', () => {
      expect(typeof organization.slug).toBe('string');
    });
  });

  describe('when creating with custom names and slugs', () => {
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

    it('assigns custom name to first organization', () => {
      expect(organization1.name).toBe('Tech Corp');
    });

    it('assigns custom slug to first organization', () => {
      expect(organization1.slug).toBe('tech-corp');
    });

    it('assigns custom name to second organization', () => {
      expect(organization2.name).toBe('Marketing Inc');
    });

    it('assigns custom slug to second organization', () => {
      expect(organization2.slug).toBe('marketing-inc');
    });

    it('generates unique ids for different organizations', () => {
      expect(organization1.id).not.toBe(organization2.id);
    });
  });
});
