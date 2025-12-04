interface ApiKeyPayload {
  host: string;
  jwt: string;
}

interface JwtPayload {
  user?: {
    name: string;
    userId: string;
  };
  organization?: {
    id: string;
    name: string;
    slug: string;
    role: string;
  };
  exp?: number;
  iat?: number;
}

export interface DecodedApiKeyResult {
  host: string;
  jwt: JwtPayload;
}

/**
 * Decodes an API key to extract host and JWT payload.
 * API key format: base64({ host: string, jwt: string })
 * JWT payload contains: { user, organization, exp, iat }
 */
export function decodeApiKey(apiKey: string): DecodedApiKeyResult | null {
  try {
    // First decode the base64 wrapper to get { host, jwt }
    const jsonString = Buffer.from(apiKey.trim(), 'base64').toString('utf-8');
    const apiKeyPayload = JSON.parse(jsonString) as ApiKeyPayload;

    if (!apiKeyPayload.host || !apiKeyPayload.jwt) {
      return null;
    }

    // Then decode the JWT payload (middle part of JWT)
    const jwtParts = apiKeyPayload.jwt.split('.');
    if (jwtParts.length !== 3) {
      return { host: apiKeyPayload.host, jwt: {} };
    }

    const jwtPayload = Buffer.from(jwtParts[1], 'base64').toString('utf-8');
    const decoded = JSON.parse(jwtPayload) as JwtPayload;

    return { host: apiKeyPayload.host, jwt: decoded };
  } catch {
    return null;
  }
}
