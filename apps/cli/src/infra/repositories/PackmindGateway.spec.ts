import { RuleId } from '@packmind/types';
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
        branches: ['main', 'develop'],
      });

      // Verify API call was made correctly
      expect(mockFetch).toHaveBeenCalledWith(
        `${mockHost}/api/v0/list-detection-program`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${validApiKey}`,
          },
          body: JSON.stringify({
            gitRemoteUrl: 'github.com/user/repo',
            branches: ['main', 'develop'],
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
          branches: ['main'],
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
          branches: ['main'],
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
          branches: ['main'],
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
          branches: ['main'],
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
          branches: ['main'],
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
            branches: ['main'],
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
            branches: ['main'],
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
            branches: ['main'],
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
            branches: ['main'],
          }),
        ).rejects.toThrow(
          `Packmind server is not accessible at ${mockHost}. Please check your network connection or the server URL.`,
        );
      });
    });

    describe('when fetch fails with message containing Failed to fetch', () => {
      it('throws error', async () => {
        const validApiKeyPayload = {
          host: mockHost,
          jwt: mockJwt,
        };
        const validApiKey = Buffer.from(
          JSON.stringify(validApiKeyPayload),
        ).toString('base64');
        gateway = new PackmindGateway(validApiKey);

        const networkError = new Error('Failed to fetch');
        mockFetch.mockRejectedValue(networkError);

        await expect(
          gateway.listExecutionPrograms({
            gitRemoteUrl: 'github.com/user/repo',
            branches: ['main'],
          }),
        ).rejects.toThrow(
          `Packmind server is not accessible at ${mockHost}. Please check your network connection or the server URL.`,
        );
      });
    });
  });

  describe('getDraftDetectionProgramsForRule', () => {
    it('successfully fetches draft detection programs with valid API key', async () => {
      const validApiKeyPayload = {
        host: mockHost,
        jwt: mockJwt,
      };
      const validApiKey = Buffer.from(
        JSON.stringify(validApiKeyPayload),
      ).toString('base64');
      gateway = new PackmindGateway(validApiKey);

      const mockApiResponse = {
        programs: [
          {
            id: 'program-1',
            code: 'function test() {}',
            language: 'typescript',
            mode: 'singleAst',
            sourceCodeState: 'AST' as const,
            ruleId: 'rule-123',
          },
          {
            id: 'program-2',
            code: 'function test2() {}',
            language: 'javascript',
            mode: 'regexp',
            sourceCodeState: 'RAW' as const,
            ruleId: 'rule-123',
          },
        ],
        ruleContent: 'Test rule content',
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockApiResponse),
      } as unknown as Response);

      const result = await gateway.getDraftDetectionProgramsForRule({
        standardSlug: 'my-standard',
        ruleId: 'rule-123' as RuleId,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        `${mockHost}/api/v0/list-draft-detection-program`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${validApiKey}`,
          },
          body: JSON.stringify({
            standardSlug: 'my-standard',
            ruleId: 'rule-123',
          }),
        },
      );

      expect(result).toEqual({
        programs: [
          {
            language: 'typescript',
            code: 'function test() {}',
            mode: 'singleAst',
            sourceCodeState: 'AST',
          },
          {
            language: 'javascript',
            code: 'function test2() {}',
            mode: 'regexp',
            sourceCodeState: 'RAW',
          },
        ],
        ruleContent: 'Test rule content',
        standardSlug: 'my-standard',
      });
    });

    describe('when no draft programs found', () => {
      it('throws error without language', async () => {
        const validApiKeyPayload = {
          host: mockHost,
          jwt: mockJwt,
        };
        const validApiKey = Buffer.from(
          JSON.stringify(validApiKeyPayload),
        ).toString('base64');
        gateway = new PackmindGateway(validApiKey);

        mockFetch.mockResolvedValue({
          ok: true,
          json: jest.fn().mockResolvedValue({ programs: [], ruleContent: '' }),
        } as unknown as Response);

        await expect(
          gateway.getDraftDetectionProgramsForRule({
            standardSlug: 'my-standard',
            ruleId: 'rule-123' as RuleId,
          }),
        ).rejects.toThrow(
          'No draft detection programs found for rule rule-123 in standard my-standard',
        );
      });
    });

    it('throws error for invalid API key', async () => {
      gateway = new PackmindGateway('invalid-key');

      await expect(
        gateway.getDraftDetectionProgramsForRule({
          standardSlug: 'my-standard',
          ruleId: 'rule-123' as RuleId,
        }),
      ).rejects.toThrow('Invalid API key:');

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
        status: 404,
        statusText: 'Not Found',
        json: jest.fn().mockResolvedValue({
          message: 'Rule not found',
        }),
      } as unknown as Response);

      await expect(
        gateway.getDraftDetectionProgramsForRule({
          standardSlug: 'my-standard',
          ruleId: 'rule-123' as RuleId,
        }),
      ).rejects.toThrow(
        'Failed to fetch draft detection programs: Error: Rule not found',
      );
    });

    describe('when no draft programs found and when language is specified', () => {
      it('throws error with language', async () => {
        const validApiKeyPayload = {
          host: mockHost,
          jwt: mockJwt,
        };
        const validApiKey = Buffer.from(
          JSON.stringify(validApiKeyPayload),
        ).toString('base64');
        gateway = new PackmindGateway(validApiKey);

        const mockApiResponse = {
          programs: [],
          ruleContent: 'Test rule content',
        };

        mockFetch.mockResolvedValue({
          ok: true,
          json: jest.fn().mockResolvedValue(mockApiResponse),
        } as unknown as Response);

        await expect(
          gateway.getDraftDetectionProgramsForRule({
            standardSlug: 'my-standard',
            ruleId: 'rule-123' as RuleId,
            language: 'RUBY',
          }),
        ).rejects.toThrow(
          'No draft detection programs found for rule rule-123 in standard my-standard for language RUBY',
        );
      });
    });
  });
});
