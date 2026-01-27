import { PackmindGateway } from './PackmindGateway';

const createTestApiKey = () => {
  const jwt = Buffer.from(
    JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
  ).toString('base64');
  const payload = Buffer.from(
    JSON.stringify({
      organization: { id: 'org-123', name: 'Test Org' },
      iat: Date.now(),
      exp: Date.now() + 3600000,
    }),
  ).toString('base64');
  const signature = 'test-signature';
  const fullJwt = `${jwt}.${payload}.${signature}`;

  return Buffer.from(
    JSON.stringify({
      host: 'http://localhost:4200',
      jwt: fullJwt,
    }),
  ).toString('base64');
};

describe('PackmindGateway.createStandard', () => {
  let gateway: PackmindGateway;

  beforeEach(() => {
    global.fetch = jest.fn();
    gateway = new PackmindGateway(createTestApiKey());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when creating standard without examples', () => {
    let result: Awaited<ReturnType<PackmindGateway['createStandard']>>;

    beforeEach(async () => {
      // Mock getGlobalSpace
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ id: 'space-uuid', slug: 'global' }),
      });
      // Mock createStandard
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest
          .fn()
          .mockResolvedValue({ id: 'std-123', name: 'Test Standard' }),
      });

      result = await gateway.createStandard({
        name: 'Test Standard',
        description: 'Desc',
        scope: 'test',
        rules: [{ content: 'Rule 1' }],
      });
    });

    it('returns standard id and name', () => {
      expect(result).toEqual({ id: 'std-123', name: 'Test Standard' });
    });

    it('calls getGlobalSpace first', () => {
      expect(global.fetch).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('/spaces/global'),
        expect.any(Object),
      );
    });

    it('calls createStandard with POST', () => {
      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('/standards'),
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('does not fetch rules or add examples', () => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('when creating standard with examples', () => {
    beforeEach(async () => {
      // Mock getGlobalSpace
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ id: 'space-uuid', slug: 'global' }),
      });
      // Mock createStandard
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ id: 'std-123', name: 'Test' }),
      });
      // Mock getRulesForStandard
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest
          .fn()
          .mockResolvedValue([{ id: 'rule-1', content: 'Rule 1' }]),
      });
      // Mock addExampleToRule
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ id: 'example-1' }),
      });

      await gateway.createStandard({
        name: 'Test',
        description: 'Desc',
        scope: 'test',
        rules: [
          {
            content: 'Rule 1',
            examples: {
              language: 'TYPESCRIPT',
              positive: 'const x = 1;',
              negative: 'var x = 1;',
            },
          },
        ],
      });
    });

    it('fetches rules after creating standard', () => {
      expect(global.fetch).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('/standards/std-123/rules'),
        expect.any(Object),
      );
    });

    it('adds example to rule', () => {
      expect(global.fetch).toHaveBeenNthCalledWith(
        4,
        expect.stringContaining('/rules/rule-1/examples'),
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  describe('when example creation fails', () => {
    it('still returns success', async () => {
      // Mock getGlobalSpace
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ id: 'space-uuid', slug: 'global' }),
      });
      // Mock createStandard
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ id: 'std-123', name: 'Test' }),
      });
      // Mock getRulesForStandard
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest
          .fn()
          .mockResolvedValue([{ id: 'rule-1', content: 'Rule 1' }]),
      });
      // Mock addExampleToRule - FAILS
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const result = await gateway.createStandard({
        name: 'Test',
        description: 'Desc',
        scope: 'test',
        rules: [
          {
            content: 'Rule 1',
            examples: {
              language: 'TYPESCRIPT',
              positive: 'good',
              negative: 'bad',
            },
          },
        ],
      });

      expect(result).toEqual({ id: 'std-123', name: 'Test' });
    });
  });
});
