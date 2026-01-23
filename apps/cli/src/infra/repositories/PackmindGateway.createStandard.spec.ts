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

describe('PackmindGateway.createStandardFromPlaybook', () => {
  let gateway: PackmindGateway;

  beforeEach(() => {
    global.fetch = jest.fn();
    gateway = new PackmindGateway(createTestApiKey());
  });

  describe('when creating a standard from playbook via API', () => {
    let result: Awaited<
      ReturnType<PackmindGateway['createStandardFromPlaybook']>
    >;

    beforeEach(async () => {
      const playbook = {
        name: 'Test Standard',
        description: 'Test description',
        scope: 'Test scope',
        rules: [
          {
            content: 'Use something',
          },
        ],
      };

      // Mock the space resolution call
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          id: 'space-uuid-123',
          slug: 'global',
        }),
      });

      // Mock the standard creation call
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          id: 'std-123',
          name: 'Test Standard',
        }),
      });

      result = await gateway.createStandardFromPlaybook(playbook);
    });

    it('returns success', () => {
      expect(result.success).toBe(true);
    });

    it('returns the standard id', () => {
      expect(result.standardId).toBe('std-123');
    });

    it('returns the standard name', () => {
      expect(result.name).toBe('Test Standard');
    });

    it('calls fetch twice for space and standard creation', () => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('when creating examples for rules that have them', () => {
    let result: Awaited<
      ReturnType<PackmindGateway['createStandardFromPlaybook']>
    >;
    let exampleCall: [string, RequestInit];

    beforeEach(async () => {
      const playbook = {
        name: 'Test Standard',
        description: 'Test description',
        scope: 'Test scope',
        rules: [
          {
            content: 'Use something',
            examples: {
              positive: 'const x = 1;',
              negative: 'var x = 1;',
              language: 'TYPESCRIPT',
            },
          },
        ],
      };

      // Mock the space resolution call
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          id: 'space-uuid-123',
          slug: 'global',
        }),
      });

      // Mock the standard creation call
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          id: 'std-123',
          name: 'Test Standard',
        }),
      });

      // Mock the rules fetch call
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest
          .fn()
          .mockResolvedValue([{ id: 'rule-1', content: 'Use something' }]),
      });

      // Mock the example creation call
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          id: 'example-1',
        }),
      });

      result = await gateway.createStandardFromPlaybook(playbook);
      exampleCall = (global.fetch as jest.Mock).mock.calls[3];
    });

    it('returns success', () => {
      expect(result.success).toBe(true);
    });

    it('returns the standard id', () => {
      expect(result.standardId).toBe('std-123');
    });

    it('calls fetch four times for space, standard, rules, and example', () => {
      expect(global.fetch).toHaveBeenCalledTimes(4);
    });

    it('calls the example creation endpoint with the rule id', () => {
      expect(exampleCall[0]).toContain('/rules/rule-1/examples');
    });

    it('sends the example data in the request body', () => {
      expect(JSON.parse(exampleCall[1].body as string)).toEqual({
        lang: 'TYPESCRIPT',
        positive: 'const x = 1;',
        negative: 'var x = 1;',
      });
    });
  });

  describe('when space resolution fails', () => {
    let result: Awaited<
      ReturnType<PackmindGateway['createStandardFromPlaybook']>
    >;

    beforeEach(async () => {
      const playbook = {
        name: 'Test',
        description: 'Test',
        scope: 'Test',
        rules: [{ content: 'Use something' }],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      result = await gateway.createStandardFromPlaybook(playbook);
    });

    it('returns failure', () => {
      expect(result.success).toBe(false);
    });

    it('returns error message about space resolution', () => {
      expect(result.error).toContain('Failed to resolve global space');
    });
  });

  describe('when standard creation fails', () => {
    let result: Awaited<
      ReturnType<PackmindGateway['createStandardFromPlaybook']>
    >;

    beforeEach(async () => {
      const playbook = {
        name: 'Test',
        description: 'Test',
        scope: 'Test',
        rules: [{ content: 'Use something' }],
      };

      // Mock successful space resolution
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          id: 'space-uuid-123',
          slug: 'global',
        }),
      });

      // Mock failed standard creation
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: jest.fn().mockResolvedValue({
          message: 'Database error',
        }),
      });

      result = await gateway.createStandardFromPlaybook(playbook);
    });

    it('returns failure', () => {
      expect(result.success).toBe(false);
    });

    it('returns error message about standard creation', () => {
      expect(result.error).toContain('Failed to create standard');
    });
  });

  describe('when not logged in', () => {
    let result: Awaited<
      ReturnType<PackmindGateway['createStandardFromPlaybook']>
    >;

    beforeEach(async () => {
      gateway = new PackmindGateway('');

      const playbook = {
        name: 'Test',
        description: 'Test',
        scope: 'Test',
        rules: [{ content: 'Use something' }],
      };

      result = await gateway.createStandardFromPlaybook(playbook);
    });

    it('returns failure', () => {
      expect(result.success).toBe(false);
    });

    it('returns error message about not being logged in', () => {
      expect(result.error).toContain('Not logged in');
    });
  });

  describe('when example creation fails', () => {
    let result: Awaited<
      ReturnType<PackmindGateway['createStandardFromPlaybook']>
    >;

    beforeEach(async () => {
      const playbook = {
        name: 'Test Standard',
        description: 'Test description',
        scope: 'Test scope',
        rules: [
          {
            content: 'Use something',
            examples: {
              positive: 'const x = 1;',
              negative: 'var x = 1;',
              language: 'TYPESCRIPT',
            },
          },
        ],
      };

      // Mock the space resolution call
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          id: 'space-uuid-123',
          slug: 'global',
        }),
      });

      // Mock the standard creation call
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          id: 'std-123',
          name: 'Test Standard',
        }),
      });

      // Mock the rules fetch call
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest
          .fn()
          .mockResolvedValue([{ id: 'rule-1', content: 'Use something' }]),
      });

      // Mock failed example creation
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      result = await gateway.createStandardFromPlaybook(playbook);
    });

    it('still returns success for standard creation', () => {
      expect(result.success).toBe(true);
    });

    it('returns the standard id', () => {
      expect(result.standardId).toBe('std-123');
    });
  });
});
