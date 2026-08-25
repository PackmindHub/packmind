/* eslint-disable @typescript-eslint/no-require-imports */
import type { PlaybookUnstageHandlerDependencies } from '../commands/playbook/unstageHandler';

/**
 * `EXEC_NAME` is resolved once, at module load, so these tests stub the
 * invocation shape and re-require the modules under test. They are the only
 * tests that prove a rendered message follows the *invoked* name: every
 * assertion here fails if the production string hardcodes `packmind`.
 *
 * The stubbed shapes are the measured ones. A compiled `bun build --compile`
 * binary reports the typed path in `process.argv0` only: `argv[0]` is the
 * literal `bun` and `argv[1]` is the compile-time `/$bunfs/root/<outfile>`
 * path.
 */
const COMPILED_ARGV = ['bun', '/$bunfs/root/packmind-cli-linux-x64'];

const LEGACY_INVOCATION = '/home/dev/.packmind/bin/packmind-cli';
const CANONICAL_INVOCATION = '/home/dev/.packmind/bin/packmind';

const originalArgv0Descriptor = Object.getOwnPropertyDescriptor(
  process,
  'argv0',
) as PropertyDescriptor;
const originalArgv = process.argv;

function stubInvocation(argv0: string, argv: string[]): void {
  Object.defineProperty(process, 'argv0', {
    ...originalArgv0Descriptor,
    value: argv0,
  });
  process.argv = argv;
}

/**
 * Runs `use` against a freshly loaded module graph, so the module-level
 * `EXEC_NAME` const is recomputed from the stubbed invocation.
 */
function asInvoked<T>(argv0: string, argv: string[], use: () => T): T {
  stubInvocation(argv0, argv);
  let result: T | undefined;
  jest.isolateModules(() => {
    result = use();
  });
  return result as T;
}

afterEach(() => {
  Object.defineProperty(process, 'argv0', originalArgv0Descriptor);
  process.argv = originalArgv;
  jest.restoreAllMocks();
});

describe('the startup deprecation warning', () => {
  it('fires for a compiled binary invoked as the legacy name', () => {
    const logWarning = jest.fn();

    asInvoked(LEGACY_INVOCATION, COMPILED_ARGV, () => {
      const {
        warnOnLegacyExecName,
      } = require('../commands/legacyExecNameWarning');
      warnOnLegacyExecName(process.argv, logWarning);
    });

    expect(logWarning).toHaveBeenCalledTimes(1);
  });

  it('stays silent for a compiled binary invoked as the canonical name, even though argv[0] resolves to the legacy filename', () => {
    const logWarning = jest.fn();

    asInvoked(
      CANONICAL_INVOCATION,
      ['/home/dev/.packmind/bin/packmind-cli'],
      () => {
        const {
          warnOnLegacyExecName,
        } = require('../commands/legacyExecNameWarning');
        warnOnLegacyExecName(process.argv, logWarning);
      },
    );

    expect(logWarning).not.toHaveBeenCalled();
  });
});

describe('the console log prefix', () => {
  it('is the legacy name when invoked as the legacy name', () => {
    const logger = { warn: jest.fn() } as unknown as Console;

    asInvoked(LEGACY_INVOCATION, COMPILED_ARGV, () => {
      const { logWarningConsole } = require('./consoleLogger');
      logWarningConsole('something happened', logger);
    });

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('packmind-cli'),
      expect.anything(),
    );
  });

  it('is the canonical name when invoked as the canonical name', () => {
    const logger = { warn: jest.fn() } as unknown as Console;

    asInvoked(CANONICAL_INVOCATION, COMPILED_ARGV, () => {
      const { logWarningConsole } = require('./consoleLogger');
      logWarningConsole('something happened', logger);
    });

    expect(logger.warn).toHaveBeenCalledWith(
      expect.not.stringContaining('packmind-cli'),
      expect.anything(),
    );
  });
});

describe('a handler usage hint', () => {
  function unstageWithoutPath(argv0: string): string[] {
    const errors: string[] = [];
    const errorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation((...args: unknown[]) => {
        errors.push(args.map(String).join(' '));
      });

    asInvoked(argv0, COMPILED_ARGV, () => {
      const {
        playbookUnstageHandler,
      } = require('../commands/playbook/unstageHandler');
      // The missing-path guard returns before any dependency is touched.
      void playbookUnstageHandler({
        filePath: undefined,
        exit: jest.fn(),
      } as unknown as PlaybookUnstageHandlerDependencies);
    });

    errorSpy.mockRestore();
    return errors;
  }

  it('names the legacy executable when invoked as the legacy name', () => {
    expect(unstageWithoutPath(LEGACY_INVOCATION)).toEqual([
      expect.stringContaining('packmind-cli playbook unstage <path>'),
    ]);
  });

  it('names the canonical executable when invoked as the canonical name', () => {
    expect(unstageWithoutPath(CANONICAL_INVOCATION)).toEqual([
      expect.stringContaining('packmind playbook unstage <path>'),
    ]);
  });
});
