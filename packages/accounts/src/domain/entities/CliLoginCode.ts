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

export function generateCliLoginCode(): CliLoginCodeToken {
  return createCliLoginCodeToken(uuidv4());
}

export const CLI_LOGIN_CODE_EXPIRATION_MINUTES = 5;
