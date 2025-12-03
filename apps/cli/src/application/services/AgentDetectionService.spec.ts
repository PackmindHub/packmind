import * as fs from 'fs';
import { execSync } from 'child_process';
import { AgentDetectionService } from './AgentDetectionService';

jest.mock('fs');
jest.mock('child_process');

describe('AgentDetectionService', () => {
  const mockFs = fs as jest.Mocked<typeof fs>;
  const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('isClaudeAvailable', () => {
    describe('when claude command exists', () => {
      it('returns true', () => {
        mockExecSync.mockReturnValue(Buffer.from('/usr/local/bin/claude'));
        const service = new AgentDetectionService();

        const result = service.isClaudeAvailable();

        expect(result).toBe(true);
      });
    });

    describe('when claude command does not exist', () => {
      it('returns false', () => {
        mockExecSync.mockImplementation(() => {
          throw new Error('command not found');
        });
        const service = new AgentDetectionService();

        const result = service.isClaudeAvailable();

        expect(result).toBe(false);
      });
    });
  });

  describe('isCursorAvailable', () => {
    describe('when ~/.cursor directory exists', () => {
      it('returns true', () => {
        mockFs.existsSync.mockReturnValue(true);
        const service = new AgentDetectionService();

        const result = service.isCursorAvailable();

        expect(result).toBe(true);
        expect(mockFs.existsSync).toHaveBeenCalledWith(
          expect.stringContaining('.cursor'),
        );
      });
    });

    describe('when ~/.cursor directory does not exist', () => {
      it('returns false', () => {
        mockFs.existsSync.mockReturnValue(false);
        const service = new AgentDetectionService();

        const result = service.isCursorAvailable();

        expect(result).toBe(false);
      });
    });
  });

  describe('isVSCodeAvailable', () => {
    describe('when .vscode directory exists in project', () => {
      it('returns true', () => {
        mockFs.existsSync.mockReturnValue(true);
        const service = new AgentDetectionService('/project');

        const result = service.isVSCodeAvailable();

        expect(result).toBe(true);
        expect(mockFs.existsSync).toHaveBeenCalledWith('/project/.vscode');
      });
    });

    describe('when .vscode directory does not exist in project', () => {
      it('returns false', () => {
        mockFs.existsSync.mockReturnValue(false);
        const service = new AgentDetectionService('/project');

        const result = service.isVSCodeAvailable();

        expect(result).toBe(false);
      });
    });
  });

  describe('detectAgents', () => {
    describe('when all agents are available', () => {
      it('returns all detected agents', () => {
        mockExecSync.mockReturnValue(Buffer.from('/usr/local/bin/claude'));
        mockFs.existsSync.mockReturnValue(true);
        const service = new AgentDetectionService('/project');

        const result = service.detectAgents();

        expect(result).toHaveLength(3);
        expect(result).toContainEqual({ type: 'claude', name: 'Claude Code' });
        expect(result).toContainEqual({ type: 'cursor', name: 'Cursor' });
        expect(result).toContainEqual({ type: 'vscode', name: 'VS Code' });
      });
    });

    describe('when no agents are available', () => {
      it('returns empty array', () => {
        mockExecSync.mockImplementation(() => {
          throw new Error('command not found');
        });
        mockFs.existsSync.mockReturnValue(false);
        const service = new AgentDetectionService('/project');

        const result = service.detectAgents();

        expect(result).toHaveLength(0);
      });
    });

    describe('when only Claude is available', () => {
      it('returns only Claude agent', () => {
        mockExecSync.mockReturnValue(Buffer.from('/usr/local/bin/claude'));
        mockFs.existsSync.mockReturnValue(false);
        const service = new AgentDetectionService('/project');

        const result = service.detectAgents();

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({ type: 'claude', name: 'Claude Code' });
      });
    });
  });
});
