import * as fs from 'fs';
import { execSync } from 'child_process';
import { McpConfigService } from './McpConfigService';

jest.mock('fs');
jest.mock('child_process');

describe('McpConfigService', () => {
  const mockFs = fs as jest.Mocked<typeof fs>;
  const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;

  const testConfig = {
    url: 'https://mcp.packmind.com',
    accessToken: 'test-token-123',
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getClassicConfig', () => {
    let parsed: Record<string, unknown>;

    beforeEach(() => {
      const service = new McpConfigService();
      const result = service.getClassicConfig(testConfig);
      parsed = JSON.parse(result);
    });

    it('includes packmind url', () => {
      expect(
        (parsed.mcpServers as Record<string, { url: string }>).packmind.url,
      ).toBe(testConfig.url);
    });

    it('includes authorization header with bearer token', () => {
      expect(
        (
          parsed.mcpServers as Record<
            string,
            { headers: { Authorization: string } }
          >
        ).packmind.headers.Authorization,
      ).toBe(`Bearer ${testConfig.accessToken}`);
    });
  });

  describe('installForAgent', () => {
    describe('with claude agent', () => {
      describe('when command succeeds', () => {
        let result: ReturnType<McpConfigService['installForAgent']>;

        beforeEach(() => {
          mockExecSync.mockReturnValue(Buffer.from(''));
          const service = new McpConfigService();
          result = service.installForAgent('claude', testConfig);
        });

        it('returns success', () => {
          expect(result.success).toBe(true);
        });

        it('calls claude mcp add command', () => {
          expect(mockExecSync).toHaveBeenCalledWith(
            expect.stringContaining('claude mcp add'),
            expect.any(Object),
          );
        });
      });

      describe('when command fails', () => {
        let result: ReturnType<McpConfigService['installForAgent']>;

        beforeEach(() => {
          mockExecSync.mockImplementation(() => {
            throw new Error('Command failed');
          });
          const service = new McpConfigService();
          result = service.installForAgent('claude', testConfig);
        });

        it('returns failure status', () => {
          expect(result.success).toBe(false);
        });

        it('contains error message', () => {
          expect(result.error).toContain('Command failed');
        });
      });
    });

    describe('with cursor agent', () => {
      describe('when config file does not exist', () => {
        let result: ReturnType<McpConfigService['installForAgent']>;

        beforeEach(() => {
          mockFs.existsSync.mockReturnValue(false);
          mockFs.writeFileSync.mockImplementation(() => undefined);
          const service = new McpConfigService();
          result = service.installForAgent('cursor', testConfig);
        });

        it('returns success status', () => {
          expect(result.success).toBe(true);
        });

        it('writes config file with packmind configuration', () => {
          expect(mockFs.writeFileSync).toHaveBeenCalledWith(
            expect.stringContaining('mcp.json'),
            expect.stringContaining('packmind'),
          );
        });
      });

      describe('when config file exists', () => {
        let result: ReturnType<McpConfigService['installForAgent']>;
        let parsed: Record<string, { mcpServers: Record<string, unknown> }>;

        beforeEach(() => {
          const existingConfig = JSON.stringify({
            mcpServers: {
              existingServer: { url: 'https://existing.com' },
            },
          });
          mockFs.existsSync.mockReturnValue(true);
          mockFs.readFileSync.mockReturnValue(existingConfig);
          mockFs.writeFileSync.mockImplementation(() => undefined);
          const service = new McpConfigService();
          result = service.installForAgent('cursor', testConfig);
          const writtenContent = mockFs.writeFileSync.mock
            .calls[0][1] as string;
          parsed = JSON.parse(writtenContent);
        });

        it('returns success status', () => {
          expect(result.success).toBe(true);
        });

        it('preserves existing server configuration', () => {
          expect(parsed.mcpServers.existingServer).toBeDefined();
        });

        it('adds packmind server configuration', () => {
          expect(parsed.mcpServers.packmind).toBeDefined();
        });
      });
    });

    describe('with vscode agent', () => {
      describe('when .vscode directory does not exist', () => {
        let result: ReturnType<McpConfigService['installForAgent']>;

        beforeEach(() => {
          mockFs.existsSync.mockReturnValue(false);
          mockFs.mkdirSync.mockImplementation(() => undefined);
          mockFs.writeFileSync.mockImplementation(() => undefined);
          const service = new McpConfigService('/project');
          result = service.installForAgent('vscode', testConfig);
        });

        it('returns success status', () => {
          expect(result.success).toBe(true);
        });

        it('creates .vscode directory recursively', () => {
          expect(mockFs.mkdirSync).toHaveBeenCalledWith('/project/.vscode', {
            recursive: true,
          });
        });
      });

      describe('when .vscode directory exists', () => {
        let result: ReturnType<McpConfigService['installForAgent']>;
        let parsed: Record<
          string,
          {
            servers: Record<string, { type: string }>;
            inputs: unknown[];
          }
        >;

        beforeEach(() => {
          mockFs.existsSync.mockImplementation((path) => {
            if (typeof path === 'string' && path.endsWith('.vscode')) {
              return true;
            }
            return false;
          });
          mockFs.writeFileSync.mockImplementation(() => undefined);
          const service = new McpConfigService('/project');
          result = service.installForAgent('vscode', testConfig);
          const writtenContent = mockFs.writeFileSync.mock
            .calls[0][1] as string;
          parsed = JSON.parse(writtenContent);
        });

        it('returns success status', () => {
          expect(result.success).toBe(true);
        });

        it('includes packmind-mcp-vscode server', () => {
          expect(parsed.servers['packmind-mcp-vscode']).toBeDefined();
        });

        it('sets server type to http', () => {
          expect(parsed.servers['packmind-mcp-vscode'].type).toBe('http');
        });

        it('sets inputs as empty array', () => {
          expect(parsed.inputs).toEqual([]);
        });
      });
    });

    describe('with unknown agent', () => {
      let result: ReturnType<McpConfigService['installForAgent']>;

      beforeEach(() => {
        const service = new McpConfigService();
        result = service.installForAgent('unknown' as 'claude', testConfig);
      });

      it('returns failure status', () => {
        expect(result.success).toBe(false);
      });

      it('contains unknown agent error message', () => {
        expect(result.error).toContain('Unknown agent');
      });
    });
  });
});
