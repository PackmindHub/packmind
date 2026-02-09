import { CodingAgentDeployerRegistry } from './CodingAgentDeployerRegistry';
import { ICodingAgentDeployer } from '../../domain/repository/ICodingAgentDeployer';
import { CodingAgent, FileUpdates } from '@packmind/types';

// Mock deployer for testing
class MockDeployer implements ICodingAgentDeployer {
  async deployRecipes(): Promise<FileUpdates> {
    return { createOrUpdate: [], delete: [] };
  }

  async deployStandards(): Promise<FileUpdates> {
    return { createOrUpdate: [], delete: [] };
  }

  async deploySkills(): Promise<FileUpdates> {
    return { createOrUpdate: [], delete: [] };
  }

  async generateFileUpdatesForRecipes(): Promise<FileUpdates> {
    return { createOrUpdate: [], delete: [] };
  }

  async generateFileUpdatesForStandards(): Promise<FileUpdates> {
    return { createOrUpdate: [], delete: [] };
  }

  async generateFileUpdatesForSkills(): Promise<FileUpdates> {
    return { createOrUpdate: [], delete: [] };
  }

  async generateRemovalFileUpdates(): Promise<FileUpdates> {
    return { createOrUpdate: [], delete: [] };
  }

  async generateAgentCleanupFileUpdates(): Promise<FileUpdates> {
    return { createOrUpdate: [], delete: [] };
  }

  async deployArtifacts(): Promise<FileUpdates> {
    return { createOrUpdate: [], delete: [] };
  }

  getSkillsFolderPath(): string | undefined {
    return undefined;
  }
}

describe('CodingAgentDeployerRegistry', () => {
  let registry: CodingAgentDeployerRegistry;

  beforeEach(() => {
    registry = new CodingAgentDeployerRegistry();
  });

  describe('getDeployer', () => {
    describe('when getting packmind deployer', () => {
      it('returns a defined deployer', () => {
        const deployer = registry.getDeployer('packmind');

        expect(deployer).toBeDefined();
      });

      it('returns the same instance on subsequent calls', () => {
        const deployer = registry.getDeployer('packmind');
        const deployer2 = registry.getDeployer('packmind');

        expect(deployer2).toBe(deployer);
      });
    });

    describe('when getting junie deployer', () => {
      it('returns a defined deployer', () => {
        const deployer = registry.getDeployer('junie');

        expect(deployer).toBeDefined();
      });

      it('returns the same instance on subsequent calls', () => {
        const deployer = registry.getDeployer('junie');
        const deployer2 = registry.getDeployer('junie');

        expect(deployer2).toBe(deployer);
      });
    });

    describe('when getting unknown agent', () => {
      it('throws an error', () => {
        expect(() => {
          registry.getDeployer('unknown' as CodingAgent);
        }).toThrow('Unknown coding agent: unknown');
      });
    });
  });

  describe('registerDeployer', () => {
    it('registers custom deployer', () => {
      const mockDeployer = new MockDeployer();

      registry.registerDeployer('packmind', mockDeployer);
      const retrievedDeployer = registry.getDeployer('packmind');

      expect(retrievedDeployer).toBe(mockDeployer);
    });

    describe('when overriding existing deployer', () => {
      let firstDeployer: ICodingAgentDeployer;
      let mockDeployer: MockDeployer;
      let newDeployer: ICodingAgentDeployer;

      beforeEach(() => {
        firstDeployer = registry.getDeployer('packmind');
        mockDeployer = new MockDeployer();

        registry.registerDeployer('packmind', mockDeployer);
        newDeployer = registry.getDeployer('packmind');
      });

      it('returns the new deployer', () => {
        expect(newDeployer).toBe(mockDeployer);
      });

      it('does not return the first deployer', () => {
        expect(newDeployer).not.toBe(firstDeployer);
      });
    });
  });

  describe('hasDeployer', () => {
    describe('when checking supported agents', () => {
      it('returns true for packmind agent', () => {
        expect(registry.hasDeployer('packmind')).toBe(true);
      });

      it('returns true for junie agent', () => {
        expect(registry.hasDeployer('junie')).toBe(true);
      });
    });

    describe('when checking registered agents', () => {
      it('returns true for registered agent', () => {
        const mockDeployer = new MockDeployer();
        registry.registerDeployer('packmind', mockDeployer);

        expect(registry.hasDeployer('packmind')).toBe(true);
      });
    });

    describe('when checking unknown agents', () => {
      it('returns false', () => {
        expect(registry.hasDeployer('unknown' as CodingAgent)).toBe(false);
      });
    });
  });
});
