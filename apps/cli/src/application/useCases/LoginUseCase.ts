import * as http from 'http';
import open from 'open';
import * as readline from 'readline';
import { removeTrailingSlash } from '@packmind/node-utils';
import {
  ILoginCommand,
  ILoginResult,
  ILoginUseCase,
} from '../../domain/useCases/ILoginUseCase';
import {
  saveCredentials,
  getCredentialsPath,
} from '../../infra/utils/credentials';

const CALLBACK_PORT = 19284;
const CALLBACK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export interface ILoginDependencies {
  openBrowser: (url: string) => Promise<void>;
  promptForCode: () => Promise<string>;
  exchangeCodeForApiKey: (
    code: string,
    host: string,
  ) => Promise<{ apiKey: string; expiresAt: string }>;
  saveCredentials: (apiKey: string) => void;
  getCredentialsPath: () => string;
  startCallbackServer: () => Promise<string>;
}

async function defaultOpenBrowser(url: string): Promise<void> {
  try {
    await open(url);
  } catch {
    // Browser open failed, caller should handle fallback
    throw new Error('Could not open browser automatically');
  }
}

async function defaultPromptForCode(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('Enter the login code from the browser: ', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function defaultExchangeCodeForApiKey(
  code: string,
  host: string,
): Promise<{ apiKey: string; expiresAt: string }> {
  const normalizedHost = removeTrailingSlash(host);
  const url = `${normalizedHost}/api/v0/auth/cli-login-exchange`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code }),
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Invalid or unknown code. Please try again.');
    }
    if (response.status === 410) {
      throw new Error('Code has expired. Please generate a new one.');
    }

    let errorMsg = `Failed to exchange code: ${response.status} ${response.statusText}`;
    try {
      const errorBody = await response.json();
      if (errorBody && errorBody.message) {
        errorMsg = errorBody.message;
      }
    } catch {
      // ignore if body is not json
    }
    throw new Error(errorMsg);
  }

  return (await response.json()) as { apiKey: string; expiresAt: string };
}

function defaultStartCallbackServer(): Promise<string> {
  return new Promise((resolve, reject) => {
    let timeoutId: NodeJS.Timeout | null = null;

    const server = http.createServer((req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET');

      const url = new URL(req.url || '/', `http://localhost:${CALLBACK_PORT}`);
      const code = url.searchParams.get('code');

      if (code) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));

        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        resolve(code);

        setImmediate(() => {
          server.close();
        });
      } else {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Missing code parameter');
      }
    });

    server.on('error', (err: NodeJS.ErrnoException) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (err.code === 'EADDRINUSE') {
        reject(new Error(`Port ${CALLBACK_PORT} is already in use`));
      } else {
        reject(err);
      }
    });

    server.listen(CALLBACK_PORT, '127.0.0.1', () => {
      // Server started successfully
    });

    timeoutId = setTimeout(() => {
      server.close();
      reject(new Error('Login timed out. Please try again.'));
    }, CALLBACK_TIMEOUT_MS);
  });
}

export class LoginUseCase implements ILoginUseCase {
  private readonly deps: ILoginDependencies;

  constructor(deps?: Partial<ILoginDependencies>) {
    this.deps = {
      openBrowser: deps?.openBrowser ?? defaultOpenBrowser,
      promptForCode: deps?.promptForCode ?? defaultPromptForCode,
      exchangeCodeForApiKey:
        deps?.exchangeCodeForApiKey ?? defaultExchangeCodeForApiKey,
      saveCredentials: deps?.saveCredentials ?? saveCredentials,
      getCredentialsPath: deps?.getCredentialsPath ?? getCredentialsPath,
      startCallbackServer:
        deps?.startCallbackServer ?? defaultStartCallbackServer,
    };
  }

  async execute(command: ILoginCommand): Promise<ILoginResult> {
    const { host, code: providedCode } = command;
    let code: string;

    if (providedCode) {
      code = providedCode;
    } else {
      const callbackPromise = this.deps.startCallbackServer();
      const callbackUrl = `http://127.0.0.1:${CALLBACK_PORT}`;
      const normalizedHost = removeTrailingSlash(host);
      const loginUrl = `${normalizedHost}/cli-login?callback_url=${encodeURIComponent(callbackUrl)}`;

      try {
        await this.deps.openBrowser(loginUrl);
      } catch {
        // Browser open failed - will fall back to manual code entry if callback fails
      }

      try {
        code = await callbackPromise;
      } catch {
        code = await this.deps.promptForCode();
      }
    }

    if (!code) {
      throw new Error('No code received. Login cancelled.');
    }

    const result = await this.deps.exchangeCodeForApiKey(code, host);
    this.deps.saveCredentials(result.apiKey);

    return {
      success: true,
      credentialsPath: this.deps.getCredentialsPath(),
    };
  }
}
