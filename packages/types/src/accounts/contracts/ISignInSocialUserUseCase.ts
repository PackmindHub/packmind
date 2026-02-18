import { IPublicUseCase } from '../../UseCase';
import { SocialProvider } from '../SocialProvider';
import { SignInUserResponse } from './ISignInUserUseCase';

export type SignInSocialUserCommand = {
  email: string;
  socialProvider: SocialProvider;
};

export type SignInSocialUserResponse = SignInUserResponse & {
  isNewUser: boolean;
};

export type ISignInSocialUserUseCase = IPublicUseCase<
  SignInSocialUserCommand,
  SignInSocialUserResponse
>;
