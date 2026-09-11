import { mockPort } from './mockPort';

interface ITestPort {
  findById(id: string): Promise<{ id: string } | null>;
  save(value: { id: string }): Promise<void>;
  name: string;
}

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

  describe('when the mock is awaited', () => {
    it('does not behave as a thenable', async () => {
      const port = mockPort<ITestPort>();

      await expect(Promise.resolve(port)).resolves.toBe(port);
    });
  });
});
