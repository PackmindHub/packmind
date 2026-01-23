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

    describe('when fetching detection programs with valid API key', () => {
      let result: Awaited<ReturnType<PackmindGateway['listExecutionPrograms']>>;
      let validApiKey: string;
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

      beforeEach(async () => {
        const validApiKeyPayload = {
          host: mockHost,
          jwt: mockJwt,
        };
        validApiKey = Buffer.from(JSON.stringify(validApiKeyPayload)).toString(
          'base64',
        );
        gateway = new PackmindGateway(validApiKey);

        mockFetch.mockResolvedValue({
          ok: true,
          json: jest.fn().mockResolvedValue(mockApiResponse),
        } as unknown as Response);

        result = await gateway.listExecutionPrograms({
          gitRemoteUrl: 'github.com/user/repo',
          branches: ['main', 'develop'],
        });
      });

      it('calls the API with correct parameters', () => {
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
      });

      it('returns the API response', () => {
        expect(result).toEqual(mockApiResponse);
      });
    });

    describe('when API key format is invalid', () => {
      beforeEach(() => {
        gateway = new PackmindGateway('invalid-api-key');
      });

      it('throws error', async () => {
        await expect(
          gateway.listExecutionPrograms({
            gitRemoteUrl: 'github.com/user/repo',
            branches: ['main'],
          }),
        ).rejects.toThrow('Invalid API key: Failed to decode API key:');
      });

      it('does not call fetch', async () => {
        try {
          await gateway.listExecutionPrograms({
            gitRemoteUrl: 'github.com/user/repo',
            branches: ['main'],
          });
        } catch {
          // Expected to throw
        }

        expect(mockFetch).not.toHaveBeenCalled();
      });
    });

    describe('when API key is missing host field', () => {
      beforeEach(() => {
        const invalidApiKeyPayload = {
          jwt: mockJwt,
          // missing host field
        };
        const invalidApiKey = Buffer.from(
          JSON.stringify(invalidApiKeyPayload),
        ).toString('base64');
        gateway = new PackmindGateway(invalidApiKey);
      });

      it('throws error', async () => {
        await expect(
          gateway.listExecutionPrograms({
            gitRemoteUrl: 'github.com/user/repo',
            branches: ['main'],
          }),
        ).rejects.toThrow(
          'Invalid API key: Invalid API key: missing or invalid host field',
        );
      });

      it('does not call fetch', async () => {
        try {
          await gateway.listExecutionPrograms({
            gitRemoteUrl: 'github.com/user/repo',
            branches: ['main'],
          });
        } catch {
          // Expected to throw
        }

        expect(mockFetch).not.toHaveBeenCalled();
      });
    });

    describe('when API key is missing jwt field', () => {
      beforeEach(() => {
        const invalidApiKeyPayload = {
          host: mockHost,
          // missing jwt field
        };
        const invalidApiKey = Buffer.from(
          JSON.stringify(invalidApiKeyPayload),
        ).toString('base64');
        gateway = new PackmindGateway(invalidApiKey);
      });

      it('throws error', async () => {
        await expect(
          gateway.listExecutionPrograms({
            gitRemoteUrl: 'github.com/user/repo',
            branches: ['main'],
          }),
        ).rejects.toThrow(
          'Invalid API key: Invalid API key: missing or invalid jwt field',
        );
      });

      it('does not call fetch', async () => {
        try {
          await gateway.listExecutionPrograms({
            gitRemoteUrl: 'github.com/user/repo',
            branches: ['main'],
          });
        } catch {
          // Expected to throw
        }

        expect(mockFetch).not.toHaveBeenCalled();
      });
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
    describe('when fetching draft detection programs with valid API key', () => {
      let result: Awaited<
        ReturnType<PackmindGateway['getDraftDetectionProgramsForRule']>
      >;
      let validApiKey: string;
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

      beforeEach(async () => {
        const validApiKeyPayload = {
          host: mockHost,
          jwt: mockJwt,
        };
        validApiKey = Buffer.from(JSON.stringify(validApiKeyPayload)).toString(
          'base64',
        );
        gateway = new PackmindGateway(validApiKey);

        mockFetch.mockResolvedValue({
          ok: true,
          json: jest.fn().mockResolvedValue(mockApiResponse),
        } as unknown as Response);

        result = await gateway.getDraftDetectionProgramsForRule({
          standardSlug: 'my-standard',
          ruleId: 'rule-123' as RuleId,
        });
      });

      it('calls the API with correct parameters', () => {
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
      });

      it('returns the transformed API response', () => {
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

    describe('when API key is invalid', () => {
      beforeEach(() => {
        gateway = new PackmindGateway('invalid-key');
      });

      it('throws error', async () => {
        await expect(
          gateway.getDraftDetectionProgramsForRule({
            standardSlug: 'my-standard',
            ruleId: 'rule-123' as RuleId,
          }),
        ).rejects.toThrow('Invalid API key:');
      });

      it('does not call fetch', async () => {
        try {
          await gateway.getDraftDetectionProgramsForRule({
            standardSlug: 'my-standard',
            ruleId: 'rule-123' as RuleId,
          });
        } catch {
          // Expected to throw
        }

        expect(mockFetch).not.toHaveBeenCalled();
      });
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

  describe('notifyDistribution', () => {
    const createValidApiKey = (orgId: string) => {
      // Create a JWT with organization.id
      const jwtPayload = { organization: { id: orgId } };
      const jwtPayloadBase64 = Buffer.from(JSON.stringify(jwtPayload)).toString(
        'base64',
      );
      const mockJwtWithOrg = `header.${jwtPayloadBase64}.signature`;

      const apiKeyPayload = {
        host: mockHost,
        jwt: mockJwtWithOrg,
      };
      return Buffer.from(JSON.stringify(apiKeyPayload)).toString('base64');
    };

    describe('when notification succeeds', () => {
      let result: Awaited<ReturnType<PackmindGateway['notifyDistribution']>>;
      let validApiKey: string;
      const mockApiResponse = {
        deploymentId: 'deployment-456',
      };

      beforeEach(async () => {
        validApiKey = createValidApiKey('org-123');
        gateway = new PackmindGateway(validApiKey);

        mockFetch.mockResolvedValue({
          ok: true,
          json: jest.fn().mockResolvedValue(mockApiResponse),
        } as unknown as Response);

        result = await gateway.notifyDistribution({
          distributedPackages: ['backend', 'frontend'],
          gitRemoteUrl: 'github.com/user/repo',
          gitBranch: 'main',
          relativePath: '/src/',
        });
      });

      it('calls the API with correct parameters', () => {
        expect(mockFetch).toHaveBeenCalledWith(
          `${mockHost}/api/v0/organizations/org-123/deployments`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${validApiKey}`,
            },
            body: JSON.stringify({
              distributedPackages: ['backend', 'frontend'],
              gitRemoteUrl: 'github.com/user/repo',
              gitBranch: 'main',
              relativePath: '/src/',
            }),
          },
        );
      });

      it('returns the deployment ID', () => {
        expect(result).toEqual({ deploymentId: 'deployment-456' });
      });
    });

    describe('when API key is invalid', () => {
      beforeEach(() => {
        gateway = new PackmindGateway('invalid-key');
      });

      it('throws error', async () => {
        await expect(
          gateway.notifyDistribution({
            distributedPackages: ['backend'],
            gitRemoteUrl: 'github.com/user/repo',
            gitBranch: 'main',
            relativePath: '/',
          }),
        ).rejects.toThrow('Invalid API key:');
      });

      it('does not call fetch', async () => {
        try {
          await gateway.notifyDistribution({
            distributedPackages: ['backend'],
            gitRemoteUrl: 'github.com/user/repo',
            gitBranch: 'main',
            relativePath: '/',
          });
        } catch {
          // Expected to throw
        }

        expect(mockFetch).not.toHaveBeenCalled();
      });
    });

    describe('when API key is missing organization ID', () => {
      beforeEach(() => {
        // JWT without organization.id
        const jwtPayloadBase64 = Buffer.from(
          JSON.stringify({ user: 'test' }),
        ).toString('base64');
        const mockJwtNoOrg = `header.${jwtPayloadBase64}.signature`;
        const apiKeyPayload = { host: mockHost, jwt: mockJwtNoOrg };
        const invalidApiKey = Buffer.from(
          JSON.stringify(apiKeyPayload),
        ).toString('base64');
        gateway = new PackmindGateway(invalidApiKey);
      });

      it('throws error', async () => {
        await expect(
          gateway.notifyDistribution({
            distributedPackages: ['backend'],
            gitRemoteUrl: 'github.com/user/repo',
            gitBranch: 'main',
            relativePath: '/',
          }),
        ).rejects.toThrow('Invalid API key: missing organizationId in JWT');
      });

      it('does not call fetch', async () => {
        try {
          await gateway.notifyDistribution({
            distributedPackages: ['backend'],
            gitRemoteUrl: 'github.com/user/repo',
            gitBranch: 'main',
            relativePath: '/',
          });
        } catch {
          // Expected to throw
        }

        expect(mockFetch).not.toHaveBeenCalled();
      });
    });

    describe('when API request fails', () => {
      it('throws error with message from response', async () => {
        const validApiKey = createValidApiKey('org-123');
        gateway = new PackmindGateway(validApiKey);

        mockFetch.mockResolvedValue({
          ok: false,
          status: 400,
          statusText: 'Bad Request',
          json: jest.fn().mockResolvedValue({
            message: 'Invalid package slug',
          }),
        } as unknown as Response);

        await expect(
          gateway.notifyDistribution({
            distributedPackages: ['non-existent'],
            gitRemoteUrl: 'github.com/user/repo',
            gitBranch: 'main',
            relativePath: '/',
          }),
        ).rejects.toThrow('Invalid package slug');
      });
    });

    describe('when network error occurs', () => {
      it('throws server not accessible error', async () => {
        const validApiKey = createValidApiKey('org-123');
        gateway = new PackmindGateway(validApiKey);

        mockFetch.mockRejectedValue(new Error('Failed to fetch'));

        await expect(
          gateway.notifyDistribution({
            distributedPackages: ['backend'],
            gitRemoteUrl: 'github.com/user/repo',
            gitBranch: 'main',
            relativePath: '/',
          }),
        ).rejects.toThrow(
          `Packmind server is not accessible at ${mockHost}. Please check your network connection or the server URL.`,
        );
      });
    });
  });
});
