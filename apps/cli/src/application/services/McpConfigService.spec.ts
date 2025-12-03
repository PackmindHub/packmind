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
    it('returns properly formatted JSON config', () => {
      const service = new McpConfigService();

      const result = service.getClassicConfig(testConfig);

      const parsed = JSON.parse(result);
      expect(parsed.mcpServers.packmind.url).toBe(testConfig.url);
      expect(parsed.mcpServers.packmind.headers.Authorization).toBe(
        `Bearer ${testConfig.accessToken}`,
      );
    });
  });

  describe('installForAgent', () => {
    describe('with claude agent', () => {
      describe('when command succeeds', () => {
        it('returns success result', () => {
          mockExecSync.mockReturnValue(Buffer.from(''));
          const service = new McpConfigService();

          const result = service.installForAgent('claude', testConfig);

          expect(result.success).toBe(true);
          expect(mockExecSync).toHaveBeenCalledWith(
            expect.stringContaining('claude mcp add'),
            expect.any(Object),
          );
        });
      });

      describe('when command fails', () => {
        it('returns failure result with error message', () => {
          mockExecSync.mockImplementation(() => {
            throw new Error('Command failed');
          });
          const service = new McpConfigService();

          const result = service.installForAgent('claude', testConfig);

          expect(result.success).toBe(false);
          expect(result.error).toContain('Command failed');
        });
      });
    });

    describe('with cursor agent', () => {
      describe('when config file does not exist', () => {
        it('creates new config file', () => {
          mockFs.existsSync.mockReturnValue(false);
          mockFs.writeFileSync.mockImplementation(() => undefined);
          const service = new McpConfigService();

          const result = service.installForAgent('cursor', testConfig);

          expect(result.success).toBe(true);
          expect(mockFs.writeFileSync).toHaveBeenCalledWith(
            expect.stringContaining('mcp.json'),
            expect.stringContaining('packmind'),
          );
        });
      });

      describe('when config file exists', () => {
        it('merges with existing config', () => {
          const existingConfig = JSON.stringify({
            mcpServers: {
              existingServer: { url: 'https://existing.com' },
            },
          });
          mockFs.existsSync.mockReturnValue(true);
          mockFs.readFileSync.mockReturnValue(existingConfig);
          mockFs.writeFileSync.mockImplementation(() => undefined);
          const service = new McpConfigService();

          const result = service.installForAgent('cursor', testConfig);

          expect(result.success).toBe(true);
          const writtenContent = mockFs.writeFileSync.mock
            .calls[0][1] as string;
          const parsed = JSON.parse(writtenContent);
          expect(parsed.mcpServers.existingServer).toBeDefined();
          expect(parsed.mcpServers.packmind).toBeDefined();
        });
      });
    });

    describe('with vscode agent', () => {
      describe('when .vscode directory does not exist', () => {
        it('creates directory and config file', () => {
          mockFs.existsSync.mockReturnValue(false);
          mockFs.mkdirSync.mockImplementation(() => undefined);
          mockFs.writeFileSync.mockImplementation(() => undefined);
          const service = new McpConfigService('/project');

          const result = service.installForAgent('vscode', testConfig);

          expect(result.success).toBe(true);
          expect(mockFs.mkdirSync).toHaveBeenCalledWith('/project/.vscode', {
            recursive: true,
          });
        });
      });

      describe('when .vscode directory exists', () => {
        it('creates config file with correct format', () => {
          mockFs.existsSync.mockImplementation((path) => {
            if (typeof path === 'string' && path.endsWith('.vscode')) {
              return true;
            }
            return false;
          });
          mockFs.writeFileSync.mockImplementation(() => undefined);
          const service = new McpConfigService('/project');

          const result = service.installForAgent('vscode', testConfig);

          expect(result.success).toBe(true);
          const writtenContent = mockFs.writeFileSync.mock
            .calls[0][1] as string;
          const parsed = JSON.parse(writtenContent);
          expect(parsed.servers['packmind-mcp-vscode']).toBeDefined();
          expect(parsed.servers['packmind-mcp-vscode'].type).toBe('http');
          expect(parsed.inputs).toEqual([]);
        });
      });
    });

    describe('with unknown agent', () => {
      it('returns failure result', () => {
        const service = new McpConfigService();

        const result = service.installForAgent(
          'unknown' as 'claude',
          testConfig,
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('Unknown agent');
      });
    });
  });
});
