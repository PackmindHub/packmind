import {
  CreateInvitationsCommand,
  CreateInvitationsResponse,
  ICreateInvitationsUseCase,
  InvitationCreationResult,
  InvitationSkipResult,
  DirectMembershipResult,
} from '../../../domain/useCases/ICreateInvitationsUseCase';
import { PackmindLogger } from '@packmind/shared';
import { UserService } from '../../services/UserService';
import { OrganizationService } from '../../services/OrganizationService';
import {
  InvitationCreationRequest,
  InvitationCreationRecord,
  InvitationService,
} from '../../services/InvitationService';
import {
  createOrganizationId,
  Organization,
} from '../../../domain/entities/Organization';
import {
  createUserId,
  User,
  UserOrganizationRole,
} from '../../../domain/entities/User';
import {
  InvitationBatchEmptyError,
  OrganizationNotFoundError,
  InviterNotFoundError,
} from '../../../domain/errors';
import validator from 'validator';

const origin = 'CreateInvitationsUseCase';

export class CreateInvitationsUseCase implements ICreateInvitationsUseCase {
  constructor(
    private readonly userService: UserService,
    private readonly organizationService: OrganizationService,
    private readonly invitationService: InvitationService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('CreateInvitationsUseCase initialized');
  }

  async execute(
    command: CreateInvitationsCommand,
  ): Promise<CreateInvitationsResponse> {
    this.logger.info('Executing CreateInvitationsUseCase', {
      organizationId: command.organizationId,
      inviterId: command.userId,
      emailCount: command.emails.length,
    });

    if (command.emails.length === 0) {
      this.logger.warn('Invitation batch empty');
      throw new InvitationBatchEmptyError();
    }

    const organizationId = createOrganizationId(command.organizationId);
    const inviterId = createUserId(command.userId);

    const organization = await this.ensureOrganizationExists(organizationId);
    const inviter = await this.ensureInviterExists(inviterId);

    const { candidates, skipped: preSkipped } = this.prepareEmails(
      command.emails,
    );

    const {
      requests,
      directMemberships,
      skipped: membershipSkipped,
      originalEmails,
      directMembershipEmails,
    } = await this.buildCreationRequests({
      candidates,
      organization,
      inviter,
      role: command.role,
    });

    const created = await this.handleInvitationCreation(requests);
    const createdResults = this.buildCreationResults(created, originalEmails);
    const directResults = this.buildDirectMembershipResults(
      directMemberships,
      directMembershipEmails,
    );

    const combinedSkipped: InvitationSkipResult[] = [
      ...preSkipped,
      ...membershipSkipped,
    ];

    this.logger.info('CreateInvitationsUseCase completed', {
      created: createdResults.length,
      organizationInvitations: directResults.length,
      skipped: combinedSkipped.length,
    });

    return {
      created: createdResults,
      organizationInvitations: directResults,
      skipped: combinedSkipped,
    };
  }

  private async ensureOrganizationExists(
    organizationId: Organization['id'],
  ): Promise<Organization> {
    const organization =
      await this.organizationService.getOrganizationById(organizationId);

    if (!organization) {
      throw new OrganizationNotFoundError(organizationId as string);
    }

    return organization;
  }

  private async ensureInviterExists(inviterId: User['id']): Promise<User> {
    const inviter = await this.userService.getUserById(inviterId);

    if (!inviter) {
      throw new InviterNotFoundError(inviterId as string);
    }

    return inviter;
  }

  private prepareEmails(emails: string[]): {
    candidates: Array<{ normalized: string; original: string }>;
    skipped: InvitationSkipResult[];
  } {
    const candidateEmails: Array<{ normalized: string; original: string }> = [];
    const skipped: InvitationSkipResult[] = [];
    const seen = new Set<string>();

    emails.forEach((email) => {
      const trimmed = email.trim();
      const normalized = trimmed.toLowerCase();

      if (!trimmed || !validator.isEmail(trimmed)) {
        skipped.push({
          email: trimmed || email,
          reason: 'invalid-email',
        });
        return;
      }

      if (seen.has(normalized)) {
        skipped.push({
          email: trimmed,
          reason: 'duplicate-email',
        });
        return;
      }

      seen.add(normalized);
      candidateEmails.push({
        normalized,
        original: trimmed,
      });
    });

    return { candidates: candidateEmails, skipped };
  }

  private async buildCreationRequests({
    candidates,
    organization,
    inviter,
    role,
  }: {
    candidates: Array<{ normalized: string; original: string }>;
    organization: Organization;
    inviter: User;
    role: UserOrganizationRole;
  }): Promise<{
    requests: InvitationCreationRequest[];
    directMemberships: DirectMembershipResult[];
    skipped: InvitationSkipResult[];
    originalEmails: string[];
    directMembershipEmails: string[];
  }> {
    const requests: InvitationCreationRequest[] = [];
    const directMemberships: DirectMembershipResult[] = [];
    const skipped: InvitationSkipResult[] = [];
    const originalEmails: string[] = [];
    const directMembershipEmails: string[] = [];

    for (const candidate of candidates) {
      const existingUser = await this.userService.getUserByEmailCaseInsensitive(
        candidate.normalized,
      );

      if (existingUser) {
        // Check if user is already active (completed signup)
        if (existingUser.active) {
          // For active users, add them directly to the organization instead of creating invitation
          const isMember = existingUser.memberships?.some(
            (membership) => membership.organizationId === organization.id,
          );

          if (isMember) {
            // User is already a member of this organization
            skipped.push({
              email: candidate.original,
              reason: 'already-member',
            });
            continue;
          }

          // Add organization membership directly for active users
          const userWithMembership =
            await this.userService.addOrganizationMembership(
              existingUser,
              organization.id,
              role,
            );

          this.logger.info(
            'Added active user directly to organization without invitation',
            {
              userId: existingUser.id,
              email: candidate.original,
              organizationId: organization.id,
            },
          );

          directMemberships.push({
            email: candidate.original,
            userId: userWithMembership.id,
            organizationId: organization.id as string,
            role,
          });
          directMembershipEmails.push(candidate.original);
          continue;
        }

        const isMember = existingUser.memberships?.some(
          (membership) => membership.organizationId === organization.id,
        );

        let userWithMembership: User;
        if (isMember) {
          // If user is already a member and inactive, we should allow re-inviting
          // The user is created as a member but hasn't completed signup yet
          this.logger.info(
            'User is already a member but inactive, proceeding with invitation',
            {
              userId: existingUser.id,
              email: candidate.original,
            },
          );
          userWithMembership = existingUser; // User already has membership
        } else {
          // Add organization membership for new member
          userWithMembership = await this.userService.addOrganizationMembership(
            existingUser,
            organization.id,
            role,
          );
        }

        requests.push({
          email: userWithMembership.email,
          user: userWithMembership,
          organization,
          inviter,
        });
        originalEmails.push(candidate.original);
        continue;
      }

      const newUser = await this.userService.createInactiveUser(
        candidate.normalized,
      );

      const userWithMembership =
        await this.userService.addOrganizationMembership(
          newUser,
          organization.id,
          role,
        );

      requests.push({
        email: candidate.normalized,
        user: userWithMembership,
        organization,
        inviter,
      });
      originalEmails.push(candidate.original);
    }

    return {
      requests,
      directMemberships,
      skipped,
      originalEmails,
      directMembershipEmails,
    };
  }

  private async handleInvitationCreation(
    requests: InvitationCreationRequest[],
  ): Promise<InvitationCreationRecord[]> {
    if (requests.length === 0) {
      return [];
    }

    const results: InvitationCreationRecord[] = [];

    for (const request of requests) {
      // Check if user already has invitations
      const existingInvitation =
        await this.invitationService.findLatestByUserId(request.user.id);

      if (existingInvitation) {
        const now = new Date();
        const isExpired = existingInvitation.expirationDate < now;

        if (isExpired) {
          // Create new invitation if expired
          this.logger.info(
            'Creating new invitation for user with expired invitation',
            {
              userId: request.user.id,
              expiredInvitationId: existingInvitation.id,
            },
          );

          const newRecord =
            await this.invitationService.createInvitationForExistingUser(
              request,
            );
          results.push(newRecord);
        } else {
          // Resend email with existing invitation if not expired
          this.logger.info('Resending email for existing valid invitation', {
            userId: request.user.id,
            invitationId: existingInvitation.id,
          });

          await this.invitationService.resendInvitationEmail(
            existingInvitation,
            request,
          );
          results.push({
            email: request.email,
            invitation: existingInvitation,
            userId: request.user.id,
          });
        }
      } else {
        // No existing invitation - create new one using the original service
        this.logger.info(
          'Creating new invitation for user without existing invitation',
          {
            userId: request.user.id,
          },
        );

        const newRecords = await this.invitationService.createInvitations([
          request,
        ]);
        results.push(...newRecords);
      }
    }

    return results;
  }

  private buildCreationResults(
    records: InvitationCreationRecord[],
    originalEmails: string[],
  ): InvitationCreationResult[] {
    return records.map((record, index) => ({
      email: originalEmails[index] ?? record.email,
      userId: record.userId,
      invitation: record.invitation,
    }));
  }

  private buildDirectMembershipResults(
    directMemberships: DirectMembershipResult[],
    originalEmails: string[],
  ): DirectMembershipResult[] {
    return directMemberships.map((membership, index) => ({
      ...membership,
      email: originalEmails[index] ?? membership.email,
    }));
  }
}
