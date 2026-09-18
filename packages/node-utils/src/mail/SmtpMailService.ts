import { EmailData, MailService } from './MailService';
import { SmtpConfigurationError } from './SmtpConfigurationError';
import { Configuration } from '..';
import { PackmindLogger } from '@packmind/logger';
import nodemailer from 'nodemailer';
import SMTPPool from 'nodemailer/lib/smtp-pool';

type MailOptionsTemplate = {
  from: string;
  to: string;
  subject: string;
  html: string;
};

/**
 * SMTP Mail service implementation using nodemailer.
 *
 * This service provides email functionality through SMTP configuration
 * using environment variables for connection settings.
 */
const origin = 'SmtpMailService';

export class SmtpMailService implements MailService {
  constructor(
    private readonly _logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  getMaskedRecipient(recipient: string): string {
    if (recipient.length <= 6) {
      return recipient;
    }
    const visiblePart = recipient.substring(0, 6);
    const maskedPart = '*'.repeat(recipient.length - 6);
    return visiblePart + maskedPart;
  }

  async isConfigured(): Promise<boolean> {
    try {
      const host = await Configuration.getConfig('SMTP_HOST');
      const port = await Configuration.getConfig('SMTP_PORT');

      if (!host || !port) {
        this._logger.info(
          `SMTP service is not configured - missing host or port`,
        );
        return false;
      }

      return true;
    } catch (error) {
      this._logger.error('Error checking SMTP configuration', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  async sendEmail({
    recipient,
    subject,
    contentHtml,
  }: EmailData): Promise<string> {
    try {
      const isConfigured = await this.isConfigured();
      this._logger.info(
        this.buildMessageForLogging(recipient, subject, contentHtml),
      );

      if (!isConfigured) {
        this._logger.warn(
          'SMTP service is not properly configured, no email sent',
        );
        return 'Email logged';
      }

      const from = await Configuration.getConfig('SMTP_FROM');
      if (!from) {
        throw new Error(
          "SMTP_FROM address must be specified. Ex: 'contact@acme.com'",
        );
      }

      const mailOptions: MailOptionsTemplate = {
        from,
        to: recipient,
        subject,
        html: contentHtml,
      };

      const result = await this.callNodeMailer(mailOptions);

      this._logger.info(
        `Email sent successfully to ${this.getMaskedRecipient(recipient)}`,
      );

      return result.messageId || 'Email sent';
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      this._logger.warn(
        `Failed to send email to ${this.getMaskedRecipient(recipient)}`,
        {
          error: errorMessage,
        },
      );
      throw new Error(`Failed to send email: ${errorMessage}`);
    }
  }

  async callNodeMailer(mailOptions: MailOptionsTemplate) {
    const mailConfig = await this.buildMailConfig();
    const transporter = nodemailer.createTransport(mailConfig);
    const result = await transporter.sendMail(mailOptions);
    return result;
  }

  buildMessageForLogging(recipient: string, subject: string, content: string) {
    return `Message to be sent to ${this.getMaskedRecipient(recipient)}
**** BEGIN MESSAGE ****
SUBJECT: ${subject}

${content}
**** END MESSAGE ****`;
  }

  /**
   * Certificate verification is opt-in: it stays off unless a deployment sets
   * SMTP_TLS_REJECT_UNAUTHORIZED=true, so upgrading does not break instances whose
   * mail server presents a certificate Node cannot verify. Turning it on is
   * recommended, and a private CA is best trusted through NODE_EXTRA_CA_CERTS.
   *
   * Anything other than 'true' or 'false' is rejected rather than silently read as
   * an opt-out: this flag is the only guard against SMTP interception, so a typo
   * like '1' or 'yes' must not leave an operator believing it is on.
   */
  private parseTlsRejectUnauthorized(value: string | null): boolean {
    const normalized = value?.trim().toLowerCase() ?? '';

    if (normalized === '' || normalized === 'false') {
      return false;
    }
    if (normalized === 'true') {
      return true;
    }

    throw new SmtpConfigurationError(
      `SMTP_TLS_REJECT_UNAUTHORIZED must be 'true' or 'false', got '${value}'`,
    );
  }

  private async buildMailConfig(): Promise<SMTPPool.Options> {
    const host = await Configuration.getConfig('SMTP_HOST');
    const port = await Configuration.getConfig('SMTP_PORT');
    const secure = await Configuration.getConfig('SMTP_SECURE');
    const user = await Configuration.getConfig('SMTP_USER');
    const password = await Configuration.getConfig('SMTP_PASSWORD');
    const isExchangeServer = await Configuration.getConfig(
      'SMTP_IS_EXCHANGE_SERVER',
    );
    const tlsRejectUnauthorized = await Configuration.getConfig(
      'SMTP_TLS_REJECT_UNAUTHORIZED',
    );

    if (!host || !port) {
      throw new SmtpConfigurationError('SMTP_HOST and SMTP_PORT are required');
    }

    const mailConfig: SMTPPool.Options = {
      pool: true,
      host,
      port: parseInt(port, 10),
      secure: secure === 'true', // true for 465, false for other ports
    };

    // Add authentication if credentials are provided
    if (user && password) {
      mailConfig.auth = {
        user,
        pass: password,
      };
    }

    mailConfig.tls = {
      rejectUnauthorized: this.parseTlsRejectUnauthorized(
        tlsRejectUnauthorized,
      ),
    };

    // Handle Exchange Server specific configuration. The legacy cipher and the
    // downgrade to STARTTLS apply to this branch only.
    if (isExchangeServer === 'true') {
      mailConfig.tls.ciphers = 'SSLv3';
      mailConfig.secure = false;
    }

    return mailConfig;
  }
}
