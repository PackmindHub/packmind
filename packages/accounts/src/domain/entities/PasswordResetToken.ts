import { Branded, brandedIdFactory } from '@packmind/types';
import { UserId } from '@packmind/types';

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
