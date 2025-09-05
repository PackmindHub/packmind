import { IPublicUseCase } from '@packmind/shared';

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
