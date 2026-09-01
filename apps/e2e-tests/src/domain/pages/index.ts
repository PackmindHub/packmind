import { SpaceType } from '@packmind/types';

export interface IPackmindPage {
  waitForLoaded(): Promise<void>;
  reload(): Promise<void>;
}

export interface IPackmindAppPage extends IPackmindPage {
  openStandards(): Promise<IStandardsPage>;
  openSkills(): Promise<ISkillsPage>;
  openCommands(): Promise<ICommandsPage>;
  openPackages(): Promise<IPackagesPage>;
  openSettings(): Promise<ISettingsPage>;
  openIntegrations(): Promise<ICliSetupPage>;
  openSpaceSettings(): Promise<ISpaceSettingsPage>;
  createSpace(
    name: string,
    options?: { type?: SpaceType },
  ): Promise<IDashboardPage>;
  navigateToDashboard(): Promise<IDashboardPage>;
  navigateToSpace(spaceName: string): Promise<IDashboardPage>;
  signOut(): Promise<void>;
}

export interface ISignUpPage extends IPackmindPage {
  signup(email: string, password: string): Promise<IDashboardPage>;
}

export interface IDashboardPage extends IPackmindAppPage {
  expectWelcomeMessage(): Promise<void>;
}

export interface IStandardsPage extends IPackmindAppPage {
  listStandards(): Promise<{ name: string }[]>;
  openCreateStandards(): Promise<ICreateStandardPage>;
  openStandard(name: string): Promise<IStandardPage>;
  selectStandardByName(name: string): Promise<void>;
  selectAll(): Promise<void>;
  moveToSpace(spaceName: string): Promise<void>;
  hasNoStandards(): Promise<boolean>;
}

export interface ISkillsPage extends IPackmindAppPage {
  listSkills(): Promise<{ name: string }[]>;
  selectSkillByName(name: string): Promise<void>;
  selectAll(): Promise<void>;
  moveToSpace(spaceName: string): Promise<void>;
  moveToSpaceExpectingError(spaceName: string): Promise<string>;
  hasNoSkills(): Promise<boolean>;
  openSkill(name: string): Promise<ISkillFilePage>;
  openImportDialog(): Promise<void>;
  /** One directory only — the picker is a `webkitdirectory` input. */
  chooseSkillsFolder(directoryPath: string): Promise<void>;
  listDetectedSkills(): Promise<string[]>;
  importDetectedSkills(): Promise<string>;
  canImportDetectedSkills(): Promise<boolean>;
  closeImportDialog(): Promise<void>;
}

export interface ISkillFilePage extends IPackmindAppPage {
  clickEdit(): Promise<void>;
  replaceEditorContent(content: string): Promise<void>;
  clickSave(): Promise<void>;
  clickSaveExpectingError(): Promise<string>;
  isEditorEditable(): Promise<boolean>;
  readDisplayedContent(): Promise<string>;
  getVersionNumber(): Promise<number>;
}

export interface IStandardPage extends IPackmindAppPage {
  readStandard(): Promise<{ name: string; description: string; scope: string }>;
}

export interface IPackagesPage extends IPackmindAppPage {
  openPackage(packageName: string): Promise<IPackagePage>;
}

/** One row of a package's distribution log, as the log now shows it. */
export type DistributionLogEntry = {
  /** `owner/repo`, the first line of the destination. */
  repository: string;
  /** Its branch, plus the path when the target is not the repository root. */
  detail: string;
  /** The badge: Success, Failed, In Progress, No Changes. */
  status: string;
};

export interface IPackagePage extends IPackmindAppPage {
  openDistributionsTab(): Promise<void>;
  listDistributions(): Promise<DistributionLogEntry[]>;
  isPackageEmpty(): Promise<boolean>;
  listStandardsInPackage(): Promise<{ name: string }[]>;
}

export interface ICreateStandardPage extends IPackmindAppPage {
  createStandard(
    name: string,
    description: string,
    scope: string,
  ): Promise<IStandardsPage>;
}

export interface ICommandsPage extends IPackmindAppPage {
  listCommands(): Promise<{ commandName: string }[]>;
}

export interface ISettingsPage extends IPackmindAppPage {
  openGitSettings(): Promise<IGitSettingsPage>;
  openUsersSettings(): Promise<IUsersSettingsPage>;
}

export interface IUsersSettingsPage extends IPackmindAppPage {
  inviteUser(email: string): Promise<void>;
  getInvitationToken(): Promise<string>;
}

export interface IGitSettingsPage extends IPackmindAppPage {
  listGitProviders(): Promise<
    { provider: string; repositoriesCount: number; tokenLess: boolean }[]
  >;
  openFirstConnectionDrawer(): Promise<void>;
  waitForDrawerStatus(
    state: 'connected' | 'token_expired' | 'unreachable' | 'checking',
  ): Promise<void>;
  getDrawerStatusDescription(): Promise<string | null>;
  waitForFirstRowStatus(
    state: 'connected' | 'token_expired' | 'unreachable' | 'checking',
  ): Promise<void>;
  openReauthFromDrawer(): Promise<void>;
  submitReauthToken(token: string): Promise<void>;
  waitForReauthAccepted(): Promise<void>;
}

export interface ICliSetupPage extends IPackmindAppPage {
  getApiKey(): Promise<string>;
}

export interface ISpaceSettingsPage extends IPackmindAppPage {
  openMembersTab(): Promise<void>;
  clickAddMembers(): Promise<void>;
  searchAndSelectMember(displayName: string): Promise<void>;
  submitAddMembers(): Promise<void>;
  listMembers(): Promise<{ displayName: string }[]>;
}

export interface IInvitationPage extends IPackmindPage {
  activateAccount(password: string): Promise<IDashboardPage>;
}

export interface IPageFactory {
  getSignupPage(): Promise<ISignUpPage>;
  getSignupFormPage(): Promise<ISignUpPage>;
  getDashboardPage(): Promise<IDashboardPage>;
  getCliSetupPage(): Promise<ICliSetupPage>;
  getUsersSettingsPage(): Promise<IUsersSettingsPage>;
  getSkillsPage(): Promise<ISkillsPage>;
  getSkillFilePage(): Promise<ISkillFilePage>;
  getStandardsPage(): Promise<IStandardsPage>;
  getPackagesPage(): Promise<IPackagesPage>;
  getPackagePage(): Promise<IPackagePage>;
  getSettingsPage(): Promise<ISettingsPage>;
  getGitSettingsPage(): Promise<IGitSettingsPage>;
  getInvitationPage(token: string): Promise<IInvitationPage>;
  getSpaceSettingsPage(): Promise<ISpaceSettingsPage>;
}
