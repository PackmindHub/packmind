import { IPublicUseCase } from '../../UseCase';

export type ValidateInvitationTokenCommand = {
  token: string;
};

export type ValidateInvitationTokenResponse = {
  email: string;
  isValid: boolean;
};

export type IValidateInvitationTokenUseCase = IPublicUseCase<
  ValidateInvitationTokenCommand,
  ValidateInvitationTokenResponse
>;
