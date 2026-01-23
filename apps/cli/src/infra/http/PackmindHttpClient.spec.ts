import { PackmindHttpClient } from './PackmindHttpClient';
import { NotLoggedInError } from '../../domain/errors/NotLoggedInError';

describe('PackmindHttpClient', () => {
  const createTestApiKey = (orgId = 'org-123') => {
    const jwtPayload = { organization: { id: orgId, name: 'Test Org' } };
    const jwtPayloadBase64 = Buffer.from(JSON.stringify(jwtPayload)).toString(
      'base64',
    );
    const jwt = `header.${jwtPayloadBase64}.signature`;
    return Buffer.from(
      JSON.stringify({
        host: 'https://api.packmind.com',
        jwt,
      }),
    ).toString('base64');
  };

  describe('getAuthContext', () => {
    it('returns host, jwt and organizationId for valid API key', () => {
      const client = new PackmindHttpClient(createTestApiKey('org-456'));

      const context = client.getAuthContext();

      expect(context.host).toBe('https://api.packmind.com');
      expect(context.organizationId).toBe('org-456');
      expect(context.jwt).toContain('header.');
    });

    describe('when API key is empty', () => {
      it('throws NotLoggedInError', () => {
        const client = new PackmindHttpClient('');

        expect(() => client.getAuthContext()).toThrow(NotLoggedInError);
      });
    });

    describe('when API key is invalid base64', () => {
      it('throws error', () => {
        const client = new PackmindHttpClient('not-valid-base64!@#');

        expect(() => client.getAuthContext()).toThrow('Invalid API key');
      });
    });

    describe('when JWT is missing organizationId', () => {
      it('throws error', () => {
        const jwtPayload = { user: 'test' };
        const jwtPayloadBase64 = Buffer.from(
          JSON.stringify(jwtPayload),
        ).toString('base64');
        const jwt = `header.${jwtPayloadBase64}.signature`;
        const apiKey = Buffer.from(
          JSON.stringify({
            host: 'https://api.packmind.com',
            jwt,
          }),
        ).toString('base64');
        const client = new PackmindHttpClient(apiKey);

        expect(() => client.getAuthContext()).toThrow('missing organizationId');
      });
    });
  });

  describe('request', () => {
    beforeEach(() => {
      global.fetch = jest.fn();
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('makes GET request with auth headers', async () => {
      const client = new PackmindHttpClient(createTestApiKey());
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ data: 'test' }),
      });

      const result = await client.request<{ data: string }>('/test-path');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.packmind.com/test-path',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: expect.stringContaining('Bearer '),
          }),
        }),
      );
      expect(result).toEqual({ data: 'test' });
    });

    it('makes POST request with body', async () => {
      const client = new PackmindHttpClient(createTestApiKey());
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ id: '123' }),
      });

      await client.request('/create', {
        method: 'POST',
        body: { name: 'test' },
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.packmind.com/create',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'test' }),
        }),
      );
    });

    describe('when response is not ok', () => {
      it('throws error with message from response body', async () => {
        const client = new PackmindHttpClient(createTestApiKey());
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: false,
          status: 400,
          statusText: 'Bad Request',
          json: jest.fn().mockResolvedValue({ message: 'Invalid data' }),
        });

        await expect(client.request('/test')).rejects.toThrow('Invalid data');
      });
    });

    describe('when network error occurs', () => {
      it('throws server not accessible error', async () => {
        const client = new PackmindHttpClient(createTestApiKey());
        (global.fetch as jest.Mock).mockRejectedValue(
          new Error('Failed to fetch'),
        );

        await expect(client.request('/test')).rejects.toThrow(
          'Packmind server is not accessible',
        );
      });
    });
  });
});
