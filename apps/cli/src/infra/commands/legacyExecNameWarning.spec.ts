import {
  LEGACY_EXEC_NAME_WARNING,
  warnOnLegacyExecName,
} from './legacyExecNameWarning';
import { CANONICAL_EXEC_NAME, LEGACY_EXEC_NAME } from '../utils/execName';

describe('warnOnLegacyExecName', () => {
  let logWarning: jest.Mock<void, [string]>;

  beforeEach(() => {
    logWarning = jest.fn();
  });

  describe('when invoked under the legacy exec name', () => {
    beforeEach(() => {
      warnOnLegacyExecName(
        ['/usr/local/bin/node', `/usr/local/bin/${LEGACY_EXEC_NAME}`, 'lint'],
        logWarning,
      );
    });

    it('warns once', () => {
      expect(logWarning).toHaveBeenCalledTimes(1);
    });

    it('names the deprecated executable', () => {
      expect(logWarning).toHaveBeenCalledWith(
        expect.stringContaining(LEGACY_EXEC_NAME),
      );
    });

    it('points to the canonical executable', () => {
      expect(logWarning).toHaveBeenCalledWith(
        expect.stringContaining(`Use \`${CANONICAL_EXEC_NAME}\` instead.`),
      );
    });

    it('warns with the shared message', () => {
      expect(logWarning).toHaveBeenCalledWith(LEGACY_EXEC_NAME_WARNING);
    });
  });

  describe('when invoked under the canonical exec name', () => {
    it('stays silent', () => {
      warnOnLegacyExecName(
        [`/usr/local/bin/${CANONICAL_EXEC_NAME}`, 'lint'],
        logWarning,
      );

      expect(logWarning).not.toHaveBeenCalled();
    });
  });

  describe('when the exec name cannot be recognised', () => {
    it('stays silent', () => {
      warnOnLegacyExecName(
        ['/usr/local/bin/node', '/repo/dist/apps/cli/main.cjs'],
        logWarning,
      );

      expect(logWarning).not.toHaveBeenCalled();
    });
  });
});
