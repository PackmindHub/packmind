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
  isConfigured(): Promise<boolean>;

  sendEmail(opts: EmailData): Promise<string>;
}
