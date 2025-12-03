import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { PackmindLogger } from '@packmind/logger';
import { AuthenticatedRequest } from '@packmind/node-utils';
import { SpaceId, createSpaceId } from '@packmind/types';
import { Observable } from 'rxjs';

const origin = 'SpaceAccessGuard';

/**
 * Guard that validates the space ID in the URL is valid.
 *
 * This guard ensures:
 * 1. The spaceId parameter exists in the URL and is valid
 *
 * Note: Space ownership validation is handled by the use case layer.
 * This guard should be used in conjunction with OrganizationAccessGuard
 * to ensure proper access control at both organization and space levels.
 */
@Injectable()
export class SpaceAccessGuard implements CanActivate {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const spaceIdParam = request.params['spaceId'];

    if (!spaceIdParam) {
      this.logger.warn('Space ID is missing from URL parameters');
      throw new BadRequestException('Space ID is required in URL');
    }

    let spaceId: SpaceId;
    try {
      spaceId = createSpaceId(spaceIdParam);
    } catch (error) {
      this.logger.warn('Invalid space ID format in URL', {
        spaceIdParam,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new BadRequestException('Invalid space ID format');
    }

    this.logger.info('Space access granted', {
      spaceId,
      userId: request.user?.userId,
    });

    return true;
  }
}
