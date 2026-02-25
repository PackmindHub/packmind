import { createCommandHandler } from './createCommandHandler';
import { ICreateCommandFromPlaybookUseCase } from '../../domain/useCases/ICreateCommandFromPlaybookUseCase';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';

// Mock the credentials module
jest.mock('../utils/credentials', () => ({
  loadApiKey: jest.fn(),
  decodeApiKey: jest.fn(),
}));

jest.mock('../utils/readStdin');
import { readStdin } from '../utils/readStdin';
const mockReadStdin = readStdin as jest.MockedFunction<typeof readStdin>;

import { loadApiKey, decodeApiKey } from '../utils/credentials';

const mockLoadApiKey = loadApiKey as jest.MockedFunction<typeof loadApiKey>;
const mockDecodeApiKey = decodeApiKey as jest.MockedFunction<
  typeof decodeApiKey
>;

describe('createCommandHandler', () => {
  let mockUseCase: jest.Mocked<ICreateCommandFromPlaybookUseCase>;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'command-handler-test-'));
    mockUseCase = {
      execute: jest.fn().mockResolvedValue({
        commandId: 'test-command-123',
        name: 'Test Command',
        slug: 'test-command',
      }),
    };
    mockLoadApiKey.mockReturnValue('');
    mockDecodeApiKey.mockReturnValue(null);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
    jest.clearAllMocks();
  });

  describe('when creating a command from valid playbook file', () => {
    let result: Awaited<ReturnType<typeof createCommandHandler>>;

    beforeEach(async () => {
      const playbook = {
        name: 'Test Command',
        summary: 'Test summary',
        whenToUse: ['When testing'],
        contextValidationCheckpoints: ['Is valid?'],
        steps: [{ name: 'Step 1', description: 'Do something' }],
      };

      const filePath = path.join(tempDir, 'command-playbook.json');
      await fs.writeFile(filePath, JSON.stringify(playbook));

      result = await createCommandHandler(filePath, mockUseCase);
    });

    it('returns success', () => {
      expect(result.success).toBe(true);
    });

    it('returns the command id', () => {
      expect(result.commandId).toBe('test-command-123');
    });

    it('returns the command name', () => {
      expect(result.commandName).toBe('Test Command');
    });

    it('calls use case with playbook data', () => {
      expect(mockUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Command',
          summary: 'Test summary',
          whenToUse: ['When testing'],
          contextValidationCheckpoints: ['Is valid?'],
          steps: [{ name: 'Step 1', description: 'Do something' }],
        }),
      );
    });
  });

  describe('when credentials are available', () => {
    let result: Awaited<ReturnType<typeof createCommandHandler>>;

    beforeEach(async () => {
      mockLoadApiKey.mockReturnValue('test-api-key');
      mockDecodeApiKey.mockReturnValue({
        host: 'https://app.packmind.ai',
        jwt: {
          organization: {
            id: 'org-123',
            name: 'My Org',
            slug: 'my-org',
            role: 'admin',
          },
        },
      });

      const playbook = {
        name: 'Test Command',
        summary: 'Test summary',
        whenToUse: ['When testing'],
        contextValidationCheckpoints: ['Is valid?'],
        steps: [{ name: 'Step 1', description: 'Do something' }],
      };

      const filePath = path.join(tempDir, 'command-playbook.json');
      await fs.writeFile(filePath, JSON.stringify(playbook));

      result = await createCommandHandler(filePath, mockUseCase);
    });

    it('returns success', () => {
      expect(result.success).toBe(true);
    });

    it('returns webapp URL', () => {
      expect(result.webappUrl).toBe(
        'https://app.packmind.ai/org/my-org/space/global/commands/test-command-123',
      );
    });
  });

  describe('when file is not found', () => {
    let result: Awaited<ReturnType<typeof createCommandHandler>>;

    beforeEach(async () => {
      result = await createCommandHandler('/nonexistent.json', mockUseCase);
    });

    it('returns failure', () => {
      expect(result.success).toBe(false);
    });

    it('returns an error', () => {
      expect(result.error).toBeDefined();
    });

    it('does not call use case', () => {
      expect(mockUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('when playbook is invalid', () => {
    let result: Awaited<ReturnType<typeof createCommandHandler>>;

    beforeEach(async () => {
      const filePath = path.join(tempDir, 'invalid.json');
      await fs.writeFile(filePath, '{ "invalid": "structure" }');

      result = await createCommandHandler(filePath, mockUseCase);
    });

    it('returns failure', () => {
      expect(result.success).toBe(false);
    });

    it('returns an error', () => {
      expect(result.error).toBeDefined();
    });

    it('does not call use case', () => {
      expect(mockUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('when use case throws error', () => {
    let result: Awaited<ReturnType<typeof createCommandHandler>>;

    beforeEach(async () => {
      mockUseCase.execute.mockRejectedValue(new Error('API failed'));
      const playbook = {
        name: 'Test',
        summary: 'Test',
        whenToUse: ['Test'],
        contextValidationCheckpoints: ['Test'],
        steps: [{ name: 'Step', description: 'Desc' }],
      };
      const filePath = path.join(tempDir, 'playbook.json');
      await fs.writeFile(filePath, JSON.stringify(playbook));

      result = await createCommandHandler(filePath, mockUseCase);
    });

    it('returns failure', () => {
      expect(result.success).toBe(false);
    });

    it('returns the error message', () => {
      expect(result.error).toContain('API failed');
    });
  });

  describe('when reading from stdin (no file path)', () => {
    describe('with valid JSON from stdin', () => {
      let result: Awaited<ReturnType<typeof createCommandHandler>>;

      beforeEach(async () => {
        const playbook = {
          name: 'Stdin Command',
          summary: 'Created from stdin',
          whenToUse: ['When testing stdin'],
          contextValidationCheckpoints: ['Is stdin available?'],
          steps: [{ name: 'Step 1', description: 'Do something' }],
        };
        mockReadStdin.mockResolvedValue(JSON.stringify(playbook));

        result = await createCommandHandler(undefined, mockUseCase);
      });

      it('returns success', () => {
        expect(result.success).toBe(true);
      });

      it('calls use case with parsed data', () => {
        expect(mockUseCase.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Stdin Command',
            summary: 'Created from stdin',
            whenToUse: ['When testing stdin'],
            contextValidationCheckpoints: ['Is stdin available?'],
            steps: [{ name: 'Step 1', description: 'Do something' }],
          }),
        );
      });
    });

    describe('when stdin contains invalid JSON', () => {
      let result: Awaited<ReturnType<typeof createCommandHandler>>;

      beforeEach(async () => {
        mockReadStdin.mockResolvedValue('{invalid json}');
        result = await createCommandHandler(undefined, mockUseCase);
      });

      it('returns failure', () => {
        expect(result.success).toBe(false);
      });

      it('returns validation error', () => {
        expect(result.error).toBeDefined();
      });
    });

    describe('when stdin read fails', () => {
      let result: Awaited<ReturnType<typeof createCommandHandler>>;

      beforeEach(async () => {
        mockReadStdin.mockRejectedValue(
          new Error('No file argument provided and no piped input detected'),
        );
        result = await createCommandHandler(undefined, mockUseCase);
      });

      it('returns failure', () => {
        expect(result.success).toBe(false);
      });

      it('returns the stdin error message', () => {
        expect(result.error).toContain('No file argument provided');
      });
    });
  });
});
