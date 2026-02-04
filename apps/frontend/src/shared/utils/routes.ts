/**
 * Route builder utilities for Packmind application
 * Provides type-safe URL generation for all routes
 *
 * Usage:
 * import { routes } from './shared/utils/routes';
 * <Link to={routes.space.toRecipes(orgSlug, spaceSlug)}>Recipes</Link>
 */

export const routes = {
  /**
   * Organization-scoped routes (no space slug)
   */
  org: {
    toDashboard: (orgSlug: string) => `/org/${orgSlug}`,
    toDeployments: (orgSlug: string) => `/org/${orgSlug}/deployments`,
    toSettings: (orgSlug: string) => `/org/${orgSlug}/settings`,
    toSettingsUsers: (orgSlug: string) => `/org/${orgSlug}/settings/users`,
    toSettingsGit: (orgSlug: string) => `/org/${orgSlug}/settings/git`,
    toSettingsTargets: (orgSlug: string) => `/org/${orgSlug}/settings/targets`,
    toSettingsDistribution: (orgSlug: string) =>
      `/org/${orgSlug}/settings/distribution-rendering`,
    toSettingsLLM: (orgSlug: string) => `/org/${orgSlug}/settings/llm`,
    toAccountSettings: (orgSlug: string) => `/org/${orgSlug}/account-settings`,
  },

  /**
   * Space-scoped routes (includes space slug)
   */
  space: {
    toCommands: (orgSlug: string, spaceSlug: string) =>
      `/org/${orgSlug}/space/${spaceSlug}/commands`,
    toCommand: (orgSlug: string, spaceSlug: string, commandId: string) =>
      `/org/${orgSlug}/space/${spaceSlug}/commands/${commandId}`,
    toCreateCommand: (orgSlug: string, spaceSlug: string) =>
      `/org/${orgSlug}/space/${spaceSlug}/commands/create`,
    toEditCommand: (orgSlug: string, spaceSlug: string, commandId: string) =>
      `/org/${orgSlug}/space/${spaceSlug}/commands/${commandId}/edit`,
    toStandards: (orgSlug: string, spaceSlug: string) =>
      `/org/${orgSlug}/space/${spaceSlug}/standards`,
    toPackages: (orgSlug: string, spaceSlug: string) =>
      `/org/${orgSlug}/space/${spaceSlug}/packages`,
    toPackage: (orgSlug: string, spaceSlug: string, packageId: string) =>
      `/org/${orgSlug}/space/${spaceSlug}/packages/${packageId}`,
    toCreatePackage: (orgSlug: string, spaceSlug: string) =>
      `/org/${orgSlug}/space/${spaceSlug}/packages/new`,
    toPackageEdit: (orgSlug: string, spaceSlug: string, packageId: string) =>
      `/org/${orgSlug}/space/${spaceSlug}/packages/${packageId}/edit`,
    toStandard: (orgSlug: string, spaceSlug: string, standardId: string) =>
      `/org/${orgSlug}/space/${spaceSlug}/standards/${standardId}`,
    toStandardSummary: (
      orgSlug: string,
      spaceSlug: string,
      standardId: string,
    ) => `/org/${orgSlug}/space/${spaceSlug}/standards/${standardId}/summary`,
    toStandardDeployment: (
      orgSlug: string,
      spaceSlug: string,
      standardId: string,
    ) =>
      `/org/${orgSlug}/space/${spaceSlug}/standards/${standardId}/deployment`,
    toStandardRule: (
      orgSlug: string,
      spaceSlug: string,
      standardId: string,
      ruleId: string,
    ) =>
      `/org/${orgSlug}/space/${spaceSlug}/standards/${standardId}/rule/${ruleId}`,
    toStandardRules: (orgSlug: string, spaceSlug: string, standardId: string) =>
      `/org/${orgSlug}/space/${spaceSlug}/standards/${standardId}/rules`,
    toStandardEdit: (orgSlug: string, spaceSlug: string, standardId: string) =>
      `/org/${orgSlug}/space/${spaceSlug}/standards/${standardId}/edit`,
    toCreateStandard: (orgSlug: string, spaceSlug: string) =>
      `/org/${orgSlug}/space/${spaceSlug}/standards/create`,
    toSkills: (orgSlug: string, spaceSlug: string) =>
      `/org/${orgSlug}/space/${spaceSlug}/skills`,
    toSkill: (orgSlug: string, spaceSlug: string, skillSlug: string) =>
      `/org/${orgSlug}/space/${spaceSlug}/skills/${skillSlug}`,
    toSkillFiles: (orgSlug: string, spaceSlug: string, skillSlug: string) =>
      `/org/${orgSlug}/space/${spaceSlug}/skills/${skillSlug}/files`,
    toSkillFileWithPath: (
      orgSlug: string,
      spaceSlug: string,
      skillSlug: string,
      filePath: string,
    ) =>
      `/org/${orgSlug}/space/${spaceSlug}/skills/${skillSlug}/files/${filePath}`,
    toSkillDistributions: (
      orgSlug: string,
      spaceSlug: string,
      skillSlug: string,
    ) => `/org/${orgSlug}/space/${spaceSlug}/skills/${skillSlug}/distributions`,
  },

  /**
   * Public/auth routes
   */
  auth: {
    toSignIn: () => '/sign-in',
    toSignUp: () => '/sign-up/create-account',
    toCreateAccount: () => '/create-account',
    toForgotPassword: () => '/forgot-password',
    toResetPassword: (token?: string) =>
      token ? `/reset-password?token=${token}` : '/reset-password',
    toActivate: (token: string) => `/activate?token=${token}`,
    toStartTrial: () => '/quick-start',
    toStartTrialSelectAgent: () => '/quick-start/select-agent',
    toStartTrialAgent: (
      agent: string,
      token: string,
      mcpUrl: string,
      cliLoginCode?: string,
    ) =>
      `/quick-start/${agent}?token=${token}&mcpUrl=${mcpUrl}${cliLoginCode ? `&cliLoginCode=${cliLoginCode}` : ''}`,
  },
};
