import {
  Gateway,
  IGenerateApiKeyUseCase,
  ISignInUserUseCase,
  ISignUpWithOrganizationUseCase,
  PublicGateway,
} from '@packmind/types';
import { IAuthGateway } from '../IPackmindGateway';

export class AuthGateway implements IAuthGateway {
  private authCookie?: string;

  constructor(private readonly baseUrl: string) {}
  signin: PublicGateway<ISignInUserUseCase> = async (command) => {
    // Step 2: Sign in to get auth cookie
    const signinResponse = await fetch(`${this.baseUrl}/api/v0/auth/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        email: command.email,
        password: command.password,
      }),
    });

    if (!signinResponse.ok) {
      throw new Error(
        `Failed to sign in: ${signinResponse.status} ${signinResponse.statusText}`,
      );
    }

    // Store auth cookie for subsequent authenticated requests
    const cookies = signinResponse.headers.get('set-cookie');
    if (cookies) {
      this.authCookie = cookies;
    }

    return signinResponse.json();
  };

  signup: PublicGateway<ISignUpWithOrganizationUseCase> = async (command) => {
    // Step 1: Sign up the user
    const signupResponse = await fetch(`${this.baseUrl}/api/v0/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: command.email,
        password: command.password,
        method: command.method,
      }),
    });

    if (!signupResponse.ok) {
      throw new Error(
        `Failed to sign up: ${signupResponse.status} ${signupResponse.statusText}`,
      );
    }

    return signupResponse.json();
  };

  generateApiKey: Gateway<IGenerateApiKeyUseCase> = async () => {
    if (!this.authCookie) {
      throw new Error('Not authenticated. Call signin first.');
    }

    const response = await fetch(
      `${this.baseUrl}/api/v0/auth/api-key/generate`,
      {
        method: 'POST',
        headers: {
          Cookie: this.authCookie,
          'Content-Type': 'application/json',
        },
      },
    );

    if (!response.ok) {
      throw new Error(
        `Failed to generate API key: ${response.status} ${response.statusText}`,
      );
    }

    return response.json();
  };
}
