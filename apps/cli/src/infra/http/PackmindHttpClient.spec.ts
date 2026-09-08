import { PackmindHttpClient } from './PackmindHttpClient';
import { NotLoggedInError } from '../../domain/errors/NotLoggedInError';

describe('PackmindHttpClient', () => {
  const createTestApiKey = (orgId = 'org-123', role?: string) => {
    const jwtPayload = {
      organization: { id: orgId, name: 'Test Org', ...(role ? { role } : {}) },
    };
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
    describe('when API key is valid', () => {
      let context: ReturnType<PackmindHttpClient['getAuthContext']>;

      beforeEach(() => {
        const client = new PackmindHttpClient(createTestApiKey('org-456'));
        context = client.getAuthContext();
      });

      it('returns the host', () => {
        expect(context.host).toBe('https://api.packmind.com');
      });

      it('returns the organizationId', () => {
        expect(context.organizationId).toBe('org-456');
      });

      it('returns the jwt', () => {
        expect(context.jwt).toContain('header.');
      });
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

    describe('when JWT includes organization.role', () => {
      describe('when the JWT role is admin', () => {
        it('returns role "admin"', () => {
          const client = new PackmindHttpClient(
            createTestApiKey('org-456', 'admin'),
          );
          expect(client.getAuthContext().role).toBe('admin');
        });
      });

      describe('when the JWT role is member', () => {
        it('returns role "member"', () => {
          const client = new PackmindHttpClient(
            createTestApiKey('org-456', 'member'),
          );
          expect(client.getAuthContext().role).toBe('member');
        });
      });
    });

    describe('when JWT omits organization.role', () => {
      it('returns role null', () => {
        const client = new PackmindHttpClient(createTestApiKey('org-456'));
        expect(client.getAuthContext().role).toBeNull();
      });
    });

    describe('when JWT organization.role is an unknown value', () => {
      it('returns role null', () => {
        const client = new PackmindHttpClient(
          createTestApiKey('org-456', 'superadmin'),
        );
        expect(client.getAuthContext().role).toBeNull();
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

    describe('when making GET request', () => {
      let result: { data: string };

      beforeEach(async () => {
        const client = new PackmindHttpClient(createTestApiKey());
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: jest.fn().mockResolvedValue({ data: 'test' }),
        });

        result = await client.request<{ data: string }>('/test-path');
      });

      it('calls fetch with correct URL and headers', () => {
        expect(global.fetch).toHaveBeenCalledWith(
          'https://api.packmind.com/test-path',
          expect.objectContaining({
            method: 'GET',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
              Authorization: expect.stringContaining('Bearer '),
              'User-Agent': expect.stringMatching(
                /^packmind-cli:\d+\.\d+\.\d+/,
              ),
            }),
          }),
        );
      });

      it('returns the response data', () => {
        expect(result).toEqual({ data: 'test' });
      });
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

    describe('when a 404 needs an edition the header does not carry', () => {
      const respondWith = (
        status: number,
        headers: Record<string, string> = {},
      ) => new Response(null, { status, headers });

      const authMeAnswering = (body: unknown) =>
        new Response(JSON.stringify(body), { status: 401 });

      let onError: jest.Mock;
      let client: PackmindHttpClient;

      beforeEach(() => {
        onError = jest.fn();
        client = new PackmindHttpClient(createTestApiKey());
      });

      const request = () =>
        client.request('/api/v0/thing', { onError }).catch(() => undefined);

      describe('when the header states the edition', () => {
        beforeEach(async () => {
          (global.fetch as jest.Mock).mockResolvedValue(
            respondWith(404, { 'Packmind-Edition': 'cloud' }),
          );

          await request();
        });

        it('hands that edition to the caller', () => {
          expect(onError).toHaveBeenCalledWith(expect.anything(), 'cloud');
        });

        it('asks the server nothing further', () => {
          expect(global.fetch).toHaveBeenCalledTimes(1);
        });
      });

      describe('when the server is too old to set the header', () => {
        beforeEach(async () => {
          (global.fetch as jest.Mock)
            .mockResolvedValueOnce(respondWith(404))
            .mockResolvedValueOnce(authMeAnswering({ edition: 'oss' }));

          await request();
        });

        it('takes the edition from /auth/me', () => {
          expect(onError).toHaveBeenCalledWith(expect.anything(), 'oss');
        });

        it('reads it off the unauthenticated answer', () => {
          expect(global.fetch).toHaveBeenLastCalledWith(
            'https://api.packmind.com/api/v0/auth/me',
            expect.anything(),
          );
        });
      });

      describe('when /auth/me predates the edition field too', () => {
        beforeEach(async () => {
          (global.fetch as jest.Mock)
            .mockResolvedValueOnce(respondWith(404))
            .mockResolvedValueOnce(authMeAnswering({ authenticated: false }));

          await request();
        });

        it('establishes no edition', () => {
          expect(onError).toHaveBeenCalledWith(expect.anything(), null);
        });
      });

      describe('when /auth/me cannot be reached', () => {
        beforeEach(async () => {
          (global.fetch as jest.Mock)
            .mockResolvedValueOnce(respondWith(404))
            .mockRejectedValueOnce(new Error('Failed to fetch'));

          await request();
        });

        it('establishes no edition rather than failing the call', () => {
          expect(onError).toHaveBeenCalledWith(expect.anything(), null);
        });
      });

      describe('when a second 404 arrives', () => {
        beforeEach(async () => {
          (global.fetch as jest.Mock)
            .mockResolvedValueOnce(respondWith(404))
            .mockResolvedValueOnce(authMeAnswering({ edition: 'oss' }))
            .mockResolvedValueOnce(respondWith(404));

          await request();
          await request();
        });

        it('reuses the edition instead of asking again', () => {
          expect(global.fetch).toHaveBeenCalledTimes(3);
        });

        it('still hands it to the caller', () => {
          expect(onError).toHaveBeenLastCalledWith(expect.anything(), 'oss');
        });
      });

      describe('when a status other than 404 fails', () => {
        beforeEach(async () => {
          (global.fetch as jest.Mock).mockResolvedValue(respondWith(500));

          await request();
        });

        it('does not spend a request on the edition', () => {
          expect(global.fetch).toHaveBeenCalledTimes(1);
        });

        it('establishes no edition', () => {
          expect(onError).toHaveBeenCalledWith(expect.anything(), null);
        });
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
