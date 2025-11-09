import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { AuthenticatedRequest } from '@packmind/node-utils';
import { createOrganizationId, OrganizationId } from '@packmind/types';

const origin = 'OrganizationAccessGuard';

/**
 * Guard that validates the user has access to the organization specified in the URL
 * Expected URL pattern: /organizations/:orgId/...
 */
@Injectable()
export class OrganizationAccessGuard implements CanActivate {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.INFO,
    ),
  ) {
    this.logger.info('OrganizationAccessGuard initialized');
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    // Extract orgId from URL params
    const orgIdParam = request.params.orgId as string;

    if (!orgIdParam) {
      this.logger.warn('Organization ID missing from URL', {
        path: request.path,
      });
      throw new BadRequestException('Organization ID is required in URL');
    }

    // Validate orgId format and create branded OrganizationId
    let requestedOrgId: OrganizationId;
    try {
      requestedOrgId = createOrganizationId(orgIdParam);
    } catch (error) {
      this.logger.warn('Invalid organization ID format', {
        orgId: orgIdParam,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new BadRequestException('Invalid organization ID format');
    }

    // Verify user's organization from JWT matches the requested organization
    const userOrgId = request.organization?.id;

    if (!userOrgId) {
      this.logger.error(
        'User organization not found in request - authentication issue',
        {
          path: request.path,
          userId: request.user?.userId,
        },
      );
      throw new ForbiddenException('User organization context missing');
    }

    if (userOrgId !== requestedOrgId) {
      this.logger.warn('User attempted to access different organization', {
        userOrgId,
        requestedOrgId,
        path: request.path,
        userId: request.user?.userId,
      });
      throw new ForbiddenException(
        'Access denied: You do not have access to this organization',
      );
    }

    this.logger.info('Organization access granted', {
      organizationId: requestedOrgId,
      userId: request.user?.userId,
      path: request.path,
    });

    return true;
  }
}
