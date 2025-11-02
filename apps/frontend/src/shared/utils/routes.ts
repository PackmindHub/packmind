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
    toAnalytics: (orgSlug: string) => `/org/${orgSlug}/analytics`,
    toSettings: (orgSlug: string) => `/org/${orgSlug}/settings`,
    toSettingsUsers: (orgSlug: string) => `/org/${orgSlug}/settings/users`,
    toSettingsGit: (orgSlug: string) => `/org/${orgSlug}/settings/git`,
    toSettingsTargets: (orgSlug: string) => `/org/${orgSlug}/settings/targets`,
    toSettingsDistribution: (orgSlug: string) =>
      `/org/${orgSlug}/settings/distribution-rendering`,
    toAccountSettings: (orgSlug: string) => `/org/${orgSlug}/account-settings`,
  },

  /**
   * Space-scoped routes (includes space slug)
   */
  space: {
    toRecipes: (orgSlug: string, spaceSlug: string) =>
      `/org/${orgSlug}/space/${spaceSlug}/recipes`,
    toRecipe: (orgSlug: string, spaceSlug: string, recipeId: string) =>
      `/org/${orgSlug}/space/${spaceSlug}/recipes/${recipeId}`,
    toAgentBlueprints: (orgSlug: string, spaceSlug: string) =>
      `/org/${orgSlug}/space/${spaceSlug}/agent-blueprints`,
    toAgentBlueprint: (
      orgSlug: string,
      spaceSlug: string,
      blueprintId: string,
    ) => `/org/${orgSlug}/space/${spaceSlug}/agent-blueprints/${blueprintId}`,
    toPackages: (orgSlug: string, spaceSlug: string) =>
      `/org/${orgSlug}/space/${spaceSlug}/packages`,
    toStandards: (orgSlug: string, spaceSlug: string) =>
      `/org/${orgSlug}/space/${spaceSlug}/standards`,
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
  },

  /**
   * Public/auth routes
   */
  auth: {
    toSignIn: () => '/sign-in',
    toSignUp: () => '/sign-up',
    toForgotPassword: () => '/forgot-password',
    toResetPassword: (token?: string) =>
      token ? `/reset-password?token=${token}` : '/reset-password',
    toActivate: (token: string) => `/activate?token=${token}`,
  },
};
