import { checkDeprecatedBinaryName } from './deprecation';

describe('checkDeprecatedBinaryName', () => {
  let warnSpy: jest.SpyInstance;
  const originalArgv = process.argv;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    process.argv = originalArgv;
    warnSpy.mockRestore();
  });

  describe('when invoked as packmind-cli', () => {
    it('logs a deprecation warning on Unix', () => {
      process.argv = ['/usr/bin/node', '/usr/local/bin/packmind-cli'];

      checkDeprecatedBinaryName();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("'packmind-cli' is deprecated"),
      );
    });

    it('logs a deprecation warning on Windows (.cmd)', () => {
      process.argv = [
        'C:\\node.exe',
        'C:\\Users\\user\\AppData\\npm\\packmind-cli.cmd',
      ];

      checkDeprecatedBinaryName();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("'packmind-cli' is deprecated"),
      );
    });
  });

  describe('when invoked as packmind', () => {
    it('does not warn', () => {
      process.argv = ['/usr/bin/node', '/usr/local/bin/packmind'];

      checkDeprecatedBinaryName();

      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  describe('when invoked via node main.cjs (dev mode)', () => {
    it('does not warn', () => {
      process.argv = ['/usr/bin/node', '/path/to/dist/apps/cli/main.cjs'];

      checkDeprecatedBinaryName();

      expect(warnSpy).not.toHaveBeenCalled();
    });
  });
});
