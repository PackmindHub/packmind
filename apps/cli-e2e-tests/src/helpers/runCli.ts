import { spawn } from 'child_process';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { emitTiming, round } from './timing';

export interface RunCliOptions {
  apiKey?: string;
  cwd?: string;
  home?: string;
  /**
   * Optional data to pipe to the CLI process's stdin. When provided, stdin is
   * set to 'pipe' (instead of the default 'ignore') and this string is written
   * then the stream is closed. Used to answer interactive confirmation prompts.
   */
  stdin?: string;
}

export interface RunCliResult {
  returnCode: number;
  stdout: string;
  stderr: string;
}

/**
 * Parse command string into arguments, respecting quoted strings.
 * Example: 'playbook diff --submit -m "My message"' -> ['diff', '--submit', '-m', 'My message']
 */
function parseCommandArgs(command: string): string[] {
  const args: string[] = [];
  let current = '';
  let quoteChar: '"' | "'" | null = null;

  for (const char of command) {
    if ((char === '"' || char === "'") && quoteChar === null) {
      quoteChar = char;
    } else if (char === quoteChar) {
      quoteChar = null;
    } else if (char === ' ' && quoteChar === null) {
      if (current) {
        args.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }

  if (current) {
    args.push(current);
  }

  return args;
}

/**
 * Runs the Packmind CLI with the given command and options.
 *
 * @param command - The CLI command to run (e.g., 'whoami', 'standards list')
 * @param opts - Optional configuration including API key and working directory
 * @returns Promise resolving to the return code, stdout, and stderr
 */
export async function runCli(
  command: string,
  opts?: RunCliOptions,
): Promise<RunCliResult> {
  const cliPath =
    process.env['CLI_BINARY_PATH'] ??
    path.resolve(__dirname, '../../../../dist/apps/cli/main.cjs');

  const args = parseCommandArgs(command);

  // Only the leading tokens: enough to identify the command in a timing line,
  // without copying message bodies or anything else an argument might carry.
  const commandLabel = args.slice(0, 2).join(' ');
  const enteredAt = performance.now();

  // Use provided HOME or create a temporary one
  const ownsTempHome = !opts?.home;
  const tempHome =
    opts?.home ?? fs.mkdtempSync(path.join(os.tmpdir(), 'cli-e2e-test-'));
  const homeReadyAt = performance.now();

  // Build clean environment by filtering out PACKMIND_API_KEY
  const cleanEnv: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (key !== 'PACKMIND_API_KEY') {
      cleanEnv[key] = value;
    }
  }

  // Set temporary HOME and API key if provided
  const env = {
    ...cleanEnv,
    HOME: tempHome, // Override HOME to prevent loading ~/.packmind/credentials.json
    ...(opts?.apiKey && {
      PACKMIND_API_KEY: opts.apiKey,
    }),
  };

  const stdinMode = opts?.stdin !== undefined ? 'pipe' : 'ignore';

  return new Promise((resolve, reject) => {
    const isJsFile = cliPath.endsWith('.cjs') || cliPath.endsWith('.js');
    const child = isJsFile
      ? spawn('node', [cliPath, ...args], {
          env,
          cwd: opts?.cwd || process.cwd(),
          stdio: [stdinMode, 'pipe', 'pipe'],
        })
      : spawn(cliPath, args, {
          env,
          cwd: opts?.cwd || process.cwd(),
          stdio: [stdinMode, 'pipe', 'pipe'],
        });

    const spawnedAt = performance.now();
    let firstOutputAt: number | undefined;

    if (opts?.stdin !== undefined) {
      child.stdin?.write(opts.stdin);
      child.stdin?.end();
    }

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      firstOutputAt ??= performance.now();
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      firstOutputAt ??= performance.now();
      stderr += data.toString();
    });

    child.on('error', (error) => {
      // Only clean up if we created the temp directory
      if (ownsTempHome) {
        fs.rmSync(tempHome, { recursive: true, force: true });
      }
      reject(error);
    });

    child.on('close', (code, signal) => {
      const closedAt = performance.now();

      // Only clean up if we created the temp directory
      if (ownsTempHome) {
        fs.rmSync(tempHome, { recursive: true, force: true });
      }
      const cleanedAt = performance.now();

      emitTiming('runCli', {
        command: commandLabel,
        code: code ?? (signal ? 1 : 0),
        // Cost of creating this invocation's throwaway HOME. Every call gets a
        // fresh one, which is also why the CLI's own 24h version cache — kept
        // under `os.homedir()` — can never be warm here.
        homeMs: round(homeReadyAt - enteredAt),
        // Node reading, parsing and compiling the CLI bundle before it does
        // any work. Measured ~0.4-0.5s per call, and it is paid every call.
        startupMs:
          firstOutputAt === undefined ? null : round(firstOutputAt - spawnedAt),
        // Output-to-exit. A large value here means the process produced its
        // answer and then would not exit — a handle still open, not slow work.
        lingerMs:
          firstOutputAt === undefined ? null : round(closedAt - firstOutputAt),
        totalMs: round(closedAt - spawnedAt),
        // Synchronous recursive delete, on the worker thread, per invocation.
        cleanupMs: round(cleanedAt - closedAt),
      });

      resolve({
        returnCode: code ?? (signal ? 1 : 0),
        stdout,
        stderr,
      });
    });
  });
}
