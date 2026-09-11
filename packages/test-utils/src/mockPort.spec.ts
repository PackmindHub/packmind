import { mockPort } from './mockPort';

interface ITestPort {
  findById(id: string): Promise<{ id: string } | null>;
  save(value: { id: string }): Promise<void>;
}

interface IPortWithData {
  findById(id: string): Promise<{ id: string } | null>;
  name: string;
}

interface IPortWithOptionalMethod {
  close?(): void;
}

const iterate = Symbol('iterate');

interface IPortWithSymbolMethod {
  [iterate](): string[];
}

// A data member has no mock to fall back on, so the signature demands it.
// @ts-expect-error 'name' is missing
const rejectsAMissingDataMember = () => mockPort<IPortWithData>({});
void rejectsAMissingDataMember;

// A symbol-keyed member is never auto-mocked, so it is demanded the same way.
// @ts-expect-error the symbol member is missing
const rejectsAMissingSymbolMember = () => mockPort<IPortWithSymbolMethod>({});
void rejectsAMissingSymbolMember;

describe('mockPort', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('backs every member with a jest mock', () => {
    const port = mockPort<ITestPort>();

    expect(jest.isMockFunction(port.findById)).toBe(true);
  });

  it('returns the same mock on every access', () => {
    const port = mockPort<ITestPort>();

    expect(port.findById).toBe(port.findById);
  });

  it('records the calls made through the port', async () => {
    const port = mockPort<ITestPort>();

    await port.save({ id: 'id' });

    expect(port.save).toHaveBeenCalledWith({ id: 'id' });
  });

  describe('when a member is stubbed with an implementation', () => {
    it('resolves the value the implementation returns', async () => {
      const port = mockPort<ITestPort>({
        findById: async () => ({ id: 'stubbed' }),
      });

      await expect(port.findById('id')).resolves.toEqual({ id: 'stubbed' });
    });

    it('still records the calls', async () => {
      const port = mockPort<ITestPort>({
        findById: async () => ({ id: 'stubbed' }),
      });

      await port.findById('id');

      expect(port.findById).toHaveBeenCalledWith('id');
    });
  });

  describe('when a member is stubbed with a mock', () => {
    it('keeps the mock as provided', () => {
      const findById = jest.fn().mockResolvedValue(null);
      const port = mockPort<ITestPort>({ findById });

      expect(port.findById).toBe(findById);
    });
  });

  describe('when a member is stubbed after construction', () => {
    it('resolves the configured value', async () => {
      const port = mockPort<ITestPort>();
      port.findById.mockResolvedValue({ id: 'configured' });

      await expect(port.findById('id')).resolves.toEqual({ id: 'configured' });
    });
  });

  describe('when the port carries a member that is not a method', () => {
    it('keeps the value it was given', () => {
      const port = mockPort<IPortWithData>({ name: 'a name' });

      expect(port.name).toBe('a name');
    });

    it('still mocks the methods around it', () => {
      const port = mockPort<IPortWithData>({ name: 'a name' });

      expect(jest.isMockFunction(port.findById)).toBe(true);
    });
  });

  describe('when the port declares an optional method', () => {
    it('takes an implementation for it', () => {
      const port = mockPort<IPortWithOptionalMethod>({
        close: () => undefined,
      });

      port.close?.();

      expect(port.close).toHaveBeenCalled();
    });

    it('mocks it even when it is left out', () => {
      const port = mockPort<IPortWithOptionalMethod>();

      expect(jest.isMockFunction(port.close)).toBe(true);
    });
  });

  describe('when the port declares a symbol-keyed method', () => {
    it('records the calls made through the member it was given', () => {
      const port = mockPort<IPortWithSymbolMethod>({ [iterate]: () => [] });

      port[iterate]();

      expect(port[iterate]).toHaveBeenCalled();
    });
  });

  describe('when the mock is awaited', () => {
    it('does not behave as a thenable', async () => {
      const port = mockPort<ITestPort>();

      await expect(Promise.resolve(port)).resolves.toBe(port);
    });
  });
});
