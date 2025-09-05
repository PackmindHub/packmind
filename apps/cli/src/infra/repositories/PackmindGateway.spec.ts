import { PackmindGateway } from './PackmindGateway';

// Mock fetch
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('PackmindGateway', () => {
  let gateway: PackmindGateway;
  const mockHost = 'https://api.packmind.com';
  const mockJwt = 'jwt-token';

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listExecutionPrograms', () => {
    class ErrorWithCause extends Error {
      constructor(
        message: string,
        public cause: { code?: string },
      ) {
        super(message);
      }
    }

    class ErrorWithName extends Error {
      constructor(message: string, name: string) {
        super(message);
        this.name = name;
      }
    }

    it('successfully fetches detection programs with valid API key', async () => {
      // Create a valid base64-encoded API key
      const validApiKeyPayload = {
        host: mockHost,
        jwt: mockJwt,
      };
      const validApiKey = Buffer.from(
        JSON.stringify(validApiKeyPayload),
      ).toString('base64');
      gateway = new PackmindGateway(validApiKey);

      // Mock API response
      const mockApiResponse = {
        standards: [
          {
            name: 'Test Standard',
            slug: 'test-standard',
            scope: [],
            rules: [
              {
                content: 'Test rule',
                activeDetectionPrograms: [
                  {
                    language: 'typescript',
                    detectionProgram: {
                      code: 'function test() {}',
                      mode: 'ast',
                    },
                  },
                ],
              },
            ],
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockApiResponse),
      } as unknown as Response);

      const result = await gateway.listExecutionPrograms({
        gitRemoteUrl: 'github.com/user/repo',
      });

      // Verify API call was made correctly
      expect(mockFetch).toHaveBeenCalledWith(
        `${mockHost}/api/v0/standards/list-detection-program`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${validApiKey}`,
          },
          body: JSON.stringify({
            gitRemoteUrl: 'github.com/user/repo',
          }),
        },
      );

      expect(result).toEqual(mockApiResponse);
    });

    it('throws error for invalid API key format', async () => {
      gateway = new PackmindGateway('invalid-api-key');

      await expect(
        gateway.listExecutionPrograms({
          gitRemoteUrl: 'github.com/user/repo',
        }),
      ).rejects.toThrow('Invalid API key: Failed to decode API key:');

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('throws error for API key missing host field', async () => {
      const invalidApiKeyPayload = {
        jwt: mockJwt,
        // missing host field
      };
      const invalidApiKey = Buffer.from(
        JSON.stringify(invalidApiKeyPayload),
      ).toString('base64');
      gateway = new PackmindGateway(invalidApiKey);

      await expect(
        gateway.listExecutionPrograms({
          gitRemoteUrl: 'github.com/user/repo',
        }),
      ).rejects.toThrow(
        'Invalid API key: Invalid API key: missing or invalid host field',
      );

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('throws error for API key missing jwt field', async () => {
      const invalidApiKeyPayload = {
        host: mockHost,
        // missing jwt field
      };
      const invalidApiKey = Buffer.from(
        JSON.stringify(invalidApiKeyPayload),
      ).toString('base64');
      gateway = new PackmindGateway(invalidApiKey);

      await expect(
        gateway.listExecutionPrograms({
          gitRemoteUrl: 'github.com/user/repo',
        }),
      ).rejects.toThrow(
        'Invalid API key: Invalid API key: missing or invalid jwt field',
      );

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('throws error for failed API request', async () => {
      const validApiKeyPayload = {
        host: mockHost,
        jwt: mockJwt,
      };
      const validApiKey = Buffer.from(
        JSON.stringify(validApiKeyPayload),
      ).toString('base64');
      gateway = new PackmindGateway(validApiKey);

      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      } as Response);

      await expect(
        gateway.listExecutionPrograms({
          gitRemoteUrl: 'github.com/user/repo',
        }),
      ).rejects.toThrow(
        'Failed to fetch detection programs: Error: API request failed: 401 Unauthorized',
      );
    });

    it('throws error for network failure', async () => {
      const validApiKeyPayload = {
        host: mockHost,
        jwt: mockJwt,
      };
      const validApiKey = Buffer.from(
        JSON.stringify(validApiKeyPayload),
      ).toString('base64');
      gateway = new PackmindGateway(validApiKey);

      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(
        gateway.listExecutionPrograms({
          gitRemoteUrl: 'github.com/user/repo',
        }),
      ).rejects.toThrow(
        'Failed to fetch detection programs: Error: Network error',
      );
    });

    describe('when fetch fails with ENOTFOUND in cause', () => {
      it('throws error', async () => {
        const validApiKeyPayload = {
          host: mockHost,
          jwt: mockJwt,
        };
        const validApiKey = Buffer.from(
          JSON.stringify(validApiKeyPayload),
        ).toString('base64');
        gateway = new PackmindGateway(validApiKey);

        const errorWithCause = new ErrorWithCause('fetch failed', {
          code: 'ENOTFOUND',
        });
        mockFetch.mockRejectedValue(errorWithCause);

        await expect(
          gateway.listExecutionPrograms({
            gitRemoteUrl: 'github.com/user/repo',
          }),
        ).rejects.toThrow(
          `Packmind server is not accessible at ${mockHost}. Please check your network connection or the server URL.`,
        );
      });
    });

    describe('when fetch fails with ECONNREFUSED in cause', () => {
      it('throws error', async () => {
        const validApiKeyPayload = {
          host: mockHost,
          jwt: mockJwt,
        };
        const validApiKey = Buffer.from(
          JSON.stringify(validApiKeyPayload),
        ).toString('base64');
        gateway = new PackmindGateway(validApiKey);

        const errorWithCause = new ErrorWithCause('fetch failed', {
          code: 'ECONNREFUSED',
        });
        mockFetch.mockRejectedValue(errorWithCause);

        await expect(
          gateway.listExecutionPrograms({
            gitRemoteUrl: 'github.com/user/repo',
          }),
        ).rejects.toThrow(
          `Packmind server is not accessible at ${mockHost}. Please check your network connection or the server URL.`,
        );
      });
    });

    describe('when fetch fails with name FetchError', () => {
      it('throws error', async () => {
        const validApiKeyPayload = {
          host: mockHost,
          jwt: mockJwt,
        };
        const validApiKey = Buffer.from(
          JSON.stringify(validApiKeyPayload),
        ).toString('base64');
        gateway = new PackmindGateway(validApiKey);

        const fetchError = new ErrorWithName('fetch failed', 'FetchError');
        mockFetch.mockRejectedValue(fetchError);

        await expect(
          gateway.listExecutionPrograms({
            gitRemoteUrl: 'github.com/user/repo',
          }),
        ).rejects.toThrow(
          `Packmind server is not accessible at ${mockHost}. Please check your network connection or the server URL.`,
        );
      });
    });

    describe('when fetch fails with message containing network', () => {
      it('throws error', async () => {
        const validApiKeyPayload = {
          host: mockHost,
          jwt: mockJwt,
        };
        const validApiKey = Buffer.from(
          JSON.stringify(validApiKeyPayload),
        ).toString('base64');
        gateway = new PackmindGateway(validApiKey);

        const networkError = new Error('NetworkError: something went wrong');
        mockFetch.mockRejectedValue(networkError);

        await expect(
          gateway.listExecutionPrograms({
            gitRemoteUrl: 'github.com/user/repo',
          }),
        ).rejects.toThrow(
          `Packmind server is not accessible at ${mockHost}. Please check your network connection or the server URL.`,
        );
      });
    });
  });
});
