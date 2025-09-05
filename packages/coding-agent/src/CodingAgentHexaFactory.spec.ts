import { CodingAgentHexaFactory } from './CodingAgentHexaFactory';

describe('CodingAgentHexaFactory', () => {
  let factory: CodingAgentHexaFactory;

  beforeEach(() => {
    factory = new CodingAgentHexaFactory();
  });

  describe('constructor', () => {
    it('initializes successfully', () => {
      expect(factory).toBeDefined();
      expect(factory.useCases).toBeDefined();
    });

    it('creates use cases', () => {
      expect(factory.useCases.prepareRecipesDeployment).toBeDefined();
      expect(factory.useCases.prepareStandardsDeployment).toBeDefined();
    });
  });

  describe('getDeployerRegistry', () => {
    it('returns deployer registry', () => {
      const registry = factory.getDeployerRegistry();

      expect(registry).toBeDefined();
      expect(registry.getDeployer).toBeDefined();
      expect(registry.registerDeployer).toBeDefined();
      expect(registry.hasDeployer).toBeDefined();
    });

    it('returns same registry instance', () => {
      const registry1 = factory.getDeployerRegistry();
      const registry2 = factory.getDeployerRegistry();

      expect(registry1).toBe(registry2);
    });
  });

  describe('integration', () => {
    it('has working deployer for packmind agent', () => {
      const registry = factory.getDeployerRegistry();

      expect(registry.hasDeployer('packmind')).toBe(true);

      const deployer = registry.getDeployer('packmind');
      expect(deployer).toBeDefined();
      expect(deployer.deployRecipes).toBeDefined();
      expect(deployer.deployStandards).toBeDefined();
    });

    it('has working deployer for junie agent', () => {
      const registry = factory.getDeployerRegistry();

      expect(registry.hasDeployer('junie')).toBe(true);

      const deployer = registry.getDeployer('junie');
      expect(deployer).toBeDefined();
      expect(deployer.deployRecipes).toBeDefined();
      expect(deployer.deployStandards).toBeDefined();
    });
  });
});
