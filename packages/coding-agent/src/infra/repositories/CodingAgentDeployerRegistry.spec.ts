import { CodingAgentDeployerRegistry } from './CodingAgentDeployerRegistry';
import { CodingAgent } from '../../domain/CodingAgents';
import { ICodingAgentDeployer } from '../../domain/repository/ICodingAgentDeployer';
import { FileUpdates } from '@packmind/types';

// Mock deployer for testing
class MockDeployer implements ICodingAgentDeployer {
  async deployRecipes(): Promise<FileUpdates> {
    return { createOrUpdate: [], delete: [] };
  }

  async deployStandards(): Promise<FileUpdates> {
    return { createOrUpdate: [], delete: [] };
  }

  async generateFileUpdatesForRecipes(): Promise<FileUpdates> {
    return { createOrUpdate: [], delete: [] };
  }

  async generateFileUpdatesForStandards(): Promise<FileUpdates> {
    return { createOrUpdate: [], delete: [] };
  }

  async deployArtifacts(): Promise<FileUpdates> {
    return { createOrUpdate: [], delete: [] };
  }
}

describe('CodingAgentDeployerRegistry', () => {
  let registry: CodingAgentDeployerRegistry;

  beforeEach(() => {
    registry = new CodingAgentDeployerRegistry();
  });

  describe('getDeployer', () => {
    it('creates and returns PackmindDeployer for packmind agent', () => {
      const deployer = registry.getDeployer('packmind');
      expect(deployer).toBeDefined();

      // Should return the same instance on subsequent calls
      const deployer2 = registry.getDeployer('packmind');
      expect(deployer2).toBe(deployer);
    });

    it('creates and returns JunieDeployer for junie agent', () => {
      const deployer = registry.getDeployer('junie');
      expect(deployer).toBeDefined();

      // Should return the same instance on subsequent calls
      const deployer2 = registry.getDeployer('junie');
      expect(deployer2).toBe(deployer);
    });

    it('throws error for unknown agent', () => {
      expect(() => {
        registry.getDeployer('unknown' as CodingAgent);
      }).toThrow('Unknown coding agent: unknown');
    });
  });

  describe('registerDeployer', () => {
    it('registers custom deployer', () => {
      const mockDeployer = new MockDeployer();

      registry.registerDeployer('packmind', mockDeployer);
      const retrievedDeployer = registry.getDeployer('packmind');

      expect(retrievedDeployer).toBe(mockDeployer);
    });

    it('overrides existing deployer', () => {
      const firstDeployer = registry.getDeployer('packmind');
      const mockDeployer = new MockDeployer();

      registry.registerDeployer('packmind', mockDeployer);
      const newDeployer = registry.getDeployer('packmind');

      expect(newDeployer).toBe(mockDeployer);
      expect(newDeployer).not.toBe(firstDeployer);
    });
  });

  describe('hasDeployer', () => {
    it('returns true for supported agents', () => {
      expect(registry.hasDeployer('packmind')).toBe(true);
      expect(registry.hasDeployer('junie')).toBe(true);
    });

    it('returns true for registered agents', () => {
      const mockDeployer = new MockDeployer();
      registry.registerDeployer('packmind', mockDeployer);

      expect(registry.hasDeployer('packmind')).toBe(true);
    });

    it('returns false for unknown agents', () => {
      expect(registry.hasDeployer('unknown' as CodingAgent)).toBe(false);
    });
  });
});
