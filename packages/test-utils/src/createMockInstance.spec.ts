import { createMockInstance } from './createMockInstance';

abstract class Repository {
  async findById(id: string): Promise<{ id: string } | null> {
    return { id };
  }

  async deleteById(id: string): Promise<void> {
    void id;
  }

  abstract tableName(): string;
}

class PackageRepo extends Repository {
  override tableName(): string {
    return 'packages';
  }

  async findBySlug(slug: string): Promise<{ slug: string } | null> {
    return { slug };
  }
}

class WithOverride extends Repository {
  override tableName(): string {
    return 'overridden';
  }

  override async findById(): Promise<{ id: string }> {
    return { id: 'from-subclass' };
  }
}

class WithAccessors {
  get name(): string {
    return 'real';
  }

  handle = () => 'arrow field';

  plainMethod(): string {
    return 'method';
  }
}

class WithProbeNames {
  toJSON(): unknown {
    return {};
  }

  save(): void {
    // no-op
  }
}

describe('createMockInstance', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('mocks a method the class declares itself', () => {
    const repo = createMockInstance(PackageRepo);

    expect(jest.isMockFunction(repo.findBySlug)).toBe(true);
  });

  it('mocks a method the class inherits', () => {
    const repo = createMockInstance(PackageRepo);

    expect(jest.isMockFunction(repo.findById)).toBe(true);
  });

  it('records calls made through an inherited method', async () => {
    const repo = createMockInstance(PackageRepo);
    repo.findById.mockResolvedValue({ id: 'pkg-1' });

    await expect(repo.findById('pkg-1')).resolves.toEqual({ id: 'pkg-1' });
    expect(repo.findById).toHaveBeenCalledWith('pkg-1');
  });

  it('answers an inherited method with undefined until it is stubbed', () => {
    const repo = createMockInstance(PackageRepo);

    expect(repo.deleteById('pkg-1')).toBeUndefined();
  });

  describe('when a subclass overrides an inherited method', () => {
    it('mocks it exactly once', () => {
      const repo = createMockInstance(WithOverride);

      expect(jest.isMockFunction(repo.findById)).toBe(true);
    });

    it('leaves the override stubbable', async () => {
      const repo = createMockInstance(WithOverride);
      repo.findById.mockResolvedValue({ id: 'stubbed' });

      await expect(repo.findById()).resolves.toEqual({ id: 'stubbed' });
    });
  });

  it('does not mock Object.prototype members', () => {
    const repo = createMockInstance(PackageRepo);

    expect(jest.isMockFunction(repo.hasOwnProperty)).toBe(false);
  });

  it('does not mock a member the runtime probes', () => {
    const probed = createMockInstance(WithProbeNames);

    expect(jest.isMockFunction(probed.toJSON)).toBe(false);
  });

  it('still mocks the other members of a class that declares a probed name', () => {
    const probed = createMockInstance(WithProbeNames);

    expect(jest.isMockFunction(probed.save)).toBe(true);
  });

  it('skips a getter', () => {
    const withAccessors = createMockInstance(WithAccessors);

    expect(withAccessors.name).toBeUndefined();
  });

  // An arrow-function field is an own property of the instance, so the
  // prototype walk never sees it.
  it('skips an arrow-function class field', () => {
    const withAccessors = createMockInstance(WithAccessors);

    expect(withAccessors.handle).toBeUndefined();
  });

  it('mocks a plain method of the same class', () => {
    const withAccessors = createMockInstance(WithAccessors);

    expect(jest.isMockFunction(withAccessors.plainMethod)).toBe(true);
  });
});
