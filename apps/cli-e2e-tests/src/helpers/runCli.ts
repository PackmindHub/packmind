import { spawn } from 'child_process';
import path from 'path';
import os from 'os';
import fs from 'fs';

export interface RunCliOptions {
  apiKey?: string;
  cwd?: string;
}

export interface RunCliResult {
  returnCode: number;
  stdout: string;
  stderr: string;
}

/**
 * Parse command string into arguments, respecting quoted strings.
 * Example: 'diff --submit -m "My message"' -> ['diff', '--submit', '-m', 'My message']
 */
function parseCommandArgs(command: string): string[] {
  const args: string[] = [];
  let current = '';
  let inQuotes = false;

  for (const char of command) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ' ' && !inQuotes) {
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
  const cliPath = path.resolve(__dirname, '../../../../dist/apps/cli/main.cjs');

  const args = parseCommandArgs(command);

  // Create a temporary HOME directory to avoid loading existing credentials
  const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-e2e-test-'));

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
    const child = spawn('node', [cliPath, ...args], {
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
      // Clean up temporary directory on error
      fs.rmSync(tempHome, { recursive: true, force: true });
      reject(error);
    });

    child.on('close', (code, signal) => {
      // Clean up temporary directory after CLI process completes
      fs.rmSync(tempHome, { recursive: true, force: true });
      resolve({
        returnCode: code ?? (signal ? 1 : 0),
        stdout,
        stderr,
      });
    });
  });
}
