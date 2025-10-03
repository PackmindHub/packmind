import { Branded, brandedIdFactory } from '@packmind/shared';
import { UserId } from './User';

export type PasswordResetTokenId = Branded<'PasswordResetTokenId'>;
export const createPasswordResetTokenId =
  brandedIdFactory<PasswordResetTokenId>();

export type PasswordResetToken = Branded<'PasswordResetToken'>;
export const createPasswordResetToken = brandedIdFactory<PasswordResetToken>();

export type PasswordResetTokenEntity = {
  id: PasswordResetTokenId;
  userId: UserId;
  token: PasswordResetToken;
  expirationDate: Date;
};
