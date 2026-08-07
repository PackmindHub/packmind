import {
  Distribution,
  Gateway,
  IActivateUserAccountUseCase,
  ICaptureCommandUseCase,
  ICreateInvitationsUseCase,
  ICreatePackageUseCase,
  ICreateStandardUseCase,
  IGenerateApiKeyUseCase,
  IGetTargetsByOrganizationUseCase,
  IListChangeProposalsByArtefact,
  IListChangeProposalsBySpace,
  IListPackagesBySpaceUseCase,
  IListProvidersUseCase,
  IListStandardsBySpaceUseCase,
  ISignInUserUseCase,
  ISignUpWithOrganizationUseCase,
  IUpdateCommandFromUIUseCase,
  IUpdateRenderModeConfigurationUseCase,
  IUploadSkillUseCase,
  IListSkillsBySpaceUseCase,
  PublicGateway,
  CommandId,
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
  create: Gateway<ICaptureCommandUseCase>;
  update: Gateway<IUpdateCommandFromUIUseCase>;
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
  listChangeProposalsByCommand: Gateway<
    IListChangeProposalsByArtefact<CommandId>
  >;
}

export interface IDeploymentsGateway {
  getTargetsByOrganization: Gateway<IGetTargetsByOrganizationUseCase>;
  updateRenderModeConfiguration: Gateway<IUpdateRenderModeConfigurationUseCase>;
  listDeploymentsByPackage(packageId: string): Promise<Distribution[]>;
}

export interface ISkillsGateway {
  upload: Gateway<IUploadSkillUseCase>;
  list: Gateway<IListSkillsBySpaceUseCase>;
}

export interface IGitGateway {
  listProviders: Gateway<IListProvidersUseCase>;
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
  skills: ISkillsGateway;
  git: IGitGateway;

  initializeWithApiKey(apiKey: string): void;
}
