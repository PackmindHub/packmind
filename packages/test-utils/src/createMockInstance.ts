import Mocked = jest.Mocked;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Constructor<T> = new (...args: any[]) => T;

export function createMockInstance<T>(cls: Constructor<T>): jest.Mocked<T> {
  const obj = {} as jest.Mocked<T>;
  for (const key of Object.getOwnPropertyNames(cls.prototype)) {
    if (key === 'constructor') continue;
    const descriptor = Object.getOwnPropertyDescriptor(cls.prototype, key);
    if (descriptor && typeof descriptor.value === 'function') {
      obj[key as keyof T] = jest.fn() as Mocked<T>[keyof T];
    }
  }
  return obj;
}
