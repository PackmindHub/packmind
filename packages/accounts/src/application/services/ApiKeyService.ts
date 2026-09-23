import { LogLevel, PackmindLogger } from '@packmind/logger';
import { Organization, User, UserOrganizationRole } from '@packmind/types';
import { ApiKeyPayload, DecodedApiKey } from '../../domain/entities/ApiKey';
import { decodeApiKey, encodeApiKey } from '../../domain/utils/api-key.utils';
import { ApiKeyGenerationFailedError } from '../../domain/errors';

const origin = 'ApiKeyService';

interface JwtPayload {
  user: {
    name: string;
    userId: string;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
    role: string;
  };
  exp?: number;
  iat?: number;
}

function isValidJwtPayload(value: unknown): value is JwtPayload {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  if (
    !('user' in obj) ||
    typeof obj['user'] !== 'object' ||
    obj['user'] === null
  ) {
    return false;
  }

  const user = obj['user'] as Record<string, unknown>;
  if (typeof user['name'] !== 'string' || typeof user['userId'] !== 'string') {
    return false;
  }

  if (
    !('organization' in obj) ||
    typeof obj['organization'] !== 'object' ||
    obj['organization'] === null
  ) {
    return false;
  }

  const organization = obj['organization'] as Record<string, unknown>;
  if (
    typeof organization['id'] !== 'string' ||
    typeof organization['name'] !== 'string' ||
    typeof organization['slug'] !== 'string' ||
    typeof organization['role'] !== 'string'
  ) {
    return false;
  }

  return true;
}

// Port implemented in apps/api, which adapts Nest's JwtService to it.
export interface IJwtService {
  sign(
    payload: Record<string, unknown>,
    options?: { expiresIn?: string | number },
  ): string;
  verify(token: string): Record<string, unknown>;
}

export class ApiKeyService {
  constructor(
    private readonly jwtService: IJwtService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.INFO,
    ),
  ) {
    this.logger.info('ApiKeyService initialized');
  }

  generateApiKey(
    user: User,
    organization: Organization,
    role: UserOrganizationRole,
    host: string,
  ): string {
    this.logger.info('Generating API key', {
      userId: user.id,
      organizationId: organization.id,
      role,
      host,
    });

    try {
      // Must match the cookie sign-in token's shape: the API AuthGuard reads
      // both through one JwtPayload type.
      const jwtPayload = {
        user: {
          name: user.email,
          userId: user.id,
        },
        organization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          role,
        },
      };

      const jwt = this.jwtService.sign(jwtPayload, { expiresIn: '90d' });

      const apiKeyPayload: ApiKeyPayload = {
        host,
        jwt,
      };

      const apiKey = encodeApiKey(apiKeyPayload);

      this.logger.info('API key generated successfully', {
        userId: user.id,
        organizationId: organization.id,
      });

      return apiKey;
    } catch (error) {
      throw new ApiKeyGenerationFailedError(
        user.id,
        organization.id,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  validateApiKey(apiKey: string): DecodedApiKey {
    this.logger.info('Validating API key');

    try {
      const decoded = decodeApiKey(apiKey);

      if (!decoded.isValid) {
        this.logger.warn('API key validation failed', { error: decoded.error });
        return decoded;
      }

      try {
        const rawPayload = this.jwtService.verify(decoded.payload.jwt);

        if (!isValidJwtPayload(rawPayload)) {
          this.logger.warn('API key JWT payload is invalid structure');
          return {
            payload: decoded.payload,
            isValid: false,
            error: 'Invalid JWT payload structure',
          };
        }

        this.logger.info('API key validation successful', {
          userId: rawPayload.user.userId,
          organizationId: rawPayload.organization.id,
        });

        return decoded;
      } catch (jwtError) {
        this.logger.warn('API key JWT validation failed', {
          error:
            jwtError instanceof Error ? jwtError.message : String(jwtError),
        });
        return {
          payload: decoded.payload,
          isValid: false,
          error: `Invalid or expired JWT token: ${jwtError}`,
        };
      }
    } catch (validationError) {
      this.logger.error('API key validation error', {
        error:
          validationError instanceof Error
            ? validationError.message
            : String(validationError),
      });
      return {
        payload: { host: '', jwt: '' },
        isValid: false,
        error: `API key validation error: ${validationError}`,
      };
    }
  }

  extractUserFromApiKey(apiKey: string): {
    user: { name: string; userId: string };
    organization: { id: string; name: string; slug: string; role: string };
  } | null {
    this.logger.info('Extracting user from API key');

    const decoded = this.validateApiKey(apiKey);

    if (!decoded.isValid) {
      this.logger.warn('Cannot extract user from invalid API key', {
        error: decoded.error,
      });
      return null;
    }

    try {
      const rawPayload = this.jwtService.verify(decoded.payload.jwt);

      if (!isValidJwtPayload(rawPayload)) {
        this.logger.error(
          'Failed to extract user from API key: Invalid JWT structure',
        );
        return null;
      }

      this.logger.info('User extracted from API key', {
        userId: rawPayload.user.userId,
        organizationId: rawPayload.organization.id,
      });

      return {
        user: rawPayload.user,
        organization: rawPayload.organization,
      };
    } catch (error) {
      this.logger.error('Failed to extract user from API key', {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  getApiKeyExpiration(apiKey: string): Date | null {
    const decoded = this.validateApiKey(apiKey);

    if (!decoded.isValid) {
      return null;
    }

    try {
      const rawPayload = this.jwtService.verify(decoded.payload.jwt);

      if (!isValidJwtPayload(rawPayload)) {
        return null;
      }

      if (rawPayload.exp && typeof rawPayload.exp === 'number') {
        return new Date(rawPayload.exp * 1000); // JWT exp is in seconds
      }

      return null;
    } catch {
      return null;
    }
  }
}
