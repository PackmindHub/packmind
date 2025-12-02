import {
  Branded,
  brandedIdFactory,
  OrganizationId,
  UserId,
} from '@packmind/types';

export type CliLoginCodeId = Branded<'CliLoginCodeId'>;
export const createCliLoginCodeId = brandedIdFactory<CliLoginCodeId>();

export type CliLoginCodeToken = Branded<'CliLoginCodeToken'>;
export const createCliLoginCodeToken = brandedIdFactory<CliLoginCodeToken>();

export type CliLoginCode = {
  id: CliLoginCodeId;
  code: CliLoginCodeToken;
  userId: UserId;
  organizationId: OrganizationId;
  expiresAt: Date;
};

/**
 * Generates a random 10-character code using uppercase alphanumeric characters.
 * Excludes ambiguous characters: 0, O, 1, I, L
 */
export function generateCliLoginCode(): CliLoginCodeToken {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 10; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code as CliLoginCodeToken;
}

/**
 * CLI login code expiration time in minutes
 */
export const CLI_LOGIN_CODE_EXPIRATION_MINUTES = 5;
