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

  it('mocks a method the class declares itself', async () => {
    const repo = createMockInstance(PackageRepo);

    await repo.findBySlug('a-slug');

    expect(repo.findBySlug).toHaveBeenCalledWith('a-slug');
  });

  it('mocks a method the class inherits', async () => {
    const repo = createMockInstance(PackageRepo);

    await repo.findById('pkg-1');

    expect(repo.findById).toHaveBeenCalledWith('pkg-1');
  });

  describe('when an inherited method is stubbed and called', () => {
    let repo: jest.Mocked<PackageRepo>;

    beforeEach(() => {
      repo = createMockInstance(PackageRepo);
      repo.findById.mockResolvedValue({ id: 'pkg-1' });
    });

    it('answers the stubbed value', async () => {
      await expect(repo.findById('pkg-1')).resolves.toEqual({ id: 'pkg-1' });
    });

    it('records the call', async () => {
      await repo.findById('pkg-1');

      expect(repo.findById).toHaveBeenCalledWith('pkg-1');
    });
  });

  it('answers an inherited method with undefined until it is stubbed', () => {
    const repo = createMockInstance(PackageRepo);

    expect(repo.deleteById('pkg-1')).toBeUndefined();
  });

  describe('when a subclass overrides an inherited method', () => {
    it('mocks the override rather than the base', async () => {
      const repo = createMockInstance(WithOverride);

      await repo.findById();

      expect(repo.findById).toHaveBeenCalledTimes(1);
    });

    it('leaves the override stubbable', async () => {
      const repo = createMockInstance(WithOverride);
      repo.findById.mockResolvedValue({ id: 'stubbed' });

      await expect(repo.findById()).resolves.toEqual({ id: 'stubbed' });
    });
  });

  // `toLocaleString` is on `Object.prototype` and not in the probe list, so a
  // walk that failed to stop would answer it with a `jest.fn()` returning
  // undefined.
  it('leaves Object.prototype members working', () => {
    const repo = createMockInstance(PackageRepo);

    expect(repo.toLocaleString()).toBe('[object Object]');
  });

  it('does not mock a member the runtime probes', () => {
    const probed = createMockInstance(WithProbeNames);

    expect(probed.toJSON).toBeUndefined();
  });

  it('still mocks the other members of a class that declares a probed name', () => {
    const probed = createMockInstance(WithProbeNames);

    probed.save();

    expect(probed.save).toHaveBeenCalled();
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

    withAccessors.plainMethod();

    expect(withAccessors.plainMethod).toHaveBeenCalled();
  });
});
