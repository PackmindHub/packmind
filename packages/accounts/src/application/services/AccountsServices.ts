import { IAccountsServices } from '../IAccountsServices';
import { UserService } from './UserService';
import { OrganizationService } from './OrganizationService';
import { IAccountsRepository } from '../../domain/repositories/IAccountsRepository';
import { PackmindLogger } from '@packmind/shared';

/**
 * AccountsServices - Service aggregator implementation for the Accounts application layer
 *
 * This class serves as the main service access point, aggregating all
 * individual services. It handles the instantiation of services
 * using the repository aggregator and provides them through getter methods.
 */
export class AccountsServices implements IAccountsServices {
  private readonly userService: UserService;
  private readonly organizationService: OrganizationService;

  constructor(
    private readonly accountsRepository: IAccountsRepository,
    private readonly logger: PackmindLogger,
  ) {
    // Initialize all services with their respective repositories from the aggregator
    this.userService = new UserService(
      this.accountsRepository.getUserRepository(),
      this.logger,
    );
    this.organizationService = new OrganizationService(
      this.accountsRepository.getOrganizationRepository(),
      this.logger,
    );
  }

  getUserService(): UserService {
    return this.userService;
  }

  getOrganizationService(): OrganizationService {
    return this.organizationService;
  }
}
