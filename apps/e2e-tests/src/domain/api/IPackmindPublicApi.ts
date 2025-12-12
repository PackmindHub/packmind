import {
  ISignInUserUseCase,
  ISignUpWithOrganizationUseCase,
  PublicGateway,
} from '@packmind/types';

export interface IPackmindPublicApi {
  signIn: PublicGateway<ISignInUserUseCase>;

  signUp: PublicGateway<ISignUpWithOrganizationUseCase>;
}
