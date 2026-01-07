import {
  detectUserOs,
  buildNpmInstallCommand,
  CLI_INSTALL_SCRIPT_URL,
  NPM_INSTALL_COMMAND,
} from './utils';

describe('LocalEnvironmentSetup utils', () => {
  describe('Critical URL constants - NO REGRESSION', () => {
    describe('CLI_INSTALL_SCRIPT_URL', () => {
      it('points to the correct GitHub raw content URL', () => {
        // ⚠️ CRITICAL TEST: This URL must never change without verification
        // If this test fails, it means someone changed the CLI installation URL
        // which will break the installation process for all users.
        expect(CLI_INSTALL_SCRIPT_URL).toBe(
          'https://raw.githubusercontent.com/PackmindHub/packmind/main/apps/cli/scripts/install.sh',
        );
      });
    });

    describe('NPM_INSTALL_COMMAND', () => {
      it('uses the correct npm global install command', () => {
        expect(NPM_INSTALL_COMMAND).toBe('npm install -g @packmind/cli');
      });

      it('installs globally with -g flag', () => {
        expect(NPM_INSTALL_COMMAND).toContain('-g');
      });

      it('uses the correct package name', () => {
        expect(NPM_INSTALL_COMMAND).toContain('@packmind/cli');
      });

      it('uses npm install command', () => {
        expect(NPM_INSTALL_COMMAND).toMatch(/^npm install/);
      });
    });
  });

  describe('buildNpmInstallCommand', () => {
    it('returns the NPM_INSTALL_COMMAND constant', () => {
      expect(buildNpmInstallCommand()).toBe(NPM_INSTALL_COMMAND);
    });

    it('returns the correct npm install command', () => {
      expect(buildNpmInstallCommand()).toBe('npm install -g @packmind/cli');
    });
  });

  describe('detectUserOs', () => {
    const originalNavigator = globalThis.navigator;

    afterEach(() => {
      Object.defineProperty(globalThis, 'navigator', {
        value: originalNavigator,
        writable: true,
        configurable: true,
      });
    });

    it('detects Windows OS', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        writable: true,
        configurable: true,
      });
      expect(detectUserOs()).toBe('windows');
    });

    it('defaults to macos-linux for non-Windows OS', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
        writable: true,
        configurable: true,
      });
      expect(detectUserOs()).toBe('macos-linux');
    });

    it('defaults to macos-linux when navigator is undefined', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: undefined,
        writable: true,
        configurable: true,
      });
      expect(detectUserOs()).toBe('macos-linux');
    });
  });
});
