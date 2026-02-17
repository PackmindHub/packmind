import { v4 as uuidv4 } from 'uuid';
import {
  createPasswordResetToken,
  createPasswordResetTokenId,
  PasswordResetToken,
  PasswordResetTokenEntity,
  PasswordResetTokenId,
} from '../../domain/entities/PasswordResetToken';
import { User, UserId } from '@packmind/types';
import { IPasswordResetTokenRepository } from '../../domain/repositories/IPasswordResetTokenRepository';
import {
  Configuration,
  MailService,
  removeTrailingSlash,
} from '@packmind/node-utils';
import { PackmindLogger, maskEmail } from '@packmind/logger';

const origin = 'PasswordResetTokenService';
const PASSWORD_RESET_EXPIRATION_HOURS = 4;

export type PasswordResetRequest = {
  email: string;
  user: User;
};

export type PasswordResetCreationRecord = {
  email: string;
  token: PasswordResetTokenEntity;
  userId: UserId;
};

type SendPasswordResetEmailArgs = {
  token: PasswordResetTokenEntity;
  request: PasswordResetRequest;
  applicationUrl: string;
};

export class PasswordResetTokenService {
  private static readonly DEFAULT_APP_WEB_URL = 'http://localhost:8081';

  constructor(
    private readonly passwordResetTokenRepository: IPasswordResetTokenRepository,
    private readonly mailService: MailService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('PasswordResetTokenService initialized');
  }

  async createPasswordResetToken(
    request: PasswordResetRequest,
  ): Promise<PasswordResetCreationRecord> {
    this.logger.info('Creating password reset token', {
      email: maskEmail(request.email),
      userId: request.user.id,
    });

    // Delete any existing tokens for this user
    await this.passwordResetTokenRepository.deleteByUserId(request.user.id);

    const token = this.buildPasswordResetToken(request.user.id);
    const applicationUrl = await this.getApplicationUrl();
    const savedToken = await this.passwordResetTokenRepository.save(token);

    await this.sendPasswordResetEmail({
      token: savedToken,
      request,
      applicationUrl,
    });

    this.logger.info('Password reset token created successfully', {
      tokenId: savedToken.id,
      userId: request.user.id,
    });

    return {
      email: request.email,
      token: savedToken,
      userId: request.user.id,
    };
  }

  async findById(
    id: PasswordResetTokenId,
  ): Promise<PasswordResetTokenEntity | null> {
    this.logger.debug('Finding password reset token by id', { id });
    return this.passwordResetTokenRepository.findById(id);
  }

  async findByToken(
    token: PasswordResetToken,
  ): Promise<PasswordResetTokenEntity | null> {
    this.logger.debug('Finding password reset token by token', {
      token: this.maskToken(token),
    });
    return this.passwordResetTokenRepository.findByToken(token);
  }

  async findLatestByUserId(
    userId: UserId,
  ): Promise<PasswordResetTokenEntity | null> {
    this.logger.debug('Finding latest password reset token by user id', {
      userId,
    });
    return this.passwordResetTokenRepository.findLatestByUserId(userId);
  }

  async save(
    token: PasswordResetTokenEntity,
  ): Promise<PasswordResetTokenEntity> {
    this.logger.debug('Saving password reset token', { tokenId: token.id });
    return this.passwordResetTokenRepository.save(token);
  }

  async delete(id: PasswordResetTokenId): Promise<void> {
    this.logger.debug('Deleting password reset token', { id });
    return this.passwordResetTokenRepository.delete(id);
  }

  async deleteByUserId(userId: UserId): Promise<void> {
    this.logger.debug('Deleting password reset tokens by user id', { userId });
    return this.passwordResetTokenRepository.deleteByUserId(userId);
  }

  private buildPasswordResetToken(userId: UserId): PasswordResetTokenEntity {
    const expirationDate = new Date(
      Date.now() + PASSWORD_RESET_EXPIRATION_HOURS * 60 * 60 * 1000,
    );

    return {
      id: createPasswordResetTokenId(uuidv4()),
      userId,
      token: createPasswordResetToken(uuidv4()),
      expirationDate,
    };
  }

  private async sendPasswordResetEmail({
    token,
    request,
    applicationUrl,
  }: SendPasswordResetEmailArgs): Promise<void> {
    const resetUrl = this.buildPasswordResetUrl(token.token, applicationUrl);
    const { subject, contentHtml, contentText } = this.buildEmailContent({
      resetUrl,
      token,
      recipientEmail: request.email,
    });

    this.logger.info('Sending password reset email', {
      recipient: maskEmail(request.email),
      tokenId: token.id,
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
      default: PasswordResetTokenService.DEFAULT_APP_WEB_URL,
    });
    return PasswordResetTokenService.DEFAULT_APP_WEB_URL;
  }

  private buildPasswordResetUrl(
    token: PasswordResetToken,
    appUrl: string,
  ): string {
    const baseUrl = removeTrailingSlash(appUrl);
    return `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
  }

  private buildEmailContent({
    resetUrl,
    token,
    recipientEmail,
  }: {
    resetUrl: string;
    token: PasswordResetTokenEntity;
    recipientEmail: string;
  }) {
    const subject = 'Reset your Packmind password';
    const expirationText = this.formatExpiration(token.expirationDate);

    const contentHtml = `
      <p>Hello ${recipientEmail},</p>
      <p>We received a request to reset your password for your Packmind account.</p>
      <p>Your password reset link expires on <strong>${expirationText}</strong>.</p>
      <p><a href="${resetUrl}">Reset your password</a></p>
      <p>If you didn't request this password reset, you can safely ignore this email.</p>
    `;

    const contentText = `Hello ${recipientEmail},

We received a request to reset your password for your Packmind account.
Your password reset link expires on ${expirationText}.

Reset your password: ${resetUrl}

If you didn't request this password reset, you can safely ignore this email.`;

    return {
      subject,
      contentHtml,
      contentText,
    };
  }

  private formatExpiration(expirationDate: Date): string {
    return expirationDate.toUTCString();
  }

  async sendSocialLoginReminderEmail(
    email: string,
    providerDisplayNames: string[],
  ): Promise<void> {
    const applicationUrl = await this.getApplicationUrl();
    const signInUrl = `${applicationUrl}/sign-in`;

    const subject = 'Sign in to your Packmind account';

    const providerList = this.formatProviderList(providerDisplayNames);
    const providerMessage = providerList
      ? `Your account uses <strong>${providerList}</strong> to sign in.`
      : 'Your account uses social login to sign in.';
    const providerMessageText = providerList
      ? `Your account uses ${providerList} to sign in.`
      : 'Your account uses social login to sign in.';

    const contentHtml = `
      <p>Hello ${email},</p>
      <p>We received a request to reset your password for your Packmind account.</p>
      <p>${providerMessage} Please sign in using your social login provider.</p>
      <p><a href="${signInUrl}">Sign in to Packmind</a></p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `;

    const contentText = `Hello ${email},

We received a request to reset your password for your Packmind account.
${providerMessageText} Please sign in using your social login provider.

Sign in to Packmind: ${signInUrl}

If you didn't request this, you can safely ignore this email.`;

    this.logger.info('Sending social login reminder email', {
      recipient: maskEmail(email),
    });

    await this.mailService.sendEmail({
      recipient: email,
      subject,
      contentHtml,
      contentText,
    });
  }

  private formatProviderList(providerDisplayNames: string[]): string {
    if (providerDisplayNames.length === 0) {
      return '';
    }
    const capitalizedNames = providerDisplayNames.map(
      (name) => name.charAt(0).toUpperCase() + name.slice(1),
    );
    if (capitalizedNames.length === 1) {
      return capitalizedNames[0];
    }
    return (
      capitalizedNames.slice(0, -1).join(', ') +
      ' or ' +
      capitalizedNames[capitalizedNames.length - 1]
    );
  }

  private maskToken(token: PasswordResetToken): string {
    const tokenStr = token as string;
    if (tokenStr.length <= 8) {
      return '***';
    }
    return `${tokenStr.slice(0, 4)}***${tokenStr.slice(-4)}`;
  }
}
