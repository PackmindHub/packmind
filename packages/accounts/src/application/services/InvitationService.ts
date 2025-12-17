import { v4 as uuidv4 } from 'uuid';
import {
  Invitation,
  InvitationToken,
  InvitationId,
  createInvitationId,
  createInvitationToken,
} from '../../domain/entities/Invitation';
import { Organization } from '@packmind/types';
import { User, UserId } from '@packmind/types';
import { IInvitationRepository } from '../../domain/repositories/IInvitationRepository';
import { PackmindLogger, maskEmail } from '@packmind/logger';
import {
  MailService,
  Configuration,
  removeTrailingSlash,
} from '@packmind/node-utils';

const origin = 'InvitationService';
const INVITATION_EXPIRATION_HOURS = 48;

export type InvitationCreationRequest = {
  email: string;
  user: User;
  organization: Organization;
  inviter: User;
};

export type InvitationCreationRecord = {
  email: string;
  invitation: Invitation;
  userId: UserId;
};

export type InvitationResendRecord = {
  email: string;
  invitation: Invitation;
  userId: UserId;
  wasResent: boolean;
};

type SendInvitationEmailArgs = {
  invitation: Invitation;
  request: InvitationCreationRequest;
  applicationUrl: string;
};

export class InvitationService {
  private static readonly DEFAULT_APP_WEB_URL = 'http://localhost:8081';

  constructor(
    private readonly invitationRepository: IInvitationRepository,
    private readonly mailService: MailService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('InvitationService initialized');
  }

  async createInvitations(
    requests: InvitationCreationRequest[],
  ): Promise<InvitationCreationRecord[]> {
    if (requests.length === 0) {
      this.logger.warn(
        'Attempted to create invitations with empty request set',
      );
      return [];
    }

    this.logger.info('Creating invitations', {
      count: requests.length,
    });

    const invitations = requests.map((request) =>
      this.buildInvitation(request.user.id),
    );

    const applicationUrl = await this.getApplicationUrl();
    const savedInvitations =
      await this.invitationRepository.addMany(invitations);

    await Promise.all(
      savedInvitations.map((invitation, index) =>
        this.sendInvitationEmail({
          invitation,
          request: requests[index],
          applicationUrl,
        }),
      ),
    );

    this.logger.info('Invitations created successfully', {
      count: savedInvitations.length,
    });

    return savedInvitations.map((invitation, index) => ({
      email: requests[index].email,
      invitation,
      userId: requests[index].user.id,
    }));
  }

  // Methods from our ListInvitations implementation
  async findById(id: InvitationId): Promise<Invitation | null> {
    this.logger.debug('Finding invitation by id', { id });
    return this.invitationRepository.findById(id);
  }

  async findByToken(token: InvitationToken): Promise<Invitation | null> {
    this.logger.debug('Finding invitation by token', {
      token: this.maskToken(token),
    });
    return this.invitationRepository.findByToken(token);
  }

  async findByUserId(userId: UserId): Promise<Invitation[]> {
    this.logger.debug('Finding invitations by user id', { userId });
    return this.invitationRepository.findByUserId(userId);
  }

  async findLatestByUserId(userId: UserId): Promise<Invitation | null> {
    this.logger.debug('Finding latest invitation by user id', { userId });
    return this.invitationRepository.findLatestByUserId(userId);
  }

  async findByUserIds(userIds: UserId[]): Promise<Invitation[]> {
    this.logger.debug('Finding invitations by user ids', {
      count: userIds.length,
    });
    return this.invitationRepository.findByUserIds(userIds);
  }

  async save(invitation: Invitation): Promise<Invitation> {
    this.logger.debug('Saving invitation', { invitation });
    return this.invitationRepository.save(invitation);
  }

  async delete(id: InvitationId): Promise<void> {
    this.logger.debug('Deleting invitation', { id });
    return this.invitationRepository.delete(id);
  }

  async resendInvitationEmail(
    invitation: Invitation,
    request: InvitationCreationRequest,
  ): Promise<void> {
    this.logger.info('Resending invitation email', {
      recipient: maskEmail(request.email),
      invitationId: invitation.id,
    });

    const applicationUrl = await this.getApplicationUrl();
    await this.sendInvitationEmail({
      invitation,
      request,
      applicationUrl,
    });
  }

  async createInvitationForExistingUser(
    request: InvitationCreationRequest,
  ): Promise<InvitationCreationRecord> {
    this.logger.info('Creating new invitation for existing user', {
      userId: request.user.id,
      email: maskEmail(request.email),
    });

    const invitation = this.buildInvitation(request.user.id);
    const applicationUrl = await this.getApplicationUrl();
    const savedInvitation = await this.invitationRepository.save(invitation);

    await this.sendInvitationEmail({
      invitation: savedInvitation,
      request,
      applicationUrl,
    });

    return {
      email: request.email,
      invitation: savedInvitation,
      userId: request.user.id,
    };
  }

  private buildInvitation(userId: UserId): Invitation {
    const expirationDate = new Date(
      Date.now() + INVITATION_EXPIRATION_HOURS * 60 * 60 * 1000,
    );

    return {
      id: createInvitationId(uuidv4()),
      userId,
      token: createInvitationToken(uuidv4()),
      expirationDate,
    };
  }

  private async sendInvitationEmail({
    invitation,
    request,
    applicationUrl,
  }: SendInvitationEmailArgs): Promise<void> {
    const invitationUrl = this.buildInvitationUrl(
      invitation.token,
      applicationUrl,
    );
    const { subject, contentHtml, contentText } = this.buildEmailContent({
      invitationUrl,
      organization: request.organization,
      invitation,
      recipientEmail: request.email,
      inviter: request.inviter,
    });

    this.logger.info('Sending invitation email', {
      recipient: maskEmail(request.email),
      organizationId: request.organization.id,
      invitationId: invitation.id,
    });

    await this.mailService.sendEmail({
      recipient: request.email,
      subject,
      contentHtml,
      contentText,
    });
  }

  private async getApplicationUrl(): Promise<string> {
    const configValue = await Configuration.getConfig('APP_WEB_URL');
    if (configValue) {
      return removeTrailingSlash(configValue);
    }
    this.logger.warn('Failed to get APP_WEB_URL value, using default', {
      configValue,
      default: InvitationService.DEFAULT_APP_WEB_URL,
    });
    return InvitationService.DEFAULT_APP_WEB_URL;
  }

  private buildInvitationUrl(token: InvitationToken, appUrl: string): string {
    const baseUrl = removeTrailingSlash(appUrl);
    return `${baseUrl}/activate?token=${encodeURIComponent(token)}`;
  }

  private buildEmailContent({
    invitationUrl,
    organization,
    invitation,
    recipientEmail,
    inviter,
  }: {
    invitationUrl: string;
    organization: Organization;
    invitation: Invitation;
    recipientEmail: string;
    inviter: User;
  }) {
    const inviterLabel = inviter.email ?? 'An administrator';
    const subject = `You're invited to join ${organization.name} on Packmind`;
    const expirationText = this.formatExpiration(invitation.expirationDate);

    const contentHtml = `
      <p>Hello ${recipientEmail},</p>
      <p>${inviterLabel} invited you to join <strong>${organization.name}</strong> on Packmind.</p>
      <p>Your invitation expires on <strong>${expirationText}</strong>.</p>
      <p><a href="${invitationUrl}">Accept your invitation</a></p>
      <p>If you weren't expecting this, you can safely ignore this email.</p>
    `;

    const contentText = `Hello ${recipientEmail},

${inviterLabel} invited you to join ${organization.name} on Packmind.
Your invitation expires on ${expirationText}.

Accept your invitation: ${invitationUrl}

If you weren't expecting this, you can safely ignore this email.`;

    return {
      subject,
      contentHtml,
      contentText,
    };
  }

  private formatExpiration(expirationDate: Date): string {
    return expirationDate.toUTCString();
  }

  private maskToken(token: InvitationToken): string {
    const tokenStr = token as string;
    if (tokenStr.length <= 8) {
      return '***';
    }
    return `${tokenStr.slice(0, 4)}***${tokenStr.slice(-4)}`;
  }
}
