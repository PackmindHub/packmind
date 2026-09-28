import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  appendErrorLog,
  getErrorLogPath,
  recordReportedMessage,
  resetErrorLogDeduplication,
} from './errorLog';

jest.unmock('./errorLog');
jest.mock('fs');
jest.mock('os');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockOs = os as jest.Mocked<typeof os>;

describe('errorLog', () => {
  const home = '/home/dev';
  const logPath = path.join(home, '.packmind', 'error.log');
  const now = new Date('2026-09-28T09:12:33.123Z');

  beforeEach(() => {
    jest.clearAllMocks();
    resetErrorLogDeduplication();
    mockOs.homedir.mockReturnValue(home);
    mockFs.existsSync.mockReturnValue(true);
    mockFs.statSync.mockReturnValue({ size: 10 } as fs.Stats);
  });

  const appended = () => String(mockFs.appendFileSync.mock.calls[0][1]);

  describe('getErrorLogPath', () => {
    it('sits next to the other ~/.packmind files', () => {
      expect(getErrorLogPath()).toBe(logPath);
    });
  });

  describe('when an error is appended', () => {
    beforeEach(() => {
      appendErrorLog({
        message: 'Request failed: fetch failed',
        diagnostics: '  Cause chain:\n    1. TypeError: fetch failed',
        argv: ['skills', 'list'],
        now,
      });
    });

    it('writes to the error log', () => {
      expect(mockFs.appendFileSync.mock.calls[0][0]).toBe(logPath);
    });

    it('stamps the entry with the time and the command', () => {
      expect(appended()).toContain(
        '[2026-09-28T09:12:33.123Z] packmind skills list',
      );
    });

    it('records the message the user saw', () => {
      expect(appended()).toContain('Request failed: fetch failed');
    });

    it('records the diagnostics', () => {
      expect(appended()).toContain('    1. TypeError: fetch failed');
    });

    it('keeps the file private to the user', () => {
      expect(mockFs.appendFileSync.mock.calls[0][2]).toEqual({ mode: 0o600 });
    });
  });

  describe('when the command carries options', () => {
    it('records the subcommand without them', () => {
      appendErrorLog({
        message: 'boom',
        argv: ['login', '--code', 'super-secret-code'],
        now,
      });

      expect(appended()).not.toContain('super-secret-code');
    });

    it('still names the subcommand', () => {
      appendErrorLog({
        message: 'boom',
        argv: ['login', '--code', 'super-secret-code'],
        now,
      });

      expect(appended()).toContain('packmind login');
    });
  });

  describe('when the ~/.packmind directory is missing', () => {
    it('creates it', () => {
      mockFs.existsSync.mockReturnValue(false);

      appendErrorLog({ message: 'boom', argv: [], now });

      expect(mockFs.mkdirSync).toHaveBeenCalledWith(
        path.join(home, '.packmind'),
        { recursive: true, mode: 0o700 },
      );
    });
  });

  describe('when the log has grown past its cap', () => {
    it('rotates it aside', () => {
      mockFs.statSync.mockReturnValue({ size: 2 * 1024 * 1024 } as fs.Stats);

      appendErrorLog({ message: 'boom', argv: [], now });

      expect(mockFs.renameSync).toHaveBeenCalledWith(logPath, `${logPath}.old`);
    });
  });

  describe('when the log is still under its cap', () => {
    it('keeps appending to it', () => {
      appendErrorLog({ message: 'boom', argv: [], now });

      expect(mockFs.renameSync).not.toHaveBeenCalled();
    });
  });

  describe('when the filesystem refuses the write', () => {
    it('does not throw', () => {
      mockFs.appendFileSync.mockImplementation(() => {
        throw new Error('EROFS: read-only file system');
      });

      expect(() =>
        appendErrorLog({ message: 'boom', argv: [], now }),
      ).not.toThrow();
    });
  });

  describe('when a retried request fails identically several times', () => {
    beforeEach(() => {
      for (let attempt = 0; attempt < 12; attempt++) {
        appendErrorLog({
          message: 'Request failed: fetch failed',
          diagnostics: '  Request: POST https://packmind.test/install',
          argv: ['install'],
          now,
        });
      }
    });

    it('records it once', () => {
      expect(mockFs.appendFileSync).toHaveBeenCalledTimes(1);
    });
  });

  describe('when two different errors occur in one run', () => {
    beforeEach(() => {
      appendErrorLog({ message: 'first', argv: ['install'], now });
      appendErrorLog({ message: 'second', argv: ['install'], now });
    });

    it('records both', () => {
      expect(mockFs.appendFileSync).toHaveBeenCalledTimes(2);
    });
  });

  describe('recordReportedMessage', () => {
    describe('when nothing has covered the message', () => {
      beforeEach(() => {
        recordReportedMessage('File or directory "/nope" does not exist');
      });

      it('records it', () => {
        expect(appended()).toContain(
          'File or directory "/nope" does not exist',
        );
      });

      it('records where it was reported from', () => {
        expect(appended()).toContain('  Reported at:');
      });

      it('leaves this module out of that stack', () => {
        expect(appended()).not.toContain('recordReportedMessage');
      });
    });

    describe('when a full report already covers the message', () => {
      it('does not restate it without its diagnostics', () => {
        appendErrorLog({
          message: 'Packmind server is not accessible',
          diagnostics: '  Request: GET https://packmind.test/skills',
          argv: ['skills', 'list'],
          now,
        });
        jest.clearAllMocks();

        recordReportedMessage(
          'Failed to list skills:\nPackmind server is not accessible',
        );

        expect(mockFs.appendFileSync).not.toHaveBeenCalled();
      });
    });
  });
});
