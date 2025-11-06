import { IPublicUseCase } from '../../UseCase';

export type ActivateUserAccountCommand = {
  token: string;
  password: string;
};

export type ActivateUserAccountResponse = {
  success: boolean;
  user: {
    id: string;
    email: string;
    isActive: boolean;
  };
};

export type IActivateUserAccountUseCase = IPublicUseCase<
  ActivateUserAccountCommand,
  ActivateUserAccountResponse
>;
