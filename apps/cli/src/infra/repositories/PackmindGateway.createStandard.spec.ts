import { PackmindGateway } from './PackmindGateway';

describe('PackmindGateway.createStandardFromPlaybook', () => {
  let gateway: PackmindGateway;

  beforeEach(() => {
    // Mock fetch for the gateway
    global.fetch = jest.fn();

    gateway = new PackmindGateway('mock-api-key');

    // Mock getMcpUrl to return a valid URL
    jest.spyOn(gateway, 'getMcpUrl').mockResolvedValue({
      url: 'http://localhost:3000',
    });

    // Mock getMcpToken to return a valid token
    jest.spyOn(gateway, 'getMcpToken').mockResolvedValue({
      access_token: 'test-token',
      token_type: 'Bearer',
      expires_in: 3600,
    });
  });

  it('successfully creates a standard from playbook via MCP server', async () => {
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

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({
        success: true,
        standardId: 'std-123',
        name: 'Test Standard',
      }),
    });

    const result = await gateway.createStandardFromPlaybook(playbook);

    expect(result.success).toBe(true);
    expect(result.standardId).toBe('std-123');
    expect(global.fetch).toHaveBeenCalled();
  });

  it('returns error when MCP server call fails', async () => {
    const playbook = {
      name: 'Test',
      description: 'Test',
      scope: 'Test',
      rules: [{ content: 'Use something' }],
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: jest.fn().mockResolvedValue('Internal server error'),
    });

    const result = await gateway.createStandardFromPlaybook(playbook);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
