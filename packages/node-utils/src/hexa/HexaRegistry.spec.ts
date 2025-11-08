import { HexaRegistry, BaseHexa } from './HexaRegistry';
import { DataSource } from 'typeorm';

// Mock implementation of BaseHexa for testing
class TestHexa extends BaseHexa {
  public destroyCalled = false;

  constructor(registry: HexaRegistry) {
    super(registry);
  }

  getAdapter(): void {
    return undefined;
  }

  destroy(): void {
    this.destroyCalled = true;
  }
}

class AnotherTestHexa extends BaseHexa {
  public destroyCalled = false;

  constructor(registry: HexaRegistry) {
    super(registry);
  }

  getAdapter(): void {
    return undefined;
  }

  destroy(): void {
    this.destroyCalled = true;
  }
}

// Hexa that depends on another hexa for testing cross-hexa dependencies
class DependentHexa extends BaseHexa {
  public destroyCalled = false;
  public dependencyHexa: TestHexa | null = null;
  public dependencyError: Error | null = null;

  constructor(registry: HexaRegistry) {
    super(registry);
    try {
      this.dependencyHexa = registry.get(TestHexa);
    } catch (error) {
      this.dependencyError = error as Error;
    }
  }

  getAdapter(): void {
    return undefined;
  }

  destroy(): void {
    this.destroyCalled = true;
  }

  // Method that uses the dependency
  public useDependency(): string {
    if (!this.dependencyHexa) {
      throw new Error('Dependency not available');
    }
    return 'Using dependency successfully';
  }
}

describe('HexaRegistry', () => {
  let registry: HexaRegistry;
  let mockDataSource: DataSource;

  beforeEach(() => {
    registry = new HexaRegistry();

    // Create a mock DataSource for testing
    mockDataSource = {
      isInitialized: true,
      options: {},
      getRepository: jest.fn(),
    } as unknown as DataSource;
  });

  describe('register', () => {
    it('registers an hexa type successfully', () => {
      expect(() => registry.register(TestHexa)).not.toThrow();
      expect(registry.isRegistered(TestHexa)).toBe(true);
    });

    describe('when registering hexa with duplicate constructor', () => {
      it('throws error', () => {
        registry.register(TestHexa);

        expect(() => registry.register(TestHexa)).toThrow(
          'Hexa TestHexa already registered',
        );
      });
    });

    describe('when registering after initialization', () => {
      it('throws error', () => {
        registry.register(TestHexa);
        registry.init(mockDataSource);

        expect(() => registry.register(AnotherTestHexa)).toThrow(
          'Cannot register hexas after initialization',
        );
      });
    });
  });

  describe('init', () => {
    it('initializes all registered hexas with DataSource', () => {
      registry.register(TestHexa);
      registry.register(AnotherTestHexa);

      expect(() => registry.init(mockDataSource)).not.toThrow();
      expect(registry.initialized).toBe(true);
    });

    describe('when called twice', () => {
      it('throws error', () => {
        registry.register(TestHexa);
        registry.init(mockDataSource);

        expect(() => registry.init(mockDataSource)).toThrow(
          'Registry already initialized',
        );
      });
    });

    it('works with no registered hexas', () => {
      expect(() => registry.init(mockDataSource)).not.toThrow();
      expect(registry.initialized).toBe(true);
    });

    describe('when DataSource is not provided', () => {
      it('throws error', () => {
        registry.register(TestHexa);

        expect(() => registry.init(null as unknown as DataSource)).toThrow(
          'DataSource is required for initialization',
        );
      });
    });
  });

  describe('get', () => {
    it('returns initialized hexa successfully', () => {
      registry.register(TestHexa);
      registry.init(mockDataSource);

      const hexa = registry.get(TestHexa);

      expect(hexa).toBeInstanceOf(TestHexa);
    });

    describe('when getting hexa before initialization', () => {
      it('throws error', () => {
        registry.register(TestHexa);

        expect(() => registry.get(TestHexa)).toThrow(
          'Registry not initialized. Call init() first.',
        );
      });
    });

    describe('when getting unregistered hexa', () => {
      it('throws error', () => {
        registry.init(mockDataSource);

        expect(() => registry.get(TestHexa)).toThrow(
          'Hexa TestHexa not registered',
        );
      });
    });
  });

  describe('getDataSource', () => {
    it('returns the DataSource after initialization', () => {
      registry.init(mockDataSource);

      const dataSource = registry.getDataSource();

      expect(dataSource).toBe(mockDataSource);
    });

    it('throws error before initialization', () => {
      expect(() => registry.getDataSource()).toThrow(
        'Registry not initialized. Call init() with a DataSource first.',
      );
    });
  });

  describe('isRegistered', () => {
    it('returns true for registered hexas', () => {
      registry.register(TestHexa);

      expect(registry.isRegistered(TestHexa)).toBe(true);
    });

    it('returns false for unregistered hexas', () => {
      expect(registry.isRegistered(AnotherTestHexa)).toBe(false);
    });
  });

  describe('destroyAll', () => {
    it('calls destroy on all initialized hexas', () => {
      registry.register(TestHexa);
      registry.register(AnotherTestHexa);
      registry.init(mockDataSource);

      const hexa1 = registry.get(TestHexa);
      const hexa2 = registry.get(AnotherTestHexa);

      registry.destroyAll();

      expect(hexa1.destroyCalled).toBe(true);
      expect(hexa2.destroyCalled).toBe(true);
      expect(registry.initialized).toBe(false);
    });

    it('allows re-initialization after destroy', () => {
      registry.register(TestHexa);
      registry.init(mockDataSource);
      registry.destroyAll();

      expect(() => registry.init(mockDataSource)).not.toThrow();
      expect(registry.initialized).toBe(true);
    });

    it('works with no initialized hexas', () => {
      expect(() => registry.destroyAll()).not.toThrow();
    });
  });

  describe('reset', () => {
    it('clears all registrations and hexas', () => {
      registry.register(TestHexa);
      registry.init(mockDataSource);

      registry.reset();

      expect(registry.isRegistered(TestHexa)).toBe(false);
      expect(registry.initialized).toBe(false);
    });

    it('allows fresh registration after reset', () => {
      registry.register(TestHexa);
      registry.init(mockDataSource);
      registry.reset();

      expect(() => registry.register(TestHexa)).not.toThrow();
      expect(() => registry.register(AnotherTestHexa)).not.toThrow();
    });
  });

  describe('cross-hexa dependencies', () => {
    it('allows hexas to access other hexas during construction', () => {
      registry.register(TestHexa);
      registry.register(DependentHexa);
      registry.init(mockDataSource);

      const testHexa = registry.get(TestHexa);
      const dependentHexa = registry.get(DependentHexa);

      expect(dependentHexa.dependencyHexa).toBe(testHexa);
      expect(dependentHexa.dependencyError).toBeNull();
    });

    it('allows hexas to use dependencies immediately after initialization', () => {
      registry.register(TestHexa);
      registry.register(DependentHexa);
      registry.init(mockDataSource);

      const testHexa = registry.get(TestHexa);
      const dependentHexa = registry.get(DependentHexa);

      const result = dependentHexa.useDependency();

      expect(result).toBe('Using dependency successfully');
      expect(dependentHexa.dependencyHexa).toBe(testHexa);
    });

    describe('when dependency is not registered', () => {
      it('captures error during construction', () => {
        registry.register(DependentHexa);
        registry.init(mockDataSource);

        const dependentHexa = registry.get(DependentHexa);

        expect(dependentHexa.dependencyHexa).toBeNull();
        expect(dependentHexa.dependencyError).toEqual(
          new Error('Hexa TestHexa not registered'),
        );
      });
    });

    describe('when dependency is registered after dependent hexa', () => {
      it('fails to find dependency due to registration order', () => {
        registry.register(DependentHexa);
        registry.register(TestHexa);
        registry.init(mockDataSource);

        const dependentHexa = registry.get(DependentHexa);

        expect(dependentHexa.dependencyHexa).toBeNull();
        expect(dependentHexa.dependencyError).toEqual(
          new Error(
            'Hexa TestHexa is registered but not yet instantiated. Ensure dependencies are registered in the correct order.',
          ),
        );
      });
    });
  });

  describe('integration workflow', () => {
    it('supports full deferred initialization workflow', () => {
      registry.register(TestHexa);
      registry.register(AnotherTestHexa);

      expect(registry.isRegistered(TestHexa)).toBe(true);
      expect(registry.isRegistered(AnotherTestHexa)).toBe(true);
      expect(registry.initialized).toBe(false);

      registry.init(mockDataSource);
      expect(registry.initialized).toBe(true);

      const accountsHexa = registry.get(TestHexa);
      const recipesHexa = registry.get(AnotherTestHexa);

      expect(accountsHexa).toBeInstanceOf(TestHexa);
      expect(recipesHexa).toBeInstanceOf(AnotherTestHexa);

      registry.destroyAll();

      expect(accountsHexa.destroyCalled).toBe(true);
      expect(recipesHexa.destroyCalled).toBe(true);
      expect(registry.initialized).toBe(false);
    });
  });
});
