/**
 * Interface for mail service implementations.
 *
 * This interface defines the contract that any mail service provider
 * (SMTP, SendGrid, AWS SES, etc.) must implement.
 * This abstraction allows the system to be extensible and provider-agnostic.
 */

export type EmailData = {
  recipient: string;
  subject: string;
  contentHtml: string;
} & EmailOptions;

type EmailOptions = Partial<{
  contentText: string;
  ccRecipients: string;
  cciRecipients: string;
}>;

export interface MailService {
  /**
   * Check if the mail service is properly configured and ready to use
   * @returns true if the service is configured and available, false otherwise
   */
  isConfigured(): Promise<boolean>;

  sendEmail(opts: EmailData): Promise<string>;
}
