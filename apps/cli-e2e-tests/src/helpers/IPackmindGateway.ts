import {
  Gateway,
  ICaptureRecipeUseCase,
  ICreatePackageUseCase,
  ICreateStandardUseCase,
  IGenerateApiKeyUseCase,
  IListStandardsBySpaceUseCase,
  ISignInUserUseCase,
  ISignUpWithOrganizationUseCase,
  PublicGateway,
  Space,
  SpaceType,
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
  create: (params: { name: string; type?: SpaceType }) => Promise<Space>;
}

export interface ICommandGateway {
  create: Gateway<ICaptureRecipeUseCase>;
}

export interface IPackageGateway {
  create: Gateway<ICreatePackageUseCase>;
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
