import * as fs from 'fs';
import * as path from 'path';
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
      let result: boolean;

      beforeEach(() => {
        mockFs.existsSync.mockReturnValue(true);
        const service = new AgentDetectionService();
        result = service.isCursorAvailable();
      });

      it('returns true', () => {
        expect(result).toBe(true);
      });

      it('checks the .cursor directory', () => {
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
      let result: boolean;

      beforeEach(() => {
        mockFs.existsSync.mockReturnValue(true);
        const service = new AgentDetectionService('/project');
        result = service.isVSCodeAvailable();
      });

      it('returns true', () => {
        expect(result).toBe(true);
      });

      it('checks the .vscode directory in project', () => {
        expect(mockFs.existsSync).toHaveBeenCalledWith(
          path.join('/project', '.vscode'),
        );
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

  describe('isContinueAvailable', () => {
    describe('when .continue directory exists in project', () => {
      let result: boolean;

      beforeEach(() => {
        mockFs.existsSync.mockReturnValue(true);
        const service = new AgentDetectionService('/project');
        result = service.isContinueAvailable();
      });

      it('returns true', () => {
        expect(result).toBe(true);
      });

      it('checks the .continue directory in project', () => {
        expect(mockFs.existsSync).toHaveBeenCalledWith(
          path.join('/project', '.continue'),
        );
      });
    });

    describe('when .continue directory does not exist in project', () => {
      it('returns false', () => {
        mockFs.existsSync.mockReturnValue(false);
        const service = new AgentDetectionService('/project');

        const result = service.isContinueAvailable();

        expect(result).toBe(false);
      });
    });
  });

  describe('detectAgents', () => {
    describe('when all agents are available', () => {
      let result: ReturnType<AgentDetectionService['detectAgents']>;

      beforeEach(() => {
        mockExecSync.mockReturnValue(Buffer.from('/usr/local/bin/claude'));
        mockFs.existsSync.mockReturnValue(true);
        const service = new AgentDetectionService('/project');
        result = service.detectAgents();
      });

      it('returns 4 agents', () => {
        expect(result).toHaveLength(4);
      });

      it('includes Claude Code agent', () => {
        expect(result).toContainEqual({ type: 'claude', name: 'Claude Code' });
      });

      it('includes Cursor agent', () => {
        expect(result).toContainEqual({ type: 'cursor', name: 'Cursor' });
      });

      it('includes VS Code agent', () => {
        expect(result).toContainEqual({ type: 'vscode', name: 'VS Code' });
      });

      it('includes Continue.dev agent', () => {
        expect(result).toContainEqual({
          type: 'continue',
          name: 'Continue.dev',
        });
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
      let result: ReturnType<AgentDetectionService['detectAgents']>;

      beforeEach(() => {
        mockExecSync.mockReturnValue(Buffer.from('/usr/local/bin/claude'));
        mockFs.existsSync.mockReturnValue(false);
        const service = new AgentDetectionService('/project');
        result = service.detectAgents();
      });

      it('returns 1 agent', () => {
        expect(result).toHaveLength(1);
      });

      it('includes only Claude Code agent', () => {
        expect(result[0]).toEqual({ type: 'claude', name: 'Claude Code' });
      });
    });
  });
});
