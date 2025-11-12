import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { Observable } from 'rxjs';
import { createOrganizationId, createUserId } from '@packmind/types';
import { ApiKeyService, IJwtService } from '@packmind/accounts';
import { JwtPayload } from './JwtPayload';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { AuthenticatedRequest } from '@packmind/node-utils';
import { IS_PUBLIC_KEY } from '@packmind/node-utils';

// Lightweight adapter to reuse accounts ApiKeyService with Nest JwtService
class JwtServiceAdapter implements IJwtService {
  constructor(private readonly jwtService: JwtService) {}
  sign(payload: Record<string, unknown>, options?: JwtSignOptions) {
    return this.jwtService.sign(payload, options);
  }
  verify(token: string): Record<string, unknown> {
    return this.jwtService.verify(token);
  }
}

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly apiKeyService: ApiKeyService;

  constructor(
    private reflector: Reflector,
    private jwtService: JwtService,
  ) {
    // Instantiate ApiKeyService locally to avoid extra DI wiring
    const logger = new PackmindLogger('ApiKeyAuth', LogLevel.INFO);
    this.apiKeyService = new ApiKeyService(
      new JwtServiceAdapter(jwtService),
      logger,
    );
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    // 1) Try cookie-based JWT (existing behavior)
    const token = request.cookies?.auth_token;
    if (token) {
      try {
        const payload = this.jwtService.verify<JwtPayload>(token);
        if (!payload.organization) {
          throw new UnauthorizedException('No organization in token');
        }
        request.user = payload.user;
        request.organization = payload.organization;
        return true;
      } catch {
        // Fall through to try API key header
      }
    }

    // 2) Try API key from Authorization: Bearer <api_key>
    const authHeader =
      request.headers['authorization'] || request.headers['Authorization'];
    if (!authHeader || Array.isArray(authHeader)) {
      throw new UnauthorizedException('No authentication token or API key');
    }

    const [scheme, value] = authHeader.split(' ');
    if (!scheme || scheme.toLowerCase() !== 'bearer' || !value) {
      throw new UnauthorizedException('Invalid Authorization header');
    }

    const apiKey = value.trim();
    const userInfo = this.apiKeyService.extractUserFromApiKey(apiKey);
    if (!userInfo) {
      throw new UnauthorizedException('Invalid or expired API key');
    }

    // Convert to branded IDs to satisfy types
    request.user = {
      name: userInfo.user.name,
      userId: createUserId(userInfo.user.userId),
    };
    request.organization = {
      id: createOrganizationId(userInfo.organization.id),
      name: userInfo.organization.name,
      slug: userInfo.organization.slug,
      role: 'admin',
    };

    return true;
  }
}
