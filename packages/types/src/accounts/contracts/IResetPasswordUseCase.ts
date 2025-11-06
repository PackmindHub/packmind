import { IPublicUseCase } from '../../UseCase';

export type ResetPasswordCommand = {
  token: string;
  password: string;
};

export type ResetPasswordResponse = {
  success: boolean;
  user: {
    id: string;
    email: string;
    isActive: boolean;
  };
};

export type IResetPasswordUseCase = IPublicUseCase<
  ResetPasswordCommand,
  ResetPasswordResponse
>;
