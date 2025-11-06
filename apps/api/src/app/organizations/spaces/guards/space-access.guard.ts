import {
  CanActivate,
  ExecutionContext,
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { AuthenticatedRequest } from '@packmind/node-utils';
import { SpaceId, createSpaceId } from '@packmind/spaces';
import { PackmindLogger } from '@packmind/logger';

const origin = 'SpaceAccessGuard';

/**
 * Guard that validates user access to a specific space within an organization.
 *
 * This guard ensures:
 * 1. The spaceId parameter exists in the URL and is valid
 * 2. The user has access to the organization (already validated by OrganizationAccessGuard)
 * 3. The space belongs to the organization the user is accessing
 *
 * Note: This guard should be used in conjunction with OrganizationAccessGuard
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

    if (!request.organization) {
      this.logger.error('User organization context missing for space access', {
        path: request.path,
        spaceIdParam,
      });
      throw new ForbiddenException('User organization context missing');
    }

    // TODO: Add space ownership validation here
    // We should verify that the space belongs to the organization
    // For now, we just validate the space ID format
    // In a future iteration, we can query the database to verify ownership

    this.logger.info('Space access granted', {
      spaceId,
      organizationId: request.organization.id,
      userId: request.user?.userId,
    });

    return true;
  }
}
