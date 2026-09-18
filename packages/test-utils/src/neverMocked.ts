/**
 * Members that must never be answered with a `jest.fn()`. The runtime probes
 * some of them on any object it is handed - `await` looks for `then`,
 * pretty-format looks for `toJSON` and `$$typeof`, `expect` looks for
 * `asymmetricMatch` - and a mock answering them makes the mock look like a
 * thenable or breaks the failure output.
 *
 * Shared by `mockInterface` and `createMockInstance` so a mock of a class and a
 * mock of an interface leave the same members alone.
 */
export const NEVER_MOCKED = [
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

export type NeverMockedName = (typeof NEVER_MOCKED)[number];

export const neverMocked: ReadonlySet<string> = new Set(NEVER_MOCKED);
