import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PackmindLogger } from '@packmind/logger';
import { ApiKeyService, IJwtService } from '@packmind/accounts';

/**
 * JWT service adapter to bridge NestJS JwtService with accounts package
 */
class JwtServiceAdapter implements IJwtService {
  constructor(private readonly jwtService: JwtService) {}

  sign(
    payload: Record<string, unknown>,
    options?: { expiresIn?: string },
  ): string {
    return this.jwtService.sign(payload, options);
  }

  verify(token: string): Record<string, unknown> {
    return this.jwtService.verify(token);
  }
}

/**
 * Provider for creating API key service with JWT dependencies
 */
@Injectable()
export class ApiKeyServiceProvider {
  createApiKeyService(
    jwtService: JwtService,
    logger: PackmindLogger,
  ): ApiKeyService {
    const jwtServiceAdapter = new JwtServiceAdapter(jwtService);
    return new ApiKeyService(jwtServiceAdapter, logger);
  }
}
