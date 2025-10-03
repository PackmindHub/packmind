import { IPublicUseCase } from '../../UseCase';

export type ValidatePasswordResetTokenCommand = {
  token: string;
};

export type ValidatePasswordResetTokenResponse = {
  email: string;
  isValid: boolean;
};

export type IValidatePasswordResetTokenUseCase = IPublicUseCase<
  ValidatePasswordResetTokenCommand,
  ValidatePasswordResetTokenResponse
>;
