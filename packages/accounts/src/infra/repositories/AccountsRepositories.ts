import { DataSource } from 'typeorm';
import { IAccountsRepositories } from '../../domain/repositories/IAccountsRepositories';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { IOrganizationRepository } from '../../domain/repositories/IOrganizationRepository';
import { IInvitationRepository } from '../../domain/repositories/IInvitationRepository';
import { IPasswordResetTokenRepository } from '../../domain/repositories/IPasswordResetTokenRepository';
import { ICliLoginCodeRepository } from '../../domain/repositories/ICliLoginCodeRepository';
import { ITrialActivationRepository } from '../../domain/repositories/ITrialActivationRepository';
import { IUserMetadataRepository } from '../../domain/repositories/IUserMetadataRepository';
import { UserRepository } from './UserRepository';
import { OrganizationRepository } from './OrganizationRepository';
import { InvitationRepository } from './InvitationRepository';
import { PasswordResetTokenRepository } from './PasswordResetTokenRepository';
import { CliLoginCodeRepository } from './CliLoginCodeRepository';
import { TrialActivationRepository } from './TrialActivationRepository';
import { UserMetadataRepository } from './UserMetadataRepository';
import { UserSchema } from '../schemas/UserSchema';
import { OrganizationSchema } from '../schemas/OrganizationSchema';
import { InvitationSchema } from '../schemas/InvitationSchema';
import { PasswordResetTokenSchema } from '../schemas/PasswordResetTokenSchema';
import { CliLoginCodeSchema } from '../schemas/CliLoginCodeSchema';
import { TrialActivationSchema } from '../schemas/TrialActivationSchema';
import { UserMetadataSchema } from '../schemas/UserMetadataSchema';
import { UserOrganizationMembershipSchema } from '../schemas/UserOrganizationMembershipSchema';
import { UserOrganizationMembershipRepository } from './UserOrganizationMembershipRepository';
import { IUserOrganizationMembershipRepository } from '../../domain/repositories/IUserOrganizationMembershipRepository';

/**
 * AccountsRepositories - Repository aggregator implementation for the Accounts domain
 *
 * This class serves as the main repository access point, aggregating all
 * individual repositories. It handles the instantiation of repositories
 * using the shared DataSource and provides them through getter methods.
 */
export class AccountsRepositories implements IAccountsRepositories {
  private readonly userRepository: IUserRepository;
  private readonly organizationRepository: IOrganizationRepository;
  private readonly invitationRepository: IInvitationRepository;
  private readonly passwordResetTokenRepository: IPasswordResetTokenRepository;
  private readonly userOrganizationMembershipRepository: IUserOrganizationMembershipRepository;
  private readonly cliLoginCodeRepository: ICliLoginCodeRepository;
  private readonly trialActivationRepository: ITrialActivationRepository;
  private readonly userMetadataRepository: IUserMetadataRepository;

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
    this.passwordResetTokenRepository = new PasswordResetTokenRepository(
      this.dataSource.getRepository(PasswordResetTokenSchema),
    );
    this.userOrganizationMembershipRepository =
      new UserOrganizationMembershipRepository(
        this.dataSource.getRepository(UserOrganizationMembershipSchema),
      );
    this.cliLoginCodeRepository = new CliLoginCodeRepository(
      this.dataSource.getRepository(CliLoginCodeSchema),
    );
    this.trialActivationRepository = new TrialActivationRepository(
      this.dataSource.getRepository(TrialActivationSchema),
    );
    this.userMetadataRepository = new UserMetadataRepository(
      this.dataSource.getRepository(UserMetadataSchema),
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

  getUserOrganizationMembershipRepository(): IUserOrganizationMembershipRepository {
    return this.userOrganizationMembershipRepository;
  }

  getPasswordResetTokenRepository(): IPasswordResetTokenRepository {
    return this.passwordResetTokenRepository;
  }

  getCliLoginCodeRepository(): ICliLoginCodeRepository {
    return this.cliLoginCodeRepository;
  }

  getTrialActivationRepository(): ITrialActivationRepository {
    return this.trialActivationRepository;
  }

  getUserMetadataRepository(): IUserMetadataRepository {
    return this.userMetadataRepository;
  }
}
