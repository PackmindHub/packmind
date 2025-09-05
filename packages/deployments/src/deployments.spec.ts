import {
  RecipesDeployment,
  StandardsDeployment,
  UserId,
  OrganizationId,
  createRecipesDeploymentId,
  createStandardsDeploymentId,
} from '@packmind/shared';
import { DEPLOYMENTS_VERSION } from './index';

describe('@packmind/deployments', () => {
  describe('DEPLOYMENTS_VERSION', () => {
    it('exports version constant', () => {
      expect(DEPLOYMENTS_VERSION).toBe('0.0.1');
      expect(typeof DEPLOYMENTS_VERSION).toBe('string');
    });
  });

  describe('RecipesDeployment types', () => {
    it('exports RecipesDeploymentId type and factory', () => {
      const id = createRecipesDeploymentId(
        '12345678-1234-1234-1234-123456789012',
      );
      expect(typeof id).toBe('string');
      expect(id).toBe('12345678-1234-1234-1234-123456789012');
    });

    it('supports RecipesDeployment interface', () => {
      const deployment: RecipesDeployment = {
        id: createRecipesDeploymentId('12345678-1234-1234-1234-123456789012'),
        recipeVersions: [],
        gitRepos: [],
        gitCommits: [],
        createdAt: new Date().toISOString(),
        authorId: 'author-123' as UserId,
        organizationId: 'org-123' as OrganizationId,
      };

      expect(deployment.id).toBeDefined();
      expect(Array.isArray(deployment.recipeVersions)).toBe(true);
      expect(Array.isArray(deployment.gitRepos)).toBe(true);
      expect(Array.isArray(deployment.gitCommits)).toBe(true);
      expect(typeof deployment.createdAt).toBe('string');
    });
  });

  describe('StandardsDeployment types', () => {
    it('exports StandardsDeploymentId type and factory', () => {
      const id = createStandardsDeploymentId(
        '87654321-4321-4321-4321-210987654321',
      );
      expect(typeof id).toBe('string');
      expect(id).toBe('87654321-4321-4321-4321-210987654321');
    });

    it('supports StandardsDeployment interface', () => {
      const deployment: StandardsDeployment = {
        id: createStandardsDeploymentId('87654321-4321-4321-4321-210987654321'),
        standardVersions: [],
        gitRepos: [],
        gitCommits: [],
        createdAt: new Date().toISOString(),
        authorId: 'author-123' as UserId,
        organizationId: 'org-123' as OrganizationId,
      };

      expect(deployment.id).toBeDefined();
      expect(Array.isArray(deployment.standardVersions)).toBe(true);
      expect(Array.isArray(deployment.gitRepos)).toBe(true);
      expect(Array.isArray(deployment.gitCommits)).toBe(true);
      expect(typeof deployment.createdAt).toBe('string');
    });
  });
});
