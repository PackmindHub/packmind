import { SignUpWithOrganizationResponse } from '@packmind/accounts';

export interface SignUpOptions {
  email: string;
  password: string;
  baseUrl?: string;
}

export interface ApiContext {
  apiKey: string;
  email: string;
  password: string;
  userId: string;
  organizationId: string;
  baseUrl: string;
}

/**
 * Creates a user account via the API and generates an API key.
 *
 * @param opts - Signup options including email and password
 * @returns Context containing API key and user information
 */
export async function createUserWithApiKey(
  opts: SignUpOptions,
): Promise<ApiContext> {
  const baseUrl = opts.baseUrl || 'http://localhost:4200';

  // Step 1: Sign up the user
  const signupResponse = await fetch(`${baseUrl}/api/v0/auth/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: opts.email,
      password: opts.password,
      method: 'password',
    }),
  });

  if (!signupResponse.ok) {
    throw new Error(
      `Failed to sign up user: ${signupResponse.status} ${signupResponse.statusText}`,
    );
  }

  const signupData: SignUpWithOrganizationResponse =
    await signupResponse.json();

  // Step 2: Sign in to get auth cookie
  const signinResponse = await fetch(`${baseUrl}/api/v0/auth/signin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Include cookies in requests
    body: JSON.stringify({
      email: opts.email,
      password: opts.password,
    }),
  });

  if (!signinResponse.ok) {
    throw new Error(
      `Failed to sign in user: ${signinResponse.status} ${signinResponse.statusText}`,
    );
  }

  // Extract auth cookie from response
  const cookies = signinResponse.headers.get('set-cookie');
  if (!cookies) {
    throw new Error('No auth cookie received from signin');
  }

  // Step 3: Generate API key using the auth cookie
  const apiKeyResponse = await fetch(
    `${baseUrl}/api/v0/auth/api-key/generate`,
    {
      method: 'POST',
      headers: {
        Cookie: cookies,
        'Content-Type': 'application/json',
      },
    },
  );

  if (!apiKeyResponse.ok) {
    throw new Error(
      `Failed to generate API key: ${apiKeyResponse.status} ${apiKeyResponse.statusText}`,
    );
  }

  const apiKeyData: { apiKey: string; expiresAt: string } =
    await apiKeyResponse.json();

  return {
    apiKey: apiKeyData.apiKey,
    email: opts.email,
    password: opts.password,
    userId: signupData.user.id,
    organizationId: signupData.organization.id,
    baseUrl,
  };
}
