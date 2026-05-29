import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

export interface InstallStatePayload {
  orgId: string;
  userId: string;
  nonce: string;
  exp: number; // unix seconds
}

export class InvalidInstallStateError extends Error {
  constructor(message = 'Invalid or expired state token') {
    super(message);
    this.name = 'InvalidInstallStateError';
  }
}

/**
 * Signs and verifies short-TTL state tokens for the GitHub App installation flow.
 *
 * Format: base64url(jsonPayload) + '.' + base64url(hmacSha256(key, jsonPayload))
 *
 * IMPORTANT: The HMAC input is the raw UTF-8 JSON bytes of the payload (not the
 * base64url version). The JSON object keys are serialized in stable order:
 * orgId, userId, nonce, exp.
 */
export class InstallStateSigner {
  // 10 minutes in seconds
  static readonly DEFAULT_TTL_SECONDS = 10 * 60;

  constructor(
    private readonly encryptionKey: string,
    private readonly ttlSeconds: number = InstallStateSigner.DEFAULT_TTL_SECONDS,
    private readonly now: () => number = () => Math.floor(Date.now() / 1000),
  ) {}

  sign(
    payload: Omit<InstallStatePayload, 'exp' | 'nonce'> & {
      nonce?: string;
      exp?: number;
    },
  ): string {
    const nonce = payload.nonce ?? randomBytes(16).toString('hex');
    const exp = payload.exp ?? this.now() + this.ttlSeconds;

    // Stable key order: orgId, userId, nonce, exp
    const fullPayload = {
      orgId: payload.orgId,
      userId: payload.userId,
      nonce,
      exp,
    };

    const json = JSON.stringify(fullPayload);

    // HMAC input is the raw UTF-8 JSON bytes (not the base64url version).
    const digest = createHmac('sha256', this.encryptionKey)
      .update(json)
      .digest();

    const encodedPayload = Buffer.from(json).toString('base64url');
    const encodedDigest = digest.toString('base64url');

    return `${encodedPayload}.${encodedDigest}`;
  }

  verify(state: string): InstallStatePayload {
    const parts = state.split('.');
    if (parts.length !== 2) {
      throw new InvalidInstallStateError();
    }

    const [encodedPayload, encodedDigest] = parts;

    let jsonBytes: Buffer;
    let providedDigest: Buffer;

    try {
      jsonBytes = Buffer.from(encodedPayload, 'base64url');
      providedDigest = Buffer.from(encodedDigest, 'base64url');
    } catch {
      throw new InvalidInstallStateError();
    }

    // Recompute the HMAC over the decoded JSON bytes.
    const recomputed = createHmac('sha256', this.encryptionKey)
      .update(jsonBytes)
      .digest();

    // Guard against different-length buffers (impossible for SHA-256 but safe).
    if (recomputed.length !== providedDigest.length) {
      throw new InvalidInstallStateError();
    }

    if (!timingSafeEqual(recomputed, providedDigest)) {
      throw new InvalidInstallStateError();
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonBytes.toString('utf8'));
    } catch {
      throw new InvalidInstallStateError();
    }

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof (parsed as Record<string, unknown>).orgId !== 'string' ||
      !(parsed as Record<string, unknown>).orgId ||
      typeof (parsed as Record<string, unknown>).userId !== 'string' ||
      !(parsed as Record<string, unknown>).userId ||
      typeof (parsed as Record<string, unknown>).nonce !== 'string' ||
      !(parsed as Record<string, unknown>).nonce ||
      typeof (parsed as Record<string, unknown>).exp !== 'number' ||
      !isFinite((parsed as Record<string, unknown>).exp as number)
    ) {
      throw new InvalidInstallStateError();
    }

    const payload = parsed as InstallStatePayload;

    if (payload.exp <= this.now()) {
      throw new InvalidInstallStateError();
    }

    return payload;
  }
}
