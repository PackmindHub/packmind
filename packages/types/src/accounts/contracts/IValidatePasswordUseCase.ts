import { IPublicUseCase } from '../../UseCase';

export type ValidatePasswordCommand = {
  password: string;
  hash: string;
};

export type ValidatePasswordResponse = {
  isValid: boolean;
};

export type IValidatePasswordUseCase = IPublicUseCase<
  ValidatePasswordCommand,
  ValidatePasswordResponse
>;
