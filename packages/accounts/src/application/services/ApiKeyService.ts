import { ApiKeyPayload, DecodedApiKey } from '../../domain/entities/ApiKey';
import { User, UserOrganizationRole } from '../../domain/entities/User';
import { Organization } from '../../domain/entities/Organization';
import { encodeApiKey, decodeApiKey } from '../../domain/utils/api-key.utils';
import { PackmindLogger, LogLevel } from '@packmind/shared';

const origin = 'ApiKeyService';

/**
 * JWT payload structure expected in API keys
 */
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

/**
 * Type guard to check if a value is a valid JWT payload
 */
function isValidJwtPayload(value: unknown): value is JwtPayload {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  // Check user object
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

  // Check organization object
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

/**
 * JWT service interface to be provided by the implementing layer (API)
 */
export interface IJwtService {
  sign(
    payload: Record<string, unknown>,
    options?: { expiresIn?: string },
  ): string;
  verify(token: string): Record<string, unknown>;
}

/**
 * Service for managing API keys
 */
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

  /**
   * Generates an API key for a user with 3-month validity
   * @param user The user to generate the API key for
   * @param organization The user's organization
   * @param host The API host URL
   * @returns The generated API key string
   */
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
      // Create JWT payload with same structure as regular auth
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

      // Generate JWT with 3-month expiration (90 days)
      const jwt = this.jwtService.sign(jwtPayload, { expiresIn: '90d' });

      // Create API key payload
      const apiKeyPayload: ApiKeyPayload = {
        host,
        jwt,
      };

      // Encode to base64
      const apiKey = encodeApiKey(apiKeyPayload);

      this.logger.info('API key generated successfully', {
        userId: user.id,
        organizationId: organization.id,
      });

      return apiKey;
    } catch (error) {
      this.logger.error('Failed to generate API key', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(`Failed to generate API key: ${error}`);
    }
  }

  /**
   * Validates an API key and extracts user information
   * @param apiKey The API key to validate
   * @returns Decoded and validated API key information
   */
  validateApiKey(apiKey: string): DecodedApiKey {
    this.logger.info('Validating API key');

    try {
      // First decode the API key structure
      const decoded = decodeApiKey(apiKey);

      if (!decoded.isValid) {
        this.logger.warn('API key validation failed', { error: decoded.error });
        return decoded;
      }

      // Validate the embedded JWT token
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

  /**
   * Extracts user information from a valid API key
   * @param apiKey The API key to extract user info from
   * @returns User and organization information, or null if invalid
   */
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

  /**
   * Gets the expiration date from an API key's JWT token
   * @param apiKey The API key to check
   * @returns Expiration date or null if invalid
   */
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
