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
  let result: Awaited<ReturnType<PackmindGateway['getGlobalSpace']>>;

  beforeEach(async () => {
    global.fetch = jest.fn();
    gateway = new PackmindGateway(createTestApiKey());
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ id: 'space-uuid', slug: 'global' }),
    });

    result = await gateway.getGlobalSpace();
  });

  it('returns space id and slug', () => {
    expect(result).toEqual({ id: 'space-uuid', slug: 'global' });
  });

  it('calls the correct API endpoint', () => {
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/spaces/global'),
      expect.any(Object),
    );
  });
});

describe('PackmindGateway.createStandard', () => {
  let gateway: PackmindGateway;
  let result: Awaited<ReturnType<PackmindGateway['createStandard']>>;

  beforeEach(async () => {
    global.fetch = jest.fn();
    gateway = new PackmindGateway(createTestApiKey());
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest
        .fn()
        .mockResolvedValue({ id: 'std-123', name: 'Test Standard' }),
    });

    result = await gateway.createStandard('space-1', {
      name: 'Test Standard',
      description: 'Desc',
      scope: 'test',
      rules: [{ content: 'Rule 1' }],
    });
  });

  it('returns the created standard', () => {
    expect(result).toEqual({ id: 'std-123', name: 'Test Standard' });
  });

  it('calls the correct API endpoint with POST', () => {
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/spaces/space-1/standards'),
      expect.objectContaining({ method: 'POST' }),
    );
  });
});

describe('PackmindGateway.getRulesForStandard', () => {
  let gateway: PackmindGateway;
  let result: Awaited<ReturnType<PackmindGateway['getRulesForStandard']>>;
  const mockRules = [
    { id: 'rule-1', content: 'Rule 1' },
    { id: 'rule-2', content: 'Rule 2' },
  ];

  beforeEach(async () => {
    global.fetch = jest.fn();
    gateway = new PackmindGateway(createTestApiKey());
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue(mockRules),
    });

    result = await gateway.getRulesForStandard('space-1', 'std-1');
  });

  it('returns rules for a standard', () => {
    expect(result).toEqual(mockRules);
  });

  it('calls the correct API endpoint', () => {
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/spaces/space-1/standards/std-1/rules'),
      expect.any(Object),
    );
  });
});

describe('PackmindGateway.addExampleToRule', () => {
  let gateway: PackmindGateway;

  beforeEach(async () => {
    global.fetch = jest.fn();
    gateway = new PackmindGateway(createTestApiKey());
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ id: 'example-1' }),
    });

    await gateway.addExampleToRule('space-1', 'std-1', 'rule-1', {
      language: 'TYPESCRIPT',
      positive: 'const x = 1;',
      negative: 'var x = 1;',
    });
  });

  it('calls the correct API endpoint with POST', () => {
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(
        '/spaces/space-1/standards/std-1/rules/rule-1/examples',
      ),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('sends example with correct payload', () => {
    const callArgs = (global.fetch as jest.Mock).mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body).toEqual({
      lang: 'TYPESCRIPT',
      positive: 'const x = 1;',
      negative: 'var x = 1;',
    });
  });
});
