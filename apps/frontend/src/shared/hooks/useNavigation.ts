import { useNavigate, useParams } from 'react-router';
import { useAuthContext } from '../../domain/accounts/hooks/useAuthContext';
import { useGetSpacesQuery } from '../../domain/spaces/api/queries/SpacesQueries';

/**
 * Navigation service hook for Packmind application
 * Provides type-safe navigation methods that automatically handle orgSlug and spaceSlug
 *
 * Usage:
 * const nav = useNavigation();
 * nav.toRecipes();
 * nav.toStandard(standardId);
 */
export function useNavigation() {
  const navigate = useNavigate();
  const { orgSlug, spaceSlug } = useParams<{
    orgSlug?: string;
    spaceSlug?: string;
  }>();
  const { organization } = useAuthContext();
  const { data: spaces } = useGetSpacesQuery();

  // Get current org slug (from params or auth context)
  const currentOrgSlug = orgSlug || organization?.slug;

  // Get current space slug (from params or first available space)
  const currentSpaceSlug =
    spaceSlug || (spaces && spaces.length > 0 ? spaces[0].slug : undefined);

  /**
   * Navigate to organization-scoped routes (no space slug)
   */
  const org = {
    toDashboard: () => {
      if (!currentOrgSlug) return;
      navigate(`/org/${currentOrgSlug}`);
    },
    toDeployments: () => {
      if (!currentOrgSlug) return;
      navigate(`/org/${currentOrgSlug}/deployments`);
    },
    toSettings: () => {
      if (!currentOrgSlug) return;
      navigate(`/org/${currentOrgSlug}/settings`);
    },
    toSettingsUsers: () => {
      if (!currentOrgSlug) return;
      navigate(`/org/${currentOrgSlug}/settings/users`);
    },
    toSettingsGit: () => {
      if (!currentOrgSlug) return;
      navigate(`/org/${currentOrgSlug}/settings/git`);
    },
    toSettingsTargets: () => {
      if (!currentOrgSlug) return;
      navigate(`/org/${currentOrgSlug}/settings/targets`);
    },
    toSettingsDistribution: () => {
      if (!currentOrgSlug) return;
      navigate(`/org/${currentOrgSlug}/settings/distribution-rendering`);
    },
    toAccountSettings: () => {
      if (!currentOrgSlug) return;
      navigate(`/org/${currentOrgSlug}/account-settings`);
    },
  };

  /**
   * Navigate to space-scoped routes (includes space slug)
   */
  const space = {
    toRecipes: () => {
      if (!currentOrgSlug || !currentSpaceSlug) return;
      navigate(`/org/${currentOrgSlug}/space/${currentSpaceSlug}/recipes`);
    },
    toRecipe: (recipeId: string) => {
      if (!currentOrgSlug || !currentSpaceSlug) return;
      navigate(
        `/org/${currentOrgSlug}/space/${currentSpaceSlug}/recipes/${recipeId}`,
      );
    },
    toStandards: () => {
      if (!currentOrgSlug || !currentSpaceSlug) return;
      navigate(`/org/${currentOrgSlug}/space/${currentSpaceSlug}/standards`);
    },
    toStandard: (standardId: string) => {
      if (!currentOrgSlug || !currentSpaceSlug) return;
      navigate(
        `/org/${currentOrgSlug}/space/${currentSpaceSlug}/standards/${standardId}`,
      );
    },
    toStandardRules: (standardId: string) => {
      if (!currentOrgSlug || !currentSpaceSlug) return;
      navigate(
        `/org/${currentOrgSlug}/space/${currentSpaceSlug}/standards/${standardId}/rules`,
      );
    },
    toStandardEdit: (standardId: string) => {
      if (!currentOrgSlug || !currentSpaceSlug) return;
      navigate(
        `/org/${currentOrgSlug}/space/${currentSpaceSlug}/standards/${standardId}/edit`,
      );
    },
    toCreateStandard: () => {
      if (!currentOrgSlug || !currentSpaceSlug) return;
      navigate(
        `/org/${currentOrgSlug}/space/${currentSpaceSlug}/standards/create`,
      );
    },
    toCommands: () => {
      if (!currentOrgSlug || !currentSpaceSlug) return;
      navigate(`/org/${currentOrgSlug}/space/${currentSpaceSlug}/commands`);
    },
    toCommand: (commandId: string) => {
      if (!currentOrgSlug || !currentSpaceSlug) return;
      navigate(
        `/org/${currentOrgSlug}/space/${currentSpaceSlug}/commands/${commandId}`,
      );
    },
    toCreateCommand: () => {
      if (!currentOrgSlug || !currentSpaceSlug) return;
      navigate(
        `/org/${currentOrgSlug}/space/${currentSpaceSlug}/commands/create`,
      );
    },
    toEditCommand: (commandId: string) => {
      if (!currentOrgSlug || !currentSpaceSlug) return;
      navigate(
        `/org/${currentOrgSlug}/space/${currentSpaceSlug}/commands/${commandId}/edit`,
      );
    },
  };

  /**
   * Navigate to public routes
   */
  const auth = {
    toSignIn: () => navigate('/sign-in'),
    toSignUp: () => navigate('/sign-up/create-account'),
    toCreateAccount: () => navigate('/create-account'),
    toForgotPassword: () => navigate('/forgot-password'),
    toResetPassword: (token?: string) =>
      navigate(token ? `/reset-password?token=${token}` : '/reset-password'),
    toActivate: (token: string) => navigate(`/activate?token=${token}`),
  };

  /**
   * Generic navigation with custom path
   */
  const to = (path: string) => navigate(path);

  /**
   * Navigation with options (replace, state, etc.)
   */
  const toWithOptions = (
    path: string,
    options?: { replace?: boolean; state?: unknown },
  ) => navigate(path, options);

  return {
    org,
    space,
    auth,
    to,
    toWithOptions,
    // Expose current context for conditional logic
    currentOrgSlug,
    currentSpaceSlug,
    isReady: !!currentOrgSlug && !!currentSpaceSlug,
  };
}
