import { createHmac } from 'crypto';
import { GitHubWebhookSignatureVerifier } from './GitHubWebhookSignatureVerifier';

const SECRET = 'test-webhook-secret';
const BODY = Buffer.from('{"action":"push"}');

function makeSignature(body: Buffer, secret: string): string {
  const hex = createHmac('sha256', secret).update(body).digest('hex');
  return `sha256=${hex}`;
}

describe('GitHubWebhookSignatureVerifier', () => {
  let verifier: GitHubWebhookSignatureVerifier;

  beforeEach(() => {
    verifier = new GitHubWebhookSignatureVerifier();
  });

  afterEach(() => jest.clearAllMocks());

  it('returns true for a valid signature', () => {
    const signature = makeSignature(BODY, SECRET);
    expect(verifier.verify(BODY, signature, SECRET)).toBe(true);
  });

  it('returns false for an invalid signature', () => {
    const signature = makeSignature(BODY, SECRET);
    const tampered = signature.replace('a', 'b');
    expect(verifier.verify(BODY, tampered, SECRET)).toBe(false);
  });

  it('returns false when signature header is undefined', () => {
    expect(verifier.verify(BODY, undefined, SECRET)).toBe(false);
  });

  it('returns false when signature header lacks sha256= prefix', () => {
    const hex = createHmac('sha256', SECRET).update(BODY).digest('hex');
    expect(verifier.verify(BODY, hex, SECRET)).toBe(false);
  });

  it('returns false when body has been tampered with', () => {
    const signature = makeSignature(BODY, SECRET);
    const tamperedBody = Buffer.from('{"action":"deleted"}');
    expect(verifier.verify(tamperedBody, signature, SECRET)).toBe(false);
  });

  it('returns false when secret is wrong', () => {
    const signature = makeSignature(BODY, 'wrong-secret');
    expect(verifier.verify(BODY, signature, SECRET)).toBe(false);
  });

  it('returns false when signature header has empty hex after prefix', () => {
    expect(verifier.verify(BODY, 'sha256=', SECRET)).toBe(false);
  });
});
