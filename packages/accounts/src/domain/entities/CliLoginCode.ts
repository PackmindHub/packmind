import {
  Branded,
  brandedIdFactory,
  OrganizationId,
  UserId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';

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
 * Generates a random CLI login code using UUID.
 * Uses the same pattern as invitation tokens for consistency.
 */
export function generateCliLoginCode(): CliLoginCodeToken {
  return createCliLoginCodeToken(uuidv4());
}

/**
 * CLI login code expiration time in minutes
 */
export const CLI_LOGIN_CODE_EXPIRATION_MINUTES = 5;
