import { spawn } from 'child_process';
import path from 'path';
import os from 'os';
import fs from 'fs';

export interface RunCliOptions {
  apiKey?: string;
  cwd?: string;
  home?: string;
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

  // Use provided HOME or create a temporary one
  const ownsTempHome = !opts?.home;
  const tempHome =
    opts?.home ?? fs.mkdtempSync(path.join(os.tmpdir(), 'cli-e2e-test-'));

  // Build clean environment by filtering out PACKMIND_API_KEY_V3
  const cleanEnv: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (key !== 'PACKMIND_API_KEY_V3') {
      cleanEnv[key] = value;
    }
  }

  // Set temporary HOME and API key if provided
  const env = {
    ...cleanEnv,
    HOME: tempHome, // Override HOME to prevent loading ~/.packmind/credentials.json
    ...(opts?.apiKey && { PACKMIND_API_KEY_V3: opts.apiKey }),
  };

  return new Promise((resolve, reject) => {
    const isJsFile = cliPath.endsWith('.cjs') || cliPath.endsWith('.js');
    const child = isJsFile
      ? spawn('node', [cliPath, ...args], {
          env,
          cwd: opts?.cwd || process.cwd(),
          stdio: ['ignore', 'pipe', 'pipe'],
        })
      : spawn(cliPath, args, {
          env,
          cwd: opts?.cwd || process.cwd(),
          stdio: ['ignore', 'pipe', 'pipe'],
        });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
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
      // Only clean up if we created the temp directory
      if (ownsTempHome) {
        fs.rmSync(tempHome, { recursive: true, force: true });
      }
      resolve({
        returnCode: code ?? (signal ? 1 : 0),
        stdout,
        stderr,
      });
    });
  });
}
