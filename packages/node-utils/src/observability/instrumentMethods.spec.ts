import { SpanStatusCode } from '@opentelemetry/api';
import { node } from '@opentelemetry/sdk-node';
import { instrumentComponents, instrumentMethods } from './instrumentMethods';

// A real in-memory provider rather than the no-op tracer the rest of the suite
// runs against: parentage and span names are the whole point of this helper,
// and a non-recording span reports neither.
const exporter = new node.InMemorySpanExporter();

beforeAll(() => {
  new node.NodeTracerProvider({
    spanProcessors: [new node.SimpleSpanProcessor(exporter)],
  }).register();
});

afterEach(() => exporter.reset());

const names = () => exporter.getFinishedSpans().map((span) => span.name);

const spanNamed = (name: string) => {
  const span = exporter.getFinishedSpans().find((it) => it.name === name);
  if (!span) {
    throw new Error(`No span named "${name}" in [${names().join(', ')}]`);
  }
  return span;
};

const isChildOf = (child: string, parent: string) =>
  spanNamed(child).parentSpanContext?.spanId ===
  spanNamed(parent).spanContext().spanId;

describe('instrumentMethods', () => {
  describe('when a class has async methods', () => {
    class Service {
      public getterReads = 0;

      constructor() {
        instrumentMethods(this);
      }

      async outer(): Promise<string> {
        return this.inner();
      }

      async inner(): Promise<string> {
        return this.deeplyPrivate();
      }

      private async deeplyPrivate(): Promise<string> {
        return 'done';
      }

      syncHelper(): string {
        return 'sync';
      }

      get lazy(): string {
        this.getterReads++;
        return 'lazy';
      }
    }

    it('returns the original value', async () => {
      await expect(new Service().outer()).resolves.toBe('done');
    });

    it('names the span after the class and the method', async () => {
      await new Service().outer();

      expect(names()).toContain('Service.outer');
    });

    it('captures private methods', async () => {
      await new Service().outer();

      expect(names()).toContain('Service.deeplyPrivate');
    });

    it('does not read getters while patching', () => {
      expect(new Service().getterReads).toBe(0);
    });

    describe('nesting', () => {
      beforeEach(async () => {
        await new Service().outer();
      });

      it('nests the second call under the first', () => {
        expect(isChildOf('Service.inner', 'Service.outer')).toBe(true);
      });

      it('nests the third call under the second', () => {
        expect(isChildOf('Service.deeplyPrivate', 'Service.inner')).toBe(true);
      });
    });

    describe('when the method is synchronous', () => {
      it('returns the original value', () => {
        expect(new Service().syncHelper()).toBe('sync');
      });

      it('emits no span', () => {
        new Service().syncHelper();

        expect(names()).toEqual([]);
      });
    });
  });

  describe('when the same class is instrumented twice', () => {
    class Twice {
      constructor() {
        instrumentMethods(this);
        instrumentMethods(this);
      }

      async run(): Promise<void> {
        // Nothing to do - the span count is the assertion.
      }
    }

    it('emits one span per call', async () => {
      await new Twice().run();
      await new Twice().run();

      expect(names()).toEqual(['Twice.run', 'Twice.run']);
    });
  });

  describe('when a method is inherited', () => {
    abstract class Base {
      constructor() {
        instrumentMethods(this);
      }

      async fromTheBase(): Promise<void> {
        await this.fromTheChild();
      }

      protected abstract fromTheChild(): Promise<void>;
    }

    class Child extends Base {
      protected override async fromTheChild(): Promise<void> {
        // Nothing to do - the span name is the assertion.
      }
    }

    it('names the span after the concrete class', async () => {
      await new Child().fromTheBase();

      expect(names()).toEqual(['Child.fromTheChild', 'Child.fromTheBase']);
    });

    it('walks the whole prototype chain', async () => {
      await new Child().fromTheBase();

      expect(isChildOf('Child.fromTheChild', 'Child.fromTheBase')).toBe(true);
    });
  });

  describe('when a method is skipped', () => {
    class Skipping {
      constructor() {
        instrumentMethods(this, { skip: ['ignored'] });
      }

      async ignored(): Promise<void> {
        await this.watched();
      }

      async watched(): Promise<void> {
        // Nothing to do - the span names are the assertion.
      }
    }

    it('emits no span for it', async () => {
      await new Skipping().ignored();

      expect(names()).toEqual(['Skipping.watched']);
    });
  });

  describe('when a method rejects', () => {
    const failure = new Error('the method blew up');

    class Failing {
      constructor() {
        instrumentMethods(this);
      }

      async boom(): Promise<void> {
        throw failure;
      }
    }

    it('rethrows the error', async () => {
      await expect(new Failing().boom()).rejects.toThrow(failure);
    });

    it('marks the span as failed', async () => {
      await new Failing()
        .boom()
        .catch(() => undefined /* asserted in the test above */);

      expect(spanNamed('Failing.boom').status).toEqual({
        code: SpanStatusCode.ERROR,
        message: 'the method blew up',
      });
    });
  });
});

describe('instrumentComponents', () => {
  class Collaborator {
    async work(): Promise<void> {
      // Nothing to do - the span name is the assertion.
    }
  }

  it('instruments every instance it is given', async () => {
    const first = new Collaborator();
    const second = new Collaborator();
    instrumentComponents([first, second]);

    await first.work();
    await second.work();

    expect(names()).toEqual(['Collaborator.work', 'Collaborator.work']);
  });
});
