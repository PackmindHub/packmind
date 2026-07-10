import { Controller, UseGuards } from '@nestjs/common';
import { OrganizationsSpacesCommandsController } from './commands.controller';
import { OrganizationAccessGuard } from '../../guards/organization-access.guard';

/**
 * Alias controller exposing the space-scoped commands routes under the new
 * `/commands` path ALONGSIDE the legacy `/recipes` path served by
 * {@link OrganizationsSpacesCommandsController}.
 *
 * Actual path: /organizations/:orgId/spaces/:spaceId/commands (inherited via
 * RouterModule in AppModule through {@link CommandsAliasModule}).
 *
 * It extends the base controller to inherit every route handler unchanged.
 * NestJS keys module-path metadata by module CONSTRUCTOR, so the base module
 * cannot be dual-mounted under a second path (it would silently overwrite);
 * a distinct module + controller subclass is required.
 *
 * Class-level decorators are NOT reliably inherited in NestJS, so the base's
 * `@Controller()` and `@UseGuards(OrganizationAccessGuard)` are replicated here
 * explicitly.
 */
@Controller()
@UseGuards(OrganizationAccessGuard)
export class CommandsAliasController extends OrganizationsSpacesCommandsController {}
