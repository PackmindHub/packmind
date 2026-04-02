import {
  Gateway,
  ICaptureRecipeUseCase,
  ICreatePackageUseCase,
  ICreateStandardUseCase,
  IGenerateApiKeyUseCase,
  IListPackagesBySpaceUseCase,
  IListStandardsBySpaceUseCase,
  ISignInUserUseCase,
  ISignUpWithOrganizationUseCase,
  PublicGateway,
  Space,
} from '@packmind/types';
import { IChangeProposalGateway } from './gateways/ChangeProposalGateway';
import { IDeploymentsGateway } from './gateways/DeploymentsGateway';

export interface IAuthGateway {
  signup: PublicGateway<ISignUpWithOrganizationUseCase>;
  signin: PublicGateway<ISignInUserUseCase>;
  generateApiKey: Gateway<IGenerateApiKeyUseCase>;
}

export interface ISpaceGateway {
  getGlobal: () => Promise<Space>;
  create: (params: { name: string }) => Promise<Space>;
}

export interface ICommandGateway {
  create: Gateway<ICaptureRecipeUseCase>;
}

export interface IPackageGateway {
  create: Gateway<ICreatePackageUseCase>;
  list: Gateway<IListPackagesBySpaceUseCase>;
}

export interface IStandardGateway {
  create: Gateway<ICreateStandardUseCase>;
  list: Gateway<IListStandardsBySpaceUseCase>;
}

export interface IPackmindGateway {
  auth: IAuthGateway;
  spaces: ISpaceGateway;
  commands: ICommandGateway;
  packages: IPackageGateway;
  standards: IStandardGateway;
  changeProposals: IChangeProposalGateway;
  deployments: IDeploymentsGateway;
}
