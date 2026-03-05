import {
  Gateway,
  ICaptureRecipeUseCase,
  ICreatePackageUseCase,
  IGenerateApiKeyUseCase,
  ISignInUserUseCase,
  ISignUpWithOrganizationUseCase,
  PublicGateway,
  Space,
} from '@packmind/types';
import { IDeploymentsGateway } from './gateways/DeploymentsGateway';

export interface IAuthGateway {
  signup: PublicGateway<ISignUpWithOrganizationUseCase>;
  signin: PublicGateway<ISignInUserUseCase>;
  generateApiKey: Gateway<IGenerateApiKeyUseCase>;
}

export interface ISpaceGateway {
  getGlobal: () => Promise<Space>;
}

export interface ICommandGateway {
  create: Gateway<ICaptureRecipeUseCase>;
}

export interface IPackageGateway {
  create: Gateway<ICreatePackageUseCase>;
}

export interface IPackmindGateway {
  auth: IAuthGateway;
  spaces: ISpaceGateway;
  commands: ICommandGateway;
  packages: IPackageGateway;
  deployments: IDeploymentsGateway;
}
