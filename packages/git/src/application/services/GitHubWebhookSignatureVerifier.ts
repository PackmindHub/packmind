import { createHmac, timingSafeEqual } from 'crypto';

const SIGNATURE_PREFIX = 'sha256=';

export class GitHubWebhookSignatureVerifier {
  verify(
    rawBody: Buffer,
    signatureHeader: string | undefined,
    webhookSecret: string,
  ): boolean {
    if (!signatureHeader) {
      return false;
    }

    if (!signatureHeader.startsWith(SIGNATURE_PREFIX)) {
      return false;
    }

    const receivedHex = signatureHeader.slice(SIGNATURE_PREFIX.length);

    if (receivedHex.length === 0) {
      return false;
    }

    const expectedHex = createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (receivedHex.length !== expectedHex.length) {
      return false;
    }

    try {
      return timingSafeEqual(
        Buffer.from(receivedHex, 'hex'),
        Buffer.from(expectedHex, 'hex'),
      );
    } catch {
      return false;
    }
  }
}
