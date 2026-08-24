import { withSpan } from './withSpan';

/**
 * Marks a prototype as already patched. `Symbol.for` rather than `Symbol()` so
 * two copies of this module — webpack bundles the API, Jest resolves the
 * source — still recognise each other's work and cannot double-wrap.
 */
const INSTRUMENTED = Symbol.for('packmind.observability.instrumented');

/**
 * The `AsyncFunction` constructor, reached the only way the language exposes
 * it. Compared by identity rather than by `.name`, which a minifier is in
 * principle free to touch.
 */
const AsyncFunction = (async () => {
  /* probe used only for its constructor */
}).constructor;

/**
 * Escape hatch for the span volume this adds — see docker/otel/README.md.
 *
 * Read straight off `process.env` at module load, never through
 * `Configuration.getConfig()`: that is async, and prototypes are patched
 * during construction, long before such a promise would resolve. Same
 * reasoning as the header comment in apps/api/src/otel.ts.
 */
const enabled = process.env['PACKMIND_OTEL_INSTRUMENT_METHODS'] !== 'false';

export type InstrumentMethodsOptions = {
  /** Method names to leave alone. Matched on every prototype in the chain. */
  skip?: readonly string[];
};

/**
 * Give every async method reachable from `instance` its own span.
 *
 * Auto-instrumentation patches known library modules and nothing else, and
 * `withSpan()` only covers call sites somebody remembered to wrap. This walks
 * the prototype chain instead, so a class opts in once — in its constructor —
 * and every method it owns or inherits is captured, public or private alike
 * (TypeScript `private` is erased at runtime).
 *
 * Patching the PROTOTYPE rather than the instance is what makes depth work: a
 * `this.b()` call from inside `this.a()` resolves through the same patched
 * prototype, so nesting continues for as many levels as the call chain has.
 * The alternative — a Proxy around the instance — would change object identity
 * and add a trap to every property read.
 *
 * ## Only async methods
 *
 * A span has to be active WHILE the original runs, or spans created inside it
 * become roots of their own instead of children. So the async/sync decision
 * cannot be deferred until the return value is in hand; it is made here, at
 * patch time, by asking whether the method is a native `AsyncFunction`. Every
 * build path targets es2022 (swc-loader in apps/api/webpack.config.js, and the
 * per-package .swcrc that Jest uses), so `async` is never downlevelled into a
 * generator and the check holds.
 *
 * The cost is that a plain method returning a promise —
 * `list() { return this.repo.find(); }` — is not wrapped. Mark it `async`, or
 * reach for `withSpan()` by hand.
 *
 * Idempotent: a prototype is patched once, however many instances are built.
 */
export function instrumentMethods(
  instance: object,
  options: InstrumentMethodsOptions = {},
): void {
  if (!enabled) {
    return;
  }

  const skip = options.skip ?? [];

  // Stop at Object.prototype: `toString` and friends are not ours to touch.
  let prototype = Object.getPrototypeOf(instance);
  while (prototype && prototype !== Object.prototype) {
    patchPrototype(prototype, skip);
    prototype = Object.getPrototypeOf(prototype);
  }
}

/**
 * `instrumentMethods` for a list of collaborators.
 *
 * The seam for services and repositories, which have no shared base class to
 * hook: their aggregators (`SkillsServices`, `SkillsRepositories` and the
 * like) call this from their constructor. Deliberately takes an explicit list
 * rather than reflecting over the aggregator's fields — those also hold a
 * TypeORM `DataSource`, which must not be patched.
 *
 * Nullish entries are skipped, so an optional collaborator can be listed
 * unconditionally.
 */
export function instrumentComponents(
  instances: readonly (object | null | undefined)[],
  options: InstrumentMethodsOptions = {},
): void {
  for (const instance of instances) {
    if (instance) {
      instrumentMethods(instance, options);
    }
  }
}

function patchPrototype(prototype: object, skip: readonly string[]): void {
  // hasOwnProperty, not `in`: a subclass inherits its parent's marker, and
  // treating that as "already done" would leave the subclass unpatched.
  if (Object.prototype.hasOwnProperty.call(prototype, INSTRUMENTED)) {
    return;
  }

  Object.defineProperty(prototype, INSTRUMENTED, {
    value: true,
    enumerable: false,
    writable: false,
    configurable: false,
  });

  for (const name of Object.getOwnPropertyNames(prototype)) {
    if (name === 'constructor' || skip.includes(name)) {
      continue;
    }

    // Going through the descriptor rather than `prototype[name]` is what keeps
    // getters from being INVOKED here: an accessor descriptor carries `get`
    // and no `value`, so it falls out on the typeof check below.
    const descriptor = Object.getOwnPropertyDescriptor(prototype, name);
    if (!descriptor?.writable || !descriptor.configurable) {
      continue;
    }

    const original = descriptor.value;
    if (
      typeof original !== 'function' ||
      original.constructor !== AsyncFunction
    ) {
      continue;
    }

    Object.defineProperty(prototype, name, {
      ...descriptor,
      value: instrument(original, name),
    });
  }
}

function instrument(
  original: (...args: unknown[]) => Promise<unknown>,
  name: string,
): (...args: unknown[]) => Promise<unknown> {
  function instrumented(this: object, ...args: unknown[]): Promise<unknown> {
    // Resolved per call, not per patch: an inherited AbstractRepository.add
    // has to report as `SkillRepository.add`, naming the class that was
    // actually used rather than the one that happens to declare the method.
    return withSpan(`${this?.constructor?.name}.${name}`, () =>
      original.apply(this, args),
    );
  }

  // The wrapper is a plain function, so it would otherwise be nameless in
  // stack traces. Note this also makes it not an AsyncFunction, which is a
  // second line of defence against double-wrapping.
  Object.defineProperty(instrumented, 'name', {
    value: name,
    configurable: true,
  });

  return instrumented;
}
