import { HexaRegistry } from './HexaRegistry';
import { BaseHexa, BaseHexaOpts } from './BaseHexa';
import { DataSource } from 'typeorm';

// Mock implementation of BaseHexa for testing
class TestHexa extends BaseHexa {
  public destroyCalled = false;

  constructor(dataSource: DataSource, opts?: Partial<BaseHexaOpts>) {
    super(dataSource, opts);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async initialize(_registry: HexaRegistry): Promise<void> {
    // No adapters needed
  }

  getAdapter(): void {
    return undefined;
  }

  getPortName(): string {
    throw new Error('TestHexa does not expose a port adapter');
  }

  destroy(): void {
    this.destroyCalled = true;
  }
}

class AnotherTestHexa extends BaseHexa {
  public destroyCalled = false;

  constructor(dataSource: DataSource, opts?: Partial<BaseHexaOpts>) {
    super(dataSource, opts);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async initialize(_registry: HexaRegistry): Promise<void> {
    // No adapters needed
  }

  getAdapter(): void {
    return undefined;
  }

  getPortName(): string {
    throw new Error('AnotherTestHexa does not expose a port adapter');
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

  constructor(dataSource: DataSource, opts?: Partial<BaseHexaOpts>) {
    super(dataSource, opts);
  }

  async initialize(registry: HexaRegistry): Promise<void> {
    try {
      this.dependencyHexa = registry.get(TestHexa);
    } catch (error) {
      this.dependencyError = error as Error;
    }
  }

  getAdapter(): void {
    return undefined;
  }

  getPortName(): string {
    throw new Error('DependentHexa does not expose a port adapter');
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
    describe('when registering an hexa type', () => {
      beforeEach(() => {
        registry.register(TestHexa);
      });

      it('does not throw', () => {
        expect(registry.isRegistered(TestHexa)).toBe(true);
      });

      it('marks hexa as registered', () => {
        expect(registry.isRegistered(TestHexa)).toBe(true);
      });
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
      it('throws error', async () => {
        registry.register(TestHexa);
        await registry.init(mockDataSource);

        expect(() => registry.register(AnotherTestHexa)).toThrow(
          'Cannot register hexas after initialization',
        );
      });
    });
  });

  describe('init', () => {
    describe('when initializing with registered hexas', () => {
      beforeEach(async () => {
        registry.register(TestHexa);
        registry.register(AnotherTestHexa);
        await registry.init(mockDataSource);
      });

      it('marks registry as initialized', () => {
        expect(registry.initialized).toBe(true);
      });
    });

    describe('when called twice', () => {
      it('throws error', async () => {
        registry.register(TestHexa);
        await registry.init(mockDataSource);

        await expect(registry.init(mockDataSource)).rejects.toThrow(
          'Registry already initialized',
        );
      });
    });

    describe('when called with no registered hexas', () => {
      beforeEach(async () => {
        await registry.init(mockDataSource);
      });

      it('marks registry as initialized', () => {
        expect(registry.initialized).toBe(true);
      });
    });

    describe('when DataSource is not provided', () => {
      it('throws error', async () => {
        registry.register(TestHexa);

        await expect(
          registry.init(null as unknown as DataSource),
        ).rejects.toThrow('DataSource is required for initialization');
      });
    });
  });

  describe('get', () => {
    it('returns initialized hexa successfully', async () => {
      registry.register(TestHexa);
      await registry.init(mockDataSource);

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
      it('throws error', async () => {
        await registry.init(mockDataSource);

        expect(() => registry.get(TestHexa)).toThrow(
          'Hexa TestHexa not registered',
        );
      });
    });
  });

  describe('getDataSource', () => {
    it('returns the DataSource after initialization', async () => {
      await registry.init(mockDataSource);

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
    describe('when destroying all initialized hexas', () => {
      let hexa1: TestHexa;
      let hexa2: AnotherTestHexa;

      beforeEach(async () => {
        registry.register(TestHexa);
        registry.register(AnotherTestHexa);
        await registry.init(mockDataSource);

        hexa1 = registry.get(TestHexa);
        hexa2 = registry.get(AnotherTestHexa);

        registry.destroyAll();
      });

      it('calls destroy on first hexa', () => {
        expect(hexa1.destroyCalled).toBe(true);
      });

      it('calls destroy on second hexa', () => {
        expect(hexa2.destroyCalled).toBe(true);
      });

      it('marks registry as not initialized', () => {
        expect(registry.initialized).toBe(false);
      });
    });

    describe('when re-initializing after destroy', () => {
      beforeEach(async () => {
        registry.register(TestHexa);
        await registry.init(mockDataSource);
        registry.destroyAll();
        await registry.init(mockDataSource);
      });

      it('marks registry as initialized', () => {
        expect(registry.initialized).toBe(true);
      });
    });

    it('works with no initialized hexas', () => {
      expect(() => registry.destroyAll()).not.toThrow();
    });
  });

  describe('reset', () => {
    describe('when resetting after initialization', () => {
      beforeEach(async () => {
        registry.register(TestHexa);
        await registry.init(mockDataSource);
        registry.reset();
      });

      it('clears all registrations', () => {
        expect(registry.isRegistered(TestHexa)).toBe(false);
      });

      it('marks registry as not initialized', () => {
        expect(registry.initialized).toBe(false);
      });
    });

    describe('when registering after reset', () => {
      beforeEach(async () => {
        registry.register(TestHexa);
        await registry.init(mockDataSource);
        registry.reset();
      });

      it('allows registering previously registered hexa', () => {
        expect(() => registry.register(TestHexa)).not.toThrow();
      });

      it('allows registering new hexa', () => {
        expect(() => registry.register(AnotherTestHexa)).not.toThrow();
      });
    });
  });

  describe('cross-hexa dependencies', () => {
    describe('when hexas access other hexas during initialization', () => {
      let testHexa: TestHexa;
      let dependentHexa: DependentHexa;

      beforeEach(async () => {
        registry.register(TestHexa);
        registry.register(DependentHexa);
        await registry.init(mockDataSource);

        testHexa = registry.get(TestHexa);
        dependentHexa = registry.get(DependentHexa);
      });

      it('resolves dependency hexa', () => {
        expect(dependentHexa.dependencyHexa).toBe(testHexa);
      });

      it('does not capture error', () => {
        expect(dependentHexa.dependencyError).toBeNull();
      });
    });

    describe('when hexas use dependencies immediately after initialization', () => {
      let testHexa: TestHexa;
      let dependentHexa: DependentHexa;
      let result: string;

      beforeEach(async () => {
        registry.register(TestHexa);
        registry.register(DependentHexa);
        await registry.init(mockDataSource);

        testHexa = registry.get(TestHexa);
        dependentHexa = registry.get(DependentHexa);

        result = dependentHexa.useDependency();
      });

      it('returns success message', () => {
        expect(result).toBe('Using dependency successfully');
      });

      it('has resolved dependency', () => {
        expect(dependentHexa.dependencyHexa).toBe(testHexa);
      });
    });

    describe('when dependency is not registered', () => {
      let dependentHexa: DependentHexa;

      beforeEach(async () => {
        registry.register(DependentHexa);
        await registry.init(mockDataSource);

        dependentHexa = registry.get(DependentHexa);
      });

      it('has null dependency hexa', () => {
        expect(dependentHexa.dependencyHexa).toBeNull();
      });

      it('captures error', () => {
        expect(dependentHexa.dependencyError).toEqual(
          new Error('Hexa TestHexa not registered'),
        );
      });
    });

    describe('when dependency is registered after dependent hexa', () => {
      let dependentHexa: DependentHexa;

      beforeEach(async () => {
        registry.register(DependentHexa);
        registry.register(TestHexa);
        await registry.init(mockDataSource);

        dependentHexa = registry.get(DependentHexa);
      });

      it('resolves dependency during initialization', () => {
        // Dependencies are resolved during initialize(), so order doesn't matter
        expect(dependentHexa.dependencyHexa).toBeInstanceOf(TestHexa);
      });

      it('does not capture error', () => {
        expect(dependentHexa.dependencyError).toBeNull();
      });
    });
  });

  describe('integration workflow', () => {
    describe('when registering hexas', () => {
      beforeEach(() => {
        registry.register(TestHexa);
        registry.register(AnotherTestHexa);
      });

      it('marks TestHexa as registered', () => {
        expect(registry.isRegistered(TestHexa)).toBe(true);
      });

      it('marks AnotherTestHexa as registered', () => {
        expect(registry.isRegistered(AnotherTestHexa)).toBe(true);
      });

      it('keeps registry not initialized', () => {
        expect(registry.initialized).toBe(false);
      });
    });

    describe('when initializing registry', () => {
      beforeEach(async () => {
        registry.register(TestHexa);
        registry.register(AnotherTestHexa);
        await registry.init(mockDataSource);
      });

      it('marks registry as initialized', () => {
        expect(registry.initialized).toBe(true);
      });

      it('returns TestHexa instance', () => {
        expect(registry.get(TestHexa)).toBeInstanceOf(TestHexa);
      });

      it('returns AnotherTestHexa instance', () => {
        expect(registry.get(AnotherTestHexa)).toBeInstanceOf(AnotherTestHexa);
      });
    });

    describe('when destroying all hexas', () => {
      let accountsHexa: TestHexa;
      let recipesHexa: AnotherTestHexa;

      beforeEach(async () => {
        registry.register(TestHexa);
        registry.register(AnotherTestHexa);
        await registry.init(mockDataSource);

        accountsHexa = registry.get(TestHexa);
        recipesHexa = registry.get(AnotherTestHexa);

        registry.destroyAll();
      });

      it('calls destroy on TestHexa', () => {
        expect(accountsHexa.destroyCalled).toBe(true);
      });

      it('calls destroy on AnotherTestHexa', () => {
        expect(recipesHexa.destroyCalled).toBe(true);
      });

      it('marks registry as not initialized', () => {
        expect(registry.initialized).toBe(false);
      });
    });
  });
});
