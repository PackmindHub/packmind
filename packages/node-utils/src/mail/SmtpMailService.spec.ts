import { SmtpMailService } from './SmtpMailService';
import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import { Configuration } from '../config/config/Configuration';
import { SentMessageInfo } from 'nodemailer';

// Mock external dependencies
jest.mock('../config/config/Configuration');

const MockedConfiguration = jest.mocked(Configuration);

describe('SmtpMailService', () => {
  let service: SmtpMailService;
  let mockLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    mockLogger = stubLogger();
    service = new SmtpMailService(mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMaskedRecipient', () => {
    describe('when length is 6 or less', () => {
      it('returns original string for exactly 6 characters', () => {
        expect(service.getMaskedRecipient('a@b.co')).toBe('a@b.co');
      });

      it('returns original string for 4 characters', () => {
        expect(service.getMaskedRecipient('test')).toBe('test');
      });

      it('returns original string for empty string', () => {
        expect(service.getMaskedRecipient('')).toBe('');
      });

      it('returns original string for exactly 6 digits', () => {
        expect(service.getMaskedRecipient('123456')).toBe('123456');
      });
    });

    describe('when length is greater than 6', () => {
      it('masks characters after first 6 for standard email', () => {
        expect(service.getMaskedRecipient('user@example.com')).toBe(
          'user@e**********',
        );
      });

      it('masks characters after first 6 for long email', () => {
        expect(service.getMaskedRecipient('verylongemail@domain.com')).toBe(
          'verylo******************',
        );
      });

      it('masks single character after first 6', () => {
        expect(service.getMaskedRecipient('1234567')).toBe('123456*');
      });
    });

    describe('when handling edge cases', () => {
      it('masks one character for 7 character email', () => {
        expect(service.getMaskedRecipient('a@b.com')).toBe('a@b.co*');
      });

      it('returns original for exactly 6 characters with trailing symbol', () => {
        expect(service.getMaskedRecipient('admin@')).toBe('admin@');
      });

      it('returns original for single character', () => {
        expect(service.getMaskedRecipient('a')).toBe('a');
      });
    });
  });

  describe('buildMessageForLogging', () => {
    it('formats message correctly with masked recipient', () => {
      const recipient = 'user@example.com';
      const subject = 'Test Subject';
      const content = 'Test content here';

      const result = service.buildMessageForLogging(
        recipient,
        subject,
        content,
      );

      expect(result).toBe(`Message to be sent to user@e**********
**** BEGIN MESSAGE ****
SUBJECT: Test Subject

Test content here
**** END MESSAGE ****`);
    });

    describe('when building message with HTML content', () => {
      let result: string;

      beforeEach(() => {
        const recipient = 'test@test.com';
        const subject = 'Welcome';
        const content = '<h1>Welcome!</h1>';

        result = service.buildMessageForLogging(recipient, subject, content);
      });

      it('includes masked recipient', () => {
        expect(result).toContain('Message to be sent to test@t*******');
      });

      it('includes begin message marker', () => {
        expect(result).toContain('**** BEGIN MESSAGE ****');
      });

      it('includes subject', () => {
        expect(result).toContain('SUBJECT: Welcome');
      });

      it('includes HTML content', () => {
        expect(result).toContain('<h1>Welcome!</h1>');
      });

      it('includes end message marker', () => {
        expect(result).toContain('**** END MESSAGE ****');
      });
    });
  });

  describe('sendEmail', () => {
    const recipient = 'user@example.com';
    const subject = 'Test Subject';
    const contentHtml = 'Test content';

    describe('when SMTP is not configured', () => {
      beforeEach(() => {
        // Mock isConfigured to return false
        MockedConfiguration.getConfig.mockImplementation((key: string) => {
          if (key === 'SMTP_HOST') return Promise.resolve(null);
          if (key === 'SMTP_PORT') return Promise.resolve(null);
          return Promise.resolve(null);
        });
      });

      it('returns "Email logged"', async () => {
        const result = await service.sendEmail({
          recipient,
          subject,
          contentHtml,
        });

        expect(result).toBe('Email logged');
      });

      it('calls buildMessageForLogging', async () => {
        // Spy on buildMessageForLogging method
        const buildMessageSpy = jest.spyOn(service, 'buildMessageForLogging');

        await service.sendEmail({ recipient, subject, contentHtml });

        expect(buildMessageSpy).toHaveBeenCalledWith(
          recipient,
          subject,
          contentHtml,
        );
      });

      it('logs the message', async () => {
        await service.sendEmail({ recipient, subject, contentHtml });
        const expectedMessage = service.buildMessageForLogging(
          recipient,
          subject,
          contentHtml,
        );

        // Packmind does not allow testing mockLogger, but here this is a business decision to check ;)
        const infoStub = mockLogger.info;
        expect(infoStub).toHaveBeenCalledWith(expectedMessage);
      });
    });

    describe('when SMTP is configured', () => {
      let callNodeMailerSpy: jest.SpyInstance;

      beforeEach(() => {
        MockedConfiguration.getConfig.mockImplementation((key: string) => {
          if (key === 'SMTP_HOST') return Promise.resolve('smtp.example.com');
          if (key === 'SMTP_PORT') return Promise.resolve('587');
          if (key === 'SMTP_FROM') return Promise.resolve('test@example.com');
          if (key === 'SMTP_USER') return Promise.resolve('user');
          if (key === 'SMTP_PASSWORD') return Promise.resolve('password');
          if (key === 'SMTP_SECURE') return Promise.resolve('false');
          return Promise.resolve(null);
        });

        callNodeMailerSpy = jest
          .spyOn(service, 'callNodeMailer')
          .mockResolvedValue({
            messageId: 'test-message-id',
            envelope: { from: 'test@example.com', to: ['user@example.com'] },
            accepted: ['user@example.com'],
            rejected: [],
            pending: [],
            response: '250 OK',
          } as SentMessageInfo);
      });

      describe('when sending email successfully', () => {
        let result: string;

        beforeEach(async () => {
          result = await service.sendEmail({
            recipient,
            subject,
            contentHtml,
          });
        });

        it('returns message id', () => {
          expect(result).toBe('test-message-id');
        });

        it('calls callNodeMailer with correct parameters', () => {
          expect(callNodeMailerSpy).toHaveBeenCalledWith({
            from: 'test@example.com',
            to: recipient,
            subject,
            html: contentHtml,
          });
        });
      });

      it('logs the message', async () => {
        await service.sendEmail({ recipient, subject, contentHtml });
        const expectedMessage = service.buildMessageForLogging(
          recipient,
          subject,
          contentHtml,
        );

        // Packmind does not allow testing mockLogger, but here this is a business decision to check ;)
        const infoStub = mockLogger.info;
        expect(infoStub).toHaveBeenCalledWith(expectedMessage);
      });

      describe('when SMTP_FROM is not configured', () => {
        it('throws error', async () => {
          MockedConfiguration.getConfig.mockImplementation((key: string) => {
            if (key === 'SMTP_HOST') return Promise.resolve('smtp.example.com');
            if (key === 'SMTP_PORT') return Promise.resolve('587');
            if (key === 'SMTP_FROM') return Promise.resolve(null);
            return Promise.resolve(null);
          });

          await expect(
            service.sendEmail({
              recipient: 'user@example.com',
              subject: 'Subject',
              contentHtml: 'Content',
            }),
          ).rejects.toThrow(
            "SMTP_FROM address must be specified. Ex: 'contact@acme.com'",
          );
        });
      });

      describe('when callNodeMailer fails', () => {
        it('throws error with proper message', async () => {
          const error = new Error('SMTP connection failed');
          callNodeMailerSpy.mockRejectedValue(error);

          const recipient = 'user@example.com';

          await expect(
            service.sendEmail({
              recipient,
              subject: 'Subject',
              contentHtml: 'Content',
            }),
          ).rejects.toThrow('Failed to send email: SMTP connection failed');
        });
      });
    });
  });
});
