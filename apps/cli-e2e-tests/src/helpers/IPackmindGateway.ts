import {
  Gateway,
  IActivateUserAccountUseCase,
  ICaptureRecipeUseCase,
  ICreateInvitationsUseCase,
  ICreatePackageUseCase,
  ICreateStandardUseCase,
  IGenerateApiKeyUseCase,
  IGetDeploymentOverview,
  IGetTargetsByOrganizationUseCase,
  IListChangeProposalsByArtefact,
  IListChangeProposalsBySpace,
  IListPackagesBySpaceUseCase,
  IListStandardsBySpaceUseCase,
  ISignInUserUseCase,
  ISignUpWithOrganizationUseCase,
  IUpdateRecipeFromUIUseCase,
  PublicGateway,
  RecipeId,
  Space,
  SpaceType,
} from '@packmind/types';

export interface IAuthGateway {
  signup: PublicGateway<ISignUpWithOrganizationUseCase>;
  signin: PublicGateway<ISignInUserUseCase>;
  signupWithInvitation: PublicGateway<IActivateUserAccountUseCase>;
  generateApiKey: Gateway<IGenerateApiKeyUseCase>;
}

export interface IAccountsGateway {
  createInvitations: Gateway<ICreateInvitationsUseCase>;
}

export interface ISpaceGateway {
  getGlobal: () => Promise<Space>;
  create: (params: { name: string; type?: SpaceType }) => Promise<Space>;
}

export interface ICommandGateway {
  create: Gateway<ICaptureRecipeUseCase>;
  update: Gateway<IUpdateRecipeFromUIUseCase>;
}

export interface IPackageGateway {
  create: Gateway<ICreatePackageUseCase>;
  list: Gateway<IListPackagesBySpaceUseCase>;
}

export interface IStandardGateway {
  create: Gateway<ICreateStandardUseCase>;
  list: Gateway<IListStandardsBySpaceUseCase>;
}

export interface IChangeProposalGateway {
  listBySpace: Gateway<IListChangeProposalsBySpace>;
  listChangeProposalsByRecipe: Gateway<
    IListChangeProposalsByArtefact<RecipeId>
  >;
}

export interface IDeploymentsGateway {
  getTargetsByOrganization: Gateway<IGetTargetsByOrganizationUseCase>;
  getRecipeDeploymentOverview: Gateway<IGetDeploymentOverview>;
}

export interface IPackmindGateway {
  auth: IAuthGateway;
  accounts: IAccountsGateway;
  spaces: ISpaceGateway;
  commands: ICommandGateway;
  packages: IPackageGateway;
  standards: IStandardGateway;
  changeProposals: IChangeProposalGateway;
  deployments: IDeploymentsGateway;

  initializeWithApiKey(apiKey: string): void;
}
