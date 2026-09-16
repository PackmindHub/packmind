import { mockInterface, UnstubbedCallError } from './mockInterface';

interface IExample {
  findById(id: string): Promise<{ id: string } | null>;
  save(value: { id: string }): Promise<void>;
}

interface IWithData {
  findById(id: string): Promise<{ id: string } | null>;
  name: string;
}

interface IWithOptionalMethod {
  close?(): void;
}

const iterate = Symbol('iterate');

interface IWithSymbolMethod {
  [iterate](): string[];
}

interface IWithOptionalExcludedMethods {
  [iterate]?(): string[];
  toJSON?(): unknown;
}

interface IWithOptionalData {
  name?: string;
}

// A data member has no mock to fall back on, so the signature demands it.
// @ts-expect-error 'name' is missing
const rejectsMissingData = () => mockInterface<IWithData>({});
void rejectsMissingData;

// Even an optional one: the proxy would answer the name with a jest.fn().
// @ts-expect-error 'name' is missing
const rejectsMissingOptionalData = () => mockInterface<IWithOptionalData>({});
void rejectsMissingOptionalData;

// A symbol-keyed member is never auto-mocked, so it is demanded the same way.
// @ts-expect-error the symbol member is missing
const rejectsMissingSymbol = () => mockInterface<IWithSymbolMethod>({});
void rejectsMissingSymbol;

describe('mockInterface', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns the same mock on every access', () => {
    const port = mockInterface<IExample>();

    expect(port.findById).toBe(port.findById);
  });

  it('records the calls made through the port', async () => {
    const port = mockInterface<IExample>();

    await port.save({ id: 'id' });

    expect(port.save).toHaveBeenCalledWith({ id: 'id' });
  });

  describe('when a member is stubbed with an implementation', () => {
    it('resolves the value the implementation returns', async () => {
      const port = mockInterface<IExample>({
        findById: async () => ({ id: 'stubbed' }),
      });

      await expect(port.findById('id')).resolves.toEqual({ id: 'stubbed' });
    });

    it('still records the calls', async () => {
      const port = mockInterface<IExample>({
        findById: async () => ({ id: 'stubbed' }),
      });

      await port.findById('id');

      expect(port.findById).toHaveBeenCalledWith('id');
    });
  });

  describe('when a member is stubbed with a mock', () => {
    it('keeps the mock as provided', () => {
      const findById = jest.fn().mockResolvedValue(null);
      const port = mockInterface<IExample>({ findById });

      expect(port.findById).toBe(findById);
    });
  });

  describe('when a member is stubbed after construction', () => {
    it('resolves the configured value', async () => {
      const port = mockInterface<IExample>();
      port.findById.mockResolvedValue({ id: 'configured' });

      await expect(port.findById('id')).resolves.toEqual({ id: 'configured' });
    });
  });

  describe('when the port carries a member that is not a method', () => {
    it('keeps the value it was given', () => {
      const port = mockInterface<IWithData>({ name: 'a name' });

      expect(port.name).toBe('a name');
    });

    it('still records the calls made to the methods around it', async () => {
      const port = mockInterface<IWithData>({ name: 'a name' });

      await port.findById('id');

      expect(port.findById).toHaveBeenCalledWith('id');
    });
  });

  describe('when the port declares an optional method', () => {
    it('takes an implementation for it', () => {
      const port = mockInterface<IWithOptionalMethod>({
        close: () => undefined,
      });

      port.close?.();

      expect(port.close).toHaveBeenCalled();
    });

    describe('when it is left out', () => {
      it('mocks it anyway', () => {
        const port = mockInterface<IWithOptionalMethod>();

        port.close?.();

        expect(port.close).toHaveBeenCalled();
      });
    });
  });

  describe('when the port declares a symbol-keyed method', () => {
    it('records the calls made through the member it was given', () => {
      const port = mockInterface<IWithSymbolMethod>({
        [iterate]: () => [],
      });

      port[iterate]();

      expect(port[iterate]).toHaveBeenCalled();
    });
  });

  describe('when the methods it leaves alone are optional on the port', () => {
    it('asks for nothing', () => {
      const port = mockInterface<IWithOptionalExcludedMethods>();

      expect(port[iterate]).toBeUndefined();
    });

    it('leaves the probe-named one alone too', () => {
      const port = mockInterface<IWithOptionalExcludedMethods>();

      expect(port.toJSON).toBeUndefined();
    });
  });

  describe('when the mock is strict', () => {
    it('refuses a call to a member that was never stubbed', () => {
      const port = mockInterface<IExample>({}, { strict: true });

      expect(() => port.findById('id')).toThrow(UnstubbedCallError);
    });

    it('names the member it refused', () => {
      const port = mockInterface<IExample>({}, { strict: true });

      expect(() => port.findById('id')).toThrow(
        new UnstubbedCallError('findById'),
      );
    });

    it('lets a member seeded up front through', async () => {
      const port = mockInterface<IExample>(
        { findById: async () => ({ id: 'seeded' }) },
        { strict: true },
      );

      await expect(port.findById('id')).resolves.toEqual({ id: 'seeded' });
    });

    it('lets a member stubbed afterwards through', async () => {
      const port = mockInterface<IExample>({}, { strict: true });
      port.findById.mockResolvedValue({ id: 'stubbed' });

      await expect(port.findById('id')).resolves.toEqual({ id: 'stubbed' });
    });

    it('still lets an unstubbed member be asserted on', () => {
      const port = mockInterface<IExample>({}, { strict: true });

      expect(port.findById).not.toHaveBeenCalled();
    });
  });

  describe('when the mock is awaited', () => {
    it('does not behave as a thenable', async () => {
      const port = mockInterface<IExample>();

      await expect(Promise.resolve(port)).resolves.toBe(port);
    });
  });
});
