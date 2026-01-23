import { PackmindGateway } from './PackmindGateway';

// Shared helper for creating test API keys
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

describe('PackmindGateway.getGlobalSpace', () => {
  let gateway: PackmindGateway;

  beforeEach(() => {
    global.fetch = jest.fn();
    gateway = new PackmindGateway(createTestApiKey());
  });

  it('returns space id and slug', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ id: 'space-uuid', slug: 'global' }),
    });

    const result = await gateway.getGlobalSpace();

    expect(result).toEqual({ id: 'space-uuid', slug: 'global' });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/spaces/global'),
      expect.any(Object),
    );
  });
});

describe('PackmindGateway.createStandard', () => {
  let gateway: PackmindGateway;

  beforeEach(() => {
    global.fetch = jest.fn();
    gateway = new PackmindGateway(createTestApiKey());
  });

  it('creates standard via API', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest
        .fn()
        .mockResolvedValue({ id: 'std-123', name: 'Test Standard' }),
    });

    const result = await gateway.createStandard('space-1', {
      name: 'Test Standard',
      description: 'Desc',
      scope: 'test',
      rules: [{ content: 'Rule 1' }],
    });

    expect(result).toEqual({ id: 'std-123', name: 'Test Standard' });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/spaces/space-1/standards'),
      expect.objectContaining({ method: 'POST' }),
    );
  });
});

describe('PackmindGateway.getRulesForStandard', () => {
  let gateway: PackmindGateway;

  beforeEach(() => {
    global.fetch = jest.fn();
    gateway = new PackmindGateway(createTestApiKey());
  });

  it('returns rules for a standard', async () => {
    const mockRules = [
      { id: 'rule-1', content: 'Rule 1' },
      { id: 'rule-2', content: 'Rule 2' },
    ];
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue(mockRules),
    });

    const result = await gateway.getRulesForStandard('space-1', 'std-1');

    expect(result).toEqual(mockRules);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/spaces/space-1/standards/std-1/rules'),
      expect.any(Object),
    );
  });
});

describe('PackmindGateway.addExampleToRule', () => {
  let gateway: PackmindGateway;

  beforeEach(() => {
    global.fetch = jest.fn();
    gateway = new PackmindGateway(createTestApiKey());
  });

  it('sends example with correct payload', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ id: 'example-1' }),
    });

    await gateway.addExampleToRule('space-1', 'std-1', 'rule-1', {
      language: 'TYPESCRIPT',
      positive: 'const x = 1;',
      negative: 'var x = 1;',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(
        '/spaces/space-1/standards/std-1/rules/rule-1/examples',
      ),
      expect.objectContaining({ method: 'POST' }),
    );
    const callArgs = (global.fetch as jest.Mock).mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body).toEqual({
      lang: 'TYPESCRIPT',
      positive: 'const x = 1;',
      negative: 'var x = 1;',
    });
  });
});
