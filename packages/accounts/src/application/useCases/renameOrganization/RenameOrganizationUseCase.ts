import { PackmindLogger } from '@packmind/logger';
import { AbstractAdminUseCase, AdminContext } from '@packmind/node-utils';
import {
  IAccountsPort,
  IRenameOrganizationUseCase,
  RenameOrganizationCommand,
  RenameOrganizationResponse,
} from '@packmind/types';
import { OrganizationService } from '../../services/OrganizationService';
import { InvalidOrganizationNameError } from '../../../domain/errors';

const origin = 'RenameOrganizationUseCase';

export class RenameOrganizationUseCase
  extends AbstractAdminUseCase<
    RenameOrganizationCommand,
    RenameOrganizationResponse
  >
  implements IRenameOrganizationUseCase
{
  constructor(
    accountsPort: IAccountsPort,
    private readonly organizationService: OrganizationService,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
    this.logger.info('RenameOrganizationUseCase initialized');
  }

  async executeForAdmins(
    command: RenameOrganizationCommand & AdminContext,
  ): Promise<RenameOrganizationResponse> {
    this.logger.info('Executing RenameOrganizationUseCase for admin', {
      organizationId: command.organizationId,
      requesterId: command.userId,
    });

    const newName = command.name?.trim();
    if (!newName) {
      this.logger.error('Invalid organization name provided', {
        organizationId: command.organizationId,
      });
      throw new InvalidOrganizationNameError({ name: command.name });
    }

    const updatedOrganization =
      await this.organizationService.renameOrganization(
        command.organization,
        newName,
      );

    this.logger.info('Organization renamed successfully', {
      organizationId: command.organizationId,
      newName,
      changedBy: command.userId,
    });

    return {
      organization: updatedOrganization,
    };
  }
}
