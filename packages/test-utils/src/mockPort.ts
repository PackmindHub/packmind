/**
 * Members that must never be answered with a `jest.fn()`. The runtime probes
 * some of them on any object it is handed - `await` looks for `then`,
 * pretty-format looks for `toJSON` and `$$typeof`, `expect` looks for
 * `asymmetricMatch` - and a mock answering them makes the port look like a
 * thenable or breaks the failure output.
 */
const NEVER_MOCKED: ReadonlySet<string> = new Set([
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
]);

type MethodKeys<T> = {
  [K in keyof T]-?: NonNullable<T[K]> extends (...args: never[]) => unknown
    ? K
    : never;
}[keyof T];

type DataKeys<T> = Exclude<keyof T, MethodKeys<T>>;

/**
 * A method can be seeded either with a real implementation - which is type
 * checked against the port and wrapped in a `jest.fn()` - or with a mock built
 * by hand, and may be left out entirely.
 *
 * A member that is *not* a method has to be given: nothing sensible can be
 * conjured for it, since the proxy cannot tell a data member from a method at
 * runtime and would hand out a `jest.fn()` where the port declares a value.
 */
export type PortStubs<T> = Partial<{
  [K in MethodKeys<T>]: T[K] extends (...args: infer A) => infer R
    ? T[K] | jest.Mock<R, A>
    : never;
}> & { [K in DataKeys<T>]: T[K] };

type PortStubsArgs<T> = [DataKeys<T>] extends [never]
  ? [stubs?: PortStubs<T>]
  : [stubs: PortStubs<T>];

type UnknownFunction = (...args: unknown[]) => unknown;

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
 * It fits ports whose members are all methods. A type that also carries data -
 * an `AxiosInstance` and its `defaults`, say - has to have those members
 * supplied, and one whose shape is mostly data is better mocked by hand.
 */
export function mockPort<T extends object>(
  ...args: PortStubsArgs<T>
): jest.Mocked<T> {
  const [stubs = {} as PortStubs<T>] = args;
  const members = new Map<string, unknown>();

  const isMockable = (member: string | symbol): member is string =>
    typeof member === 'string' && !NEVER_MOCKED.has(member);

  for (const [name, stub] of Object.entries(stubs)) {
    members.set(
      name,
      typeof stub === 'function' && !isJestMock(stub)
        ? jest.fn(stub as UnknownFunction)
        : stub,
    );
  }

  return new Proxy({} as jest.Mocked<T>, {
    get(_target, member) {
      if (!isMockable(member)) {
        return undefined;
      }
      if (!members.has(member)) {
        members.set(member, jest.fn());
      }
      return members.get(member);
    },
    set(_target, member, value) {
      if (isMockable(member)) {
        members.set(member, value);
      }
      return true;
    },
    has(_target, member) {
      return isMockable(member);
    },
    ownKeys() {
      return [...members.keys()];
    },
    getOwnPropertyDescriptor(_target, member) {
      if (!isMockable(member)) {
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
