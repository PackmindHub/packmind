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

describe('PackmindGateway standard operations', () => {
  let gateway: PackmindGateway;

  beforeEach(() => {
    global.fetch = jest.fn();
    gateway = new PackmindGateway(createTestApiKey());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createStandardInSpace', () => {
    it('makes POST request to standards endpoint', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest
          .fn()
          .mockResolvedValue({ id: 'std-123', name: 'Test Standard' }),
      });

      await gateway.createStandardInSpace('space-uuid', {
        name: 'Test Standard',
        description: 'Desc',
        scope: 'test',
        rules: [{ content: 'Rule 1' }],
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/spaces/space-uuid/standards'),
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('returns standard id and name', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest
          .fn()
          .mockResolvedValue({ id: 'std-123', name: 'Test Standard' }),
      });

      const result = await gateway.createStandardInSpace('space-uuid', {
        name: 'Test Standard',
        description: 'Desc',
        scope: 'test',
        rules: [{ content: 'Rule 1' }],
      });

      expect(result).toEqual({ id: 'std-123', name: 'Test Standard' });
    });
  });

  describe('getRulesForStandard', () => {
    it('makes GET request to rules endpoint', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest
          .fn()
          .mockResolvedValue([{ id: 'rule-1', content: 'Rule 1' }]),
      });

      await gateway.getRulesForStandard('space-uuid', 'std-123');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/standards/std-123/rules'),
        expect.any(Object),
      );
    });

    it('returns rules array', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue([
          { id: 'rule-1', content: 'Rule 1' },
          { id: 'rule-2', content: 'Rule 2' },
        ]),
      });

      const result = await gateway.getRulesForStandard('space-uuid', 'std-123');

      expect(result).toEqual([
        { id: 'rule-1', content: 'Rule 1' },
        { id: 'rule-2', content: 'Rule 2' },
      ]);
    });
  });

  describe('addExampleToRule', () => {
    it('makes POST request to examples endpoint', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ id: 'example-1' }),
      });

      await gateway.addExampleToRule('space-uuid', 'std-123', 'rule-1', {
        language: 'TYPESCRIPT',
        positive: 'const x = 1;',
        negative: 'var x = 1;',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/rules/rule-1/examples'),
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('sends example data with lang field', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ id: 'example-1' }),
      });

      await gateway.addExampleToRule('space-uuid', 'std-123', 'rule-1', {
        language: 'TYPESCRIPT',
        positive: 'const x = 1;',
        negative: 'var x = 1;',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            lang: 'TYPESCRIPT',
            positive: 'const x = 1;',
            negative: 'var x = 1;',
          }),
        }),
      );
    });
  });
});
