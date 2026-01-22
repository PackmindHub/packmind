import { PackmindGateway } from './PackmindGateway';

describe('PackmindGateway.createStandardFromPlaybook', () => {
  let gateway: PackmindGateway;

  // Create a valid base64-encoded API key for testing
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

  beforeEach(() => {
    global.fetch = jest.fn();
    gateway = new PackmindGateway(createTestApiKey());
  });

  it('successfully creates a standard from playbook via API', async () => {
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

    const result = await gateway.createStandardFromPlaybook(playbook);

    expect(result.success).toBe(true);
    expect(result.standardId).toBe('std-123');
    expect(result.name).toBe('Test Standard');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('creates examples for rules that have them', async () => {
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

    const result = await gateway.createStandardFromPlaybook(playbook);

    expect(result.success).toBe(true);
    expect(result.standardId).toBe('std-123');
    // 4 calls: space, create standard, get rules, create example
    expect(global.fetch).toHaveBeenCalledTimes(4);

    // Verify the example creation call
    const exampleCall = (global.fetch as jest.Mock).mock.calls[3];
    expect(exampleCall[0]).toContain('/rules/rule-1/examples');
    expect(JSON.parse(exampleCall[1].body)).toEqual({
      lang: 'TYPESCRIPT',
      positive: 'const x = 1;',
      negative: 'var x = 1;',
    });
  });

  it('returns error when space resolution fails', async () => {
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

    const result = await gateway.createStandardFromPlaybook(playbook);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Failed to resolve global space');
  });

  it('returns error when standard creation fails', async () => {
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

    const result = await gateway.createStandardFromPlaybook(playbook);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Failed to create standard');
  });

  it('returns error when not logged in', async () => {
    gateway = new PackmindGateway('');

    const playbook = {
      name: 'Test',
      description: 'Test',
      scope: 'Test',
      rules: [{ content: 'Use something' }],
    };

    const result = await gateway.createStandardFromPlaybook(playbook);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Not logged in');
  });

  it('succeeds even if example creation fails', async () => {
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

    const result = await gateway.createStandardFromPlaybook(playbook);

    // Standard creation should still succeed
    expect(result.success).toBe(true);
    expect(result.standardId).toBe('std-123');
  });
});
