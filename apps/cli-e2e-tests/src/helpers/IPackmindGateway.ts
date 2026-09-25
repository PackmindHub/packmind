import {
  DistributionHistoryEntry,
  Gateway,
  IActivateUserAccountUseCase,
  ICaptureCommandUseCase,
  ICreateInvitationsUseCase,
  IAddArtefactsToPackageUseCase,
  ICreatePackageReleaseUseCase,
  ICreatePackageUseCase,
  ICreateStandardUseCase,
  IGenerateApiKeyUseCase,
  IGetTargetsByOrganizationUseCase,
  IListChangeProposalsByArtefact,
  IListChangeProposalsBySpace,
  IListPackagesBySpaceUseCase,
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
  addArtefacts: Gateway<IAddArtefactsToPackageUseCase>;
  createRelease: Gateway<ICreatePackageReleaseUseCase>;
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
  listDeploymentsByPackage(
    spaceId: string,
    packageId: string,
  ): Promise<DistributionHistoryEntry[]>;
}

export interface ISkillsGateway {
  upload: Gateway<IUploadSkillUseCase>;
  list: Gateway<IListSkillsBySpaceUseCase>;
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

  initializeWithApiKey(apiKey: string): void;
}
