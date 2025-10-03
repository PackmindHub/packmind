import { IPublicUseCase } from '../../UseCase';

export type RequestPasswordResetCommand = {
  email: string;
};

export type RequestPasswordResetResponse = {
  success: boolean;
  message: string;
};

export type IRequestPasswordResetUseCase = IPublicUseCase<
  RequestPasswordResetCommand,
  RequestPasswordResetResponse
>;
