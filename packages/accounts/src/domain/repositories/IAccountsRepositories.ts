import { IUserRepository } from './IUserRepository';
import { IOrganizationRepository } from './IOrganizationRepository';
import { IInvitationRepository } from './IInvitationRepository';
import { IUserOrganizationMembershipRepository } from './IUserOrganizationMembershipRepository';
import { IPasswordResetTokenRepository } from './IPasswordResetTokenRepository';
import { ICliLoginCodeRepository } from './ICliLoginCodeRepository';
import { IUserMetadataRepository } from './IUserMetadataRepository';

export interface IAccountsRepositories {
  getUserRepository(): IUserRepository;

  getOrganizationRepository(): IOrganizationRepository;

  getInvitationRepository(): IInvitationRepository;

  getUserOrganizationMembershipRepository(): IUserOrganizationMembershipRepository;

  getPasswordResetTokenRepository(): IPasswordResetTokenRepository;

  getCliLoginCodeRepository(): ICliLoginCodeRepository;

  getUserMetadataRepository(): IUserMetadataRepository;
}
