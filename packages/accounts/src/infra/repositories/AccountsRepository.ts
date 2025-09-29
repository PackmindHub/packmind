import { DataSource } from 'typeorm';
import { IAccountsRepository } from '../../domain/repositories/IAccountsRepository';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { IOrganizationRepository } from '../../domain/repositories/IOrganizationRepository';
import { IInvitationRepository } from '../../domain/repositories/IInvitationRepository';
import { UserRepository } from './UserRepository';
import { OrganizationRepository } from './OrganizationRepository';
import { InvitationRepository } from './InvitationRepository';
import { UserSchema } from '../schemas/UserSchema';
import { OrganizationSchema } from '../schemas/OrganizationSchema';
import { InvitationSchema } from '../schemas/InvitationSchema';

/**
 * AccountsRepository - Repository aggregator implementation for the Accounts domain
 *
 * This class serves as the main repository access point, aggregating all
 * individual repositories. It handles the instantiation of repositories
 * using the shared DataSource and provides them through getter methods.
 */
export class AccountsRepository implements IAccountsRepository {
  private readonly userRepository: IUserRepository;
  private readonly organizationRepository: IOrganizationRepository;
  private readonly invitationRepository: IInvitationRepository;

  constructor(private readonly dataSource: DataSource) {
    // Initialize all repositories with their respective schemas
    this.userRepository = new UserRepository(
      this.dataSource.getRepository(UserSchema),
    );
    this.organizationRepository = new OrganizationRepository(
      this.dataSource.getRepository(OrganizationSchema),
    );
    this.invitationRepository = new InvitationRepository(
      this.dataSource.getRepository(InvitationSchema),
    );
  }

  getUserRepository(): IUserRepository {
    return this.userRepository;
  }

  getOrganizationRepository(): IOrganizationRepository {
    return this.organizationRepository;
  }

  getInvitationRepository(): IInvitationRepository {
    return this.invitationRepository;
  }
}
