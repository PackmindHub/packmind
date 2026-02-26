import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ApplyChangeProposalsCommand,
  ChangeProposalType,
  OrganizationId,
  RecipeId,
  SkillId,
  SpaceId,
  StandardId,
} from '@packmind/types';
import { pmToaster } from '@packmind/ui';
import { changeProposalsGateway } from '../gateways';
import { CreateChangeProposalParams } from '../gateways/IChangeProposalsGateway';
import {
  APPLY_RECIPE_CHANGE_PROPOSALS_MUTATION_KEY,
  APPLY_SKILL_CHANGE_PROPOSALS_MUTATION_KEY,
  APPLY_STANDARD_CHANGE_PROPOSALS_MUTATION_KEY,
  CREATE_CHANGE_PROPOSAL_MUTATION_KEY,
  GET_CHANGE_PROPOSALS_BY_RECIPE_KEY,
  GET_CHANGE_PROPOSALS_BY_SKILL_KEY,
  GET_CHANGE_PROPOSALS_BY_STANDARD_KEY,
  GET_GROUPED_CHANGE_PROPOSALS_KEY,
} from '../queryKeys';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';
import {
  GET_RECIPES_KEY,
  GET_RECIPE_BY_ID_KEY,
} from '../../../recipes/api/queryKeys';
import {
  GET_SKILLS_KEY,
  SKILLS_QUERY_SCOPE,
} from '../../../skills/api/queryKeys';
import { SPACES_SCOPE } from '../../../spaces/api/queryKeys';
import { ORGANIZATION_QUERY_SCOPE } from '../../../organizations/api/queryKeys';
import {
  GET_RULES_BY_STANDARD_ID_KEY,
  getStandardByIdKey,
} from '../../../standards/api/queryKeys';
import { routes } from '../../../../shared/utils/routes';

export const getGroupedChangeProposalsOptions = (
  organizationId: OrganizationId | undefined,
  spaceId: SpaceId | undefined,
) => ({
  queryKey: [...GET_GROUPED_CHANGE_PROPOSALS_KEY],
  queryFn: () => {
    if (!organizationId) {
      throw new Error(
        'Organization ID is required to fetch grouped change proposals',
      );
    }
    if (!spaceId) {
      throw new Error('Space ID is required to fetch grouped change proposals');
    }
    return changeProposalsGateway.getGroupedChangeProposals({
      organizationId,
      spaceId,
    });
  },
  enabled: !!organizationId && !!spaceId,
});

export const useGetGroupedChangeProposalsQuery = (
  overrideSpaceId?: SpaceId,
) => {
  const { organization } = useAuthContext();
  const { spaceId: currentSpaceId } = useCurrentSpace();
  const spaceId = overrideSpaceId ?? currentSpaceId;

  return useQuery(getGroupedChangeProposalsOptions(organization?.id, spaceId));
};

export const listChangeProposalsByRecipeOptions = (
  organizationId: OrganizationId | undefined,
  spaceId: SpaceId | undefined,
  recipeId: RecipeId | undefined,
) => ({
  queryKey: [...GET_CHANGE_PROPOSALS_BY_RECIPE_KEY, recipeId],
  queryFn: () => {
    if (!organizationId) {
      throw new Error('Organization ID is required to fetch change proposals');
    }
    if (!spaceId) {
      throw new Error('Space ID is required to fetch change proposals');
    }
    if (!recipeId) {
      throw new Error('Recipe ID is required to fetch change proposals');
    }
    return changeProposalsGateway.listChangeProposalsByRecipe({
      organizationId,
      spaceId,
      artefactId: recipeId,
    });
  },
  enabled: !!organizationId && !!spaceId && !!recipeId,
});

export const useListChangeProposalsByRecipeQuery = (
  recipeId: RecipeId | undefined,
) => {
  const { organization } = useAuthContext();
  const { spaceId } = useCurrentSpace();

  return useQuery(
    listChangeProposalsByRecipeOptions(organization?.id, spaceId, recipeId),
  );
};

export const listChangeProposalsBySkillOptions = (
  organizationId: OrganizationId | undefined,
  spaceId: SpaceId | undefined,
  skillId: SkillId | undefined,
) => ({
  queryKey: [...GET_CHANGE_PROPOSALS_BY_SKILL_KEY, skillId],
  queryFn: () => {
    if (!organizationId) {
      throw new Error('Organization ID is required to fetch change proposals');
    }
    if (!spaceId) {
      throw new Error('Space ID is required to fetch change proposals');
    }
    if (!skillId) {
      throw new Error('Skill ID is required to fetch change proposals');
    }
    return changeProposalsGateway.listChangeProposalsBySkill({
      organizationId,
      spaceId,
      artefactId: skillId,
    });
  },
  enabled: !!organizationId && !!spaceId && !!skillId,
});

export const useListChangeProposalsBySkillQuery = (
  skillId: SkillId | undefined,
) => {
  const { organization } = useAuthContext();
  const { spaceId } = useCurrentSpace();

  return useQuery(
    listChangeProposalsBySkillOptions(organization?.id, spaceId, skillId),
  );
};

export const listChangeProposalsByStandardOptions = (
  organizationId: OrganizationId | undefined,
  spaceId: SpaceId | undefined,
  standardId: StandardId | undefined,
) => ({
  queryKey: [...GET_CHANGE_PROPOSALS_BY_STANDARD_KEY, standardId],
  queryFn: () => {
    if (!organizationId) {
      throw new Error('Organization ID is required to fetch change proposals');
    }
    if (!spaceId) {
      throw new Error('Space ID is required to fetch change proposals');
    }
    if (!standardId) {
      throw new Error('Standard ID is required to fetch change proposals');
    }
    return changeProposalsGateway.listChangeProposalsByStandard({
      organizationId,
      spaceId,
      artefactId: standardId,
    });
  },
  enabled: !!organizationId && !!spaceId && !!standardId,
});

export const useListChangeProposalsByStandardQuery = (
  standardId: StandardId | undefined,
) => {
  const { organization } = useAuthContext();
  const { spaceId } = useCurrentSpace();

  return useQuery(
    listChangeProposalsByStandardOptions(organization?.id, spaceId, standardId),
  );
};

export const useCreateChangeProposalMutation = () => {
  return useMutation({
    mutationKey: [...CREATE_CHANGE_PROPOSAL_MUTATION_KEY],
    mutationFn: async (
      params: CreateChangeProposalParams<ChangeProposalType>,
    ) => {
      return changeProposalsGateway.createChangeProposal(params);
    },
    onError: (error, variables, context) => {
      console.error('Error creating change proposal');
      console.log('error: ', error);
      console.log('variables: ', variables);
      console.log('context: ', context);
    },
  });
};

export const useApplyRecipeChangeProposalsMutation = (params?: {
  orgSlug?: string;
  spaceSlug?: string;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [...APPLY_RECIPE_CHANGE_PROPOSALS_MUTATION_KEY],
    mutationFn: async (
      command: Omit<ApplyChangeProposalsCommand<RecipeId>, 'userId'>,
    ) => {
      return changeProposalsGateway.applyRecipeChangeProposals(command);
    },
    onSuccess: async (response, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: GET_GROUPED_CHANGE_PROPOSALS_KEY,
        }),
        queryClient.invalidateQueries({
          queryKey: GET_CHANGE_PROPOSALS_BY_RECIPE_KEY,
        }),
        queryClient.invalidateQueries({
          queryKey: GET_RECIPES_KEY,
        }),
        queryClient.invalidateQueries({
          queryKey: GET_RECIPE_BY_ID_KEY,
        }),
      ]);

      // Show success toast with link to the new recipe version
      if (params?.orgSlug && params?.spaceSlug) {
        const recipeUrl = routes.space.toCommand(
          params.orgSlug,
          params.spaceSlug,
          variables.artefactId,
        );
        pmToaster.create({
          title: 'Changes applied successfully',
          description: `View the updated command`,
          type: 'success',
          action: {
            label: 'View command',
            onClick: () => {
              window.location.href = recipeUrl;
            },
          },
        });
      } else {
        pmToaster.create({
          title: 'Changes applied successfully',
          type: 'success',
        });
      }
    },
    onError: (error, variables, context) => {
      console.error('Error applying recipe change proposals');
      console.log('error: ', error);
      console.log('variables: ', variables);
      console.log('context: ', context);

      pmToaster.create({
        title: 'Failed to apply changes',
        description:
          'The changes could not be applied. Please try again or contact support if the problem persists.',
        type: 'error',
      });
    },
  });
};

export const useApplyStandardChangeProposalsMutation = (params?: {
  orgSlug?: string;
  spaceSlug?: string;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [...APPLY_STANDARD_CHANGE_PROPOSALS_MUTATION_KEY],
    mutationFn: async (
      command: Omit<ApplyChangeProposalsCommand<StandardId>, 'userId'>,
    ) => {
      return changeProposalsGateway.applyStandardChangeProposals(command);
    },
    onSuccess: async (_response, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: GET_GROUPED_CHANGE_PROPOSALS_KEY,
        }),
        queryClient.invalidateQueries({
          queryKey: [
            ...GET_CHANGE_PROPOSALS_BY_STANDARD_KEY,
            variables.artefactId,
          ],
        }),
        queryClient.invalidateQueries({
          queryKey: getStandardByIdKey(variables.spaceId, variables.artefactId),
        }),
        queryClient.invalidateQueries({
          queryKey: GET_RULES_BY_STANDARD_ID_KEY,
        }),
        queryClient.invalidateQueries({
          queryKey: [ORGANIZATION_QUERY_SCOPE, SPACES_SCOPE, variables.spaceId],
        }),
      ]);

      // Show success toast with link to the standard
      if (params?.orgSlug && params?.spaceSlug) {
        const standardUrl = routes.space.toStandard(
          params.orgSlug,
          params.spaceSlug,
          variables.artefactId,
        );
        pmToaster.create({
          title: 'Changes applied successfully',
          description: `View the updated standard`,
          type: 'success',
          action: {
            label: 'View standard',
            onClick: () => {
              window.location.href = standardUrl;
            },
          },
        });
      } else {
        pmToaster.create({
          title: 'Changes applied successfully',
          type: 'success',
        });
      }
    },
    onError: (error, variables, context) => {
      console.error('Error applying standard change proposals');
      console.log('error: ', error);
      console.log('variables: ', variables);
      console.log('context: ', context);

      pmToaster.create({
        title: 'Failed to apply changes',
        description:
          'The changes could not be applied. Please try again or contact support if the problem persists.',
        type: 'error',
      });
    },
  });
};

export const useApplySkillChangeProposalsMutation = (params?: {
  orgSlug?: string;
  spaceSlug?: string;
  skillSlug?: string;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [...APPLY_SKILL_CHANGE_PROPOSALS_MUTATION_KEY],
    mutationFn: async (
      command: Omit<ApplyChangeProposalsCommand<SkillId>, 'userId'>,
    ) => {
      return changeProposalsGateway.applySkillChangeProposals(command);
    },
    onSuccess: async (_response, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: GET_GROUPED_CHANGE_PROPOSALS_KEY,
        }),
        queryClient.invalidateQueries({
          queryKey: GET_CHANGE_PROPOSALS_BY_SKILL_KEY,
        }),
        queryClient.invalidateQueries({
          queryKey: GET_SKILLS_KEY,
        }),
        queryClient.invalidateQueries({
          queryKey: [
            ORGANIZATION_QUERY_SCOPE,
            SPACES_SCOPE,
            variables.spaceId,
            SKILLS_QUERY_SCOPE,
          ],
        }),
      ]);

      // Show success toast with link to the skill
      if (params?.orgSlug && params?.spaceSlug && params?.skillSlug) {
        const skillUrl = routes.space.toSkill(
          params.orgSlug,
          params.spaceSlug,
          params.skillSlug,
        );
        pmToaster.create({
          title: 'Changes applied successfully',
          description: `View the updated skill`,
          type: 'success',
          action: {
            label: 'View skill',
            onClick: () => {
              window.location.href = skillUrl;
            },
          },
        });
      } else {
        pmToaster.create({
          title: 'Changes applied successfully',
          type: 'success',
        });
      }
    },
    onError: (error, variables, context) => {
      console.error('Error applying skill change proposals');
      console.log('error: ', error);
      console.log('variables: ', variables);
      console.log('context: ', context);

      pmToaster.create({
        title: 'Failed to apply changes',
        description:
          'The changes could not be applied. Please try again or contact support if the problem persists.',
        type: 'error',
      });
    },
  });
};
