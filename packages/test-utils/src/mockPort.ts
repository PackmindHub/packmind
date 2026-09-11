/**
 * Members that must never be answered with a `jest.fn()`. The runtime probes
 * some of them on any object it is handed - `await` looks for `then`,
 * pretty-format looks for `toJSON` and `$$typeof`, `expect` looks for
 * `asymmetricMatch` - and a mock answering them makes the port look like a
 * thenable or breaks the failure output.
 */
const NEVER_MOCKED = [
  'then',
  'catch',
  'finally',
  'toJSON',
  'toString',
  'valueOf',
  'inspect',
  'constructor',
  'asymmetricMatch',
  '$$typeof',
  'nodeType',
  'hasOwnProperty',
  'isPrototypeOf',
  'propertyIsEnumerable',
] as const;

type NeverMockedName = (typeof NEVER_MOCKED)[number];

const neverMocked: ReadonlySet<string> = new Set(NEVER_MOCKED);

type MethodKeys<T> = {
  [K in keyof T]-?: NonNullable<T[K]> extends (...args: never[]) => unknown
    ? K
    : never;
}[keyof T];

/**
 * The members a `jest.fn()` can stand in for without being asked: the methods
 * the proxy is free to answer. A symbol-keyed member is not one of them - the
 * runtime probes symbols such as `Symbol.iterator` on any object, so answering
 * them would make the mock claim behaviour the port never declared - and nor is
 * a member named after one of the probes above.
 */
type AutoMockedKeys<T> = Exclude<MethodKeys<T> & string, NeverMockedName>;

/** Methods the proxy leaves alone: the symbol-keyed and probe-named ones. */
type ExcludedMethodKeys<T> = Exclude<MethodKeys<T>, AutoMockedKeys<T>>;

type DataKeys<T> = Exclude<keyof T, MethodKeys<T>>;

/**
 * An auto-mocked method can be seeded either with a real implementation - which
 * is type checked against the port and wrapped in a `jest.fn()` - or with a mock
 * built by hand, and may be left out entirely.
 *
 * An excluded method may be left out too when the port declares it optional -
 * `Pick` carries that optionality over, and the `undefined` the proxy answers
 * with is exactly what such a port allows.
 *
 * A data member is always demanded, optional on the port or not. The proxy has
 * only the member's name to go on, so an absent one would be answered with a
 * `jest.fn()` - a function standing where the port declares a value, which is
 * the very lie this helper exists to avoid.
 */
export type PortStubs<T> = Partial<{
  [K in AutoMockedKeys<T>]: NonNullable<T[K]> extends (
    ...args: infer A
  ) => infer R
    ? NonNullable<T[K]> | jest.Mock<R, A>
    : never;
}> &
  Pick<T, ExcludedMethodKeys<T>> &
  Required<Pick<T, DataKeys<T>>>;

export type MockPortOptions = {
  /**
   * Make a member that was never stubbed throw when it is called, rather than
   * answer `undefined`.
   *
   * A complete mock is quiet by default: the day the code under test starts
   * calling a member this spec never set up, the call returns `undefined` and
   * the test may well still pass. Strict mode trades that for a loud failure
   * naming the member - at the cost of having to stub every member the run
   * actually reaches.
   *
   * Beware `jest.resetAllMocks()` and `resetMocks` in a jest config: both drop
   * the implementation behind a mock, the refusal included, which puts the
   * member back to answering `undefined`.
   */
  strict?: boolean;
};

type PortStubsArgs<T> =
  Record<never, never> extends PortStubs<T>
    ? [stubs?: PortStubs<T>, options?: MockPortOptions]
    : [stubs: PortStubs<T>, options?: MockPortOptions];

type UnknownFunction = (...args: unknown[]) => unknown;

function refuseUnstubbedCall(member: string): UnknownFunction {
  return () => {
    throw new Error(
      `mockPort: '${member}' was called but was never stubbed. Stub it, or drop the strict option if answering undefined is what this test wants.`,
    );
  };
}

function isJestMock(value: unknown): boolean {
  return (
    typeof value === 'function' &&
    (value as { _isMockFunction?: boolean })._isMockFunction === true
  );
}

/**
 * Typed mock of an interface, the counterpart of `createMockInstance` for ports
 * that have no class to walk at runtime.
 *
 * Every member is lazily backed by a `jest.fn()`, so the mock is complete by
 * construction and never needs an `as unknown as jest.Mocked<T>` cast - which
 * would switch off the structural checks the spec type check relies on. Stubs
 * are typed against the port, so a fixture that drifts from the contract fails
 * the build:
 *
 * ```ts
 * const gitRepo = mockPort<IGitRepo>();
 * gitRepo.getFileOnRepo.mockResolvedValue({ sha: 'sha', content: 'content' });
 *
 * // or seed implementations up front
 * const accounts = mockPort<IAccountsPort>({
 *   getUserById: async () => user,
 * });
 * ```
 *
 * It fits ports whose members are all plainly named methods. Anything the proxy
 * cannot conjure - a data member such as an `AxiosInstance`'s `defaults`, a
 * symbol-keyed method, a method named after one of the probes above - has to be
 * supplied, and a type whose shape is mostly data is better mocked by hand.
 *
 * Pass `{ strict: true }` to make an unstubbed member refuse the call instead of
 * answering `undefined`:
 *
 * ```ts
 * const gitRepo = mockPort<IGitRepo>({}, { strict: true });
 * ```
 */
export function mockPort<T extends object>(
  ...args: PortStubsArgs<T>
): jest.Mocked<T> {
  const [stubs = {} as PortStubs<T>, options = {}] = args;
  const members = new Map<string | symbol, unknown>();

  const isAutoMocked = (member: string | symbol): boolean =>
    typeof member === 'string' && !neverMocked.has(member);

  for (const name of Reflect.ownKeys(stubs)) {
    const stub = (stubs as Record<string | symbol, unknown>)[name];
    members.set(
      name,
      typeof stub === 'function' && !isJestMock(stub)
        ? jest.fn(stub as UnknownFunction)
        : stub,
    );
  }

  return new Proxy({} as jest.Mocked<T>, {
    get(_target, member) {
      if (members.has(member)) {
        return members.get(member);
      }
      if (!isAutoMocked(member)) {
        return undefined;
      }
      members.set(
        member,
        options.strict
          ? jest.fn(refuseUnstubbedCall(member as string))
          : jest.fn(),
      );
      return members.get(member);
    },
    set(_target, member, value) {
      members.set(member, value);
      return true;
    },
    has(_target, member) {
      return members.has(member) || isAutoMocked(member);
    },
    ownKeys() {
      return [...members.keys()];
    },
    getOwnPropertyDescriptor(_target, member) {
      if (!members.has(member)) {
        return undefined;
      }
      return {
        configurable: true,
        enumerable: true,
        value: members.get(member),
      };
    },
  });
}
