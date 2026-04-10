import * as fs from 'fs';

jest.mock('cmd-ts', () => ({
  command: jest.fn(),
  option: jest.fn(),
  restPositionals: jest.fn(),
  string: 'string',
}));

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(),
  statSync: jest.fn(),
}));

jest.mock('../../PackmindCliHexa', () => ({
  PackmindCliHexa: jest.fn(),
}));

jest.mock('../utils/consoleLogger', () => ({
  logConsole: jest.fn(),
  logErrorConsole: jest.fn(),
  logWarningConsole: jest.fn(),
}));

jest.mock('@packmind/logger', () => ({
  PackmindLogger: jest.fn().mockImplementation(() => ({})),
  LogLevel: { INFO: 'INFO' },
}));

import { install2Handler } from './Install2Command';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import * as consoleLogger from '../utils/consoleLogger';
import { IInstallResult } from '../../domain/useCases/IInstallUseCase';

const mockFs = fs as jest.Mocked<typeof fs>;
const mockConsoleLogger = consoleLogger as jest.Mocked<typeof consoleLogger>;
const MockPackmindCliHexa = PackmindCliHexa as jest.MockedClass<
  typeof PackmindCliHexa
>;

const makeResult = (
  overrides: Partial<IInstallResult> = {},
): IInstallResult => ({
  standardsCount: 0,
  commandsCount: 0,
  skillsCount: 0,
  recipesCount: 0,
  contentFilesChanged: 0,
  missingAccess: [],
  joinSpaceUrl: undefined,
  errors: [],
  ...overrides,
});

const handler = install2Handler;

describe('install2Command', () => {
  let processExitSpy: jest.SpyInstance;
  let mockInstall2: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    processExitSpy = jest
      .spyOn(process, 'exit')
      .mockImplementation(() => undefined as never);

    mockInstall2 = jest.fn().mockResolvedValue(makeResult());
    MockPackmindCliHexa.mockImplementation(
      () => ({ install2: mockInstall2 }) as unknown as PackmindCliHexa,
    );
  });

  describe('--path validation', () => {
    describe('when the path does not exist', () => {
      beforeEach(async () => {
        mockFs.existsSync.mockReturnValue(false);
        await handler({ installPath: 'non/existing', packages: [] });
      });

      it('logs an error message', () => {
        expect(mockConsoleLogger.logErrorConsole).toHaveBeenCalledWith(
          expect.stringContaining('Path does not exist:'),
        );
      });

      it('exits with code 1', () => {
        expect(processExitSpy).toHaveBeenCalledWith(1);
      });

      it('does not call install2', () => {
        expect(mockInstall2).not.toHaveBeenCalled();
      });
    });

    describe('when the path points to a file, not a directory', () => {
      beforeEach(async () => {
        mockFs.existsSync.mockReturnValue(true);
        mockFs.statSync.mockReturnValue({
          isDirectory: () => false,
        } as fs.Stats);
        await handler({
          installPath: '.claude/commands/my-command.md',
          packages: [],
        });
      });

      it('logs an error message', () => {
        expect(mockConsoleLogger.logErrorConsole).toHaveBeenCalledWith(
          expect.stringContaining('Path is not a directory:'),
        );
      });

      it('exits with code 1', () => {
        expect(processExitSpy).toHaveBeenCalledWith(1);
      });

      it('does not call install2', () => {
        expect(mockInstall2).not.toHaveBeenCalled();
      });
    });

    describe('when the path is a valid directory', () => {
      beforeEach(async () => {
        mockFs.existsSync.mockReturnValue(true);
        mockFs.statSync.mockReturnValue({
          isDirectory: () => true,
        } as fs.Stats);
        await handler({ installPath: 'apps/frontend', packages: [] });
      });

      it('does not exit', () => {
        expect(processExitSpy).not.toHaveBeenCalled();
      });

      it('calls install2 with the resolved directory', () => {
        expect(mockInstall2).toHaveBeenCalledWith(
          expect.objectContaining({
            baseDirectory: expect.stringContaining('apps/frontend'),
          }),
        );
      });
    });

    describe('when no path is provided', () => {
      beforeEach(async () => {
        await handler({ installPath: '', packages: [] });
      });

      it('skips path validation', () => {
        expect(mockFs.existsSync).not.toHaveBeenCalled();
      });

      it('calls install2 with process.cwd()', () => {
        expect(mockInstall2).toHaveBeenCalledWith(
          expect.objectContaining({ baseDirectory: process.cwd() }),
        );
      });
    });
  });

  describe('install result handling', () => {
    beforeEach(() => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ isDirectory: () => true } as fs.Stats);
    });

    describe('when there are missing access packages', () => {
      beforeEach(async () => {
        mockInstall2.mockResolvedValue(
          makeResult({
            missingAccess: ['@my-space/pkg-a'],
            contentFilesChanged: 1,
          }),
        );
        await handler({ installPath: 'apps/frontend', packages: [] });
      });

      it('logs a warning with the package name', () => {
        expect(mockConsoleLogger.logWarningConsole).toHaveBeenCalledWith(
          expect.stringContaining('@my-space/pkg-a'),
        );
      });
    });

    describe('when install2 throws', () => {
      beforeEach(async () => {
        mockInstall2.mockRejectedValue(new Error('network failure'));
        await handler({ installPath: 'apps/frontend', packages: [] });
      });

      it('logs the error message', () => {
        expect(mockConsoleLogger.logErrorConsole).toHaveBeenCalledWith(
          expect.stringContaining('network failure'),
        );
      });

      it('exits with code 1', () => {
        expect(processExitSpy).toHaveBeenCalledWith(1);
      });
    });
  });
});
