import { IUseCase, PackmindCommand } from '../../UseCase';
import { GitProviderId } from '../GitProvider';

export type ListInstallationRepositoriesCommand = PackmindCommand & {
  gitProviderId: GitProviderId;
};

export type InstallationRepository = {
  owner: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  private: boolean;
  description: string | null;
};

export type ListInstallationRepositoriesResponse = {
  repositories: InstallationRepository[];
};

export type IListInstallationRepositoriesUseCase = IUseCase<
  ListInstallationRepositoriesCommand,
  ListInstallationRepositoriesResponse
>;
