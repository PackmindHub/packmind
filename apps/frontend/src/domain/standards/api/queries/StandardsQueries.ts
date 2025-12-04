import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router';

import { standardsGateway } from '../gateways';
import { OrganizationId, RuleId, StandardId, SpaceId } from '@packmind/types';
import {
  GET_STANDARDS_DEPLOYMENT_OVERVIEW_KEY,
  LIST_PACKAGES_BY_SPACE_KEY,
} from '../../../deployments/api/queryKeys';
import {
  GET_STANDARD_VERSIONS_KEY,
  GET_RULES_BY_STANDARD_ID_KEY,
  getStandardsBySpaceKey,
  getStandardByIdKey,
} from '../queryKeys';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { GET_ONBOARDING_STATUS_KEY } from '../../../accounts/api/queryKeys';
import { GET_STANDARD_RULES_DETECTION_STATUS_KEY } from '@packmind/proprietary/frontend/domain/detection/api/queryKeys';

export const getStandardsBySpaceQueryOptions = (
  spaceId: SpaceId | undefined,
  organizationId: OrganizationId | undefined,
) => ({
  queryKey: getStandardsBySpaceKey(spaceId),
  queryFn: () => {
    if (!spaceId) {
      throw new Error('Space ID is required to fetch standards');
    }
    if (!organizationId) {
      throw new Error('Organization ID is required to fetch standards');
    }
    return standardsGateway.getStandards({
      spaceId,
      organizationId,
    });
  },
  enabled: !!spaceId && !!organizationId,
});

export const useGetStandardsQuery = () => {
  const { spaceId } = useCurrentSpace();
  const { organization } = useAuthContext();

  return useQuery(getStandardsBySpaceQueryOptions(spaceId, organization?.id));
};

export const getStandardByIdOptions = (
  standardId: StandardId,
  spaceId: SpaceId,
  organizationId: OrganizationId,
) => ({
  queryKey: getStandardByIdKey(spaceId, standardId),
  queryFn: () =>
    standardsGateway.getStandardById({ standardId, spaceId, organizationId }),
  enabled: !!standardId && !!spaceId && !!organizationId,
});

export const useGetStandardByIdQuery = (id: StandardId) => {
  const { spaceId, spaceSlug: currentSpaceSlug } = useCurrentSpace();
  const { organization } = useAuthContext();
  const { orgSlug, spaceSlug } = useParams<{
    orgSlug: string;
    spaceSlug: string;
  }>();

  // Prevent query from running during org/space transitions
  // When switching orgs, the URL params may not match the current context
  const isOrgMatch = organization?.slug === orgSlug;
  const isSpaceMatch = currentSpaceSlug === spaceSlug;

  return useQuery({
    ...getStandardByIdOptions(
      id,
      spaceId as SpaceId,
      organization?.id as OrganizationId,
    ),
    enabled:
      !!id && !!spaceId && !!organization?.id && isOrgMatch && isSpaceMatch,
  });
};

const CREATE_STANDARD_MUTATION_KEY = 'createStandard';

export const useCreateStandardMutation = () => {
  const queryClient = useQueryClient();
  const { spaceId } = useCurrentSpace();
  const { organization } = useAuthContext();

  if (!spaceId || !organization) {
    throw new Error('Missing space or organization');
  }

  return useMutation({
    mutationKey: [CREATE_STANDARD_MUTATION_KEY],
    mutationFn: async (newStandard: {
      name: string;
      description: string;
      rules: Array<{ content: string }>;
      scope?: string | null;
    }) => {
      return standardsGateway.createStandard(
        organization.id,
        spaceId,
        newStandard,
      );
    },
    onSuccess: async () => {
      // Invalidate all standards queries
      await queryClient.invalidateQueries({
        queryKey: getStandardsBySpaceKey(spaceId),
      });

      // Deployments overview (new standard can be deployed)
      await queryClient.invalidateQueries({
        queryKey: GET_STANDARDS_DEPLOYMENT_OVERVIEW_KEY,
      });
      await queryClient.invalidateQueries({
        queryKey: [GET_ONBOARDING_STATUS_KEY],
      });
    },
    onError: async (error, variables, context) => {
      console.error('Error creating standard');
      console.log('error: ', error);
      console.log('variables: ', variables);
      console.log('context: ', context);
    },
  });
};

const UPDATE_STANDARD_MUTATION_KEY = 'updateStandard';

export const useUpdateStandardMutation = () => {
  const queryClient = useQueryClient();
  const { spaceId } = useCurrentSpace();
  const { organization } = useAuthContext();

  if (!spaceId || !organization) {
    throw new Error('Missing space or organization');
  }

  return useMutation({
    mutationKey: [UPDATE_STANDARD_MUTATION_KEY],
    mutationFn: async ({
      id,
      standard,
    }: {
      id: StandardId;
      standard: {
        name: string;
        description: string;
        rules: Array<{ id: RuleId; content: string }>;
        scope?: string | null;
      };
    }) => {
      return standardsGateway.updateStandard(
        organization.id,
        spaceId,
        id,
        standard,
      );
    },
    onSuccess: async (_, variables) => {
      // Invalidate all queries for this specific standard
      // This includes: standard by id, versions, rules (all share the id prefix)
      await queryClient.invalidateQueries({
        queryKey: getStandardByIdKey(spaceId, variables.id),
      });

      // Invalidate the rules for this standard (rules may have been added/deleted)
      await queryClient.invalidateQueries({
        queryKey: [
          ...GET_RULES_BY_STANDARD_ID_KEY,
          organization.id,
          spaceId,
          variables.id,
        ],
      });

      await queryClient.invalidateQueries({
        queryKey: [...GET_STANDARD_RULES_DETECTION_STATUS_KEY, variables.id],
      });

      // Invalidate the standards list (name might have changed)
      await queryClient.invalidateQueries({
        queryKey: getStandardsBySpaceKey(spaceId),
      });

      // Deployments overview (updated standard version affects deployments)
      await queryClient.invalidateQueries({
        queryKey: GET_STANDARDS_DEPLOYMENT_OVERVIEW_KEY,
      });
    },
    onError: async (error, variables, context) => {
      console.error('Error updating standard');
      console.log('error: ', error);
      console.log('variables: ', variables);
      console.log('context: ', context);
    },
  });
};

export const useGetStandardVersionsQuery = (standardId: StandardId) => {
  const { spaceId } = useCurrentSpace();
  const { organization } = useAuthContext();

  return useQuery({
    queryKey: [...GET_STANDARD_VERSIONS_KEY, standardId],
    queryFn: () => {
      if (!organization?.id || !spaceId) {
        throw new Error('Organization and space context required');
      }
      return standardsGateway.getVersionsById(
        organization.id,
        spaceId as SpaceId,
        standardId,
      );
    },
    enabled: !!standardId && !!organization?.id && !!spaceId,
  });
};

export const getRulesByStandardIdOptions = (
  organizationId: OrganizationId,
  spaceId: SpaceId,
  standardId: StandardId,
) => ({
  queryKey: [
    ...GET_RULES_BY_STANDARD_ID_KEY,
    organizationId,
    spaceId,
    standardId,
  ],
  queryFn: () =>
    standardsGateway.getRulesByStandardId(organizationId, spaceId, standardId),
  enabled: !!organizationId && !!spaceId && !!standardId,
});

export const useGetRulesByStandardIdQuery = (
  organizationId: OrganizationId,
  spaceId: SpaceId,
  standardId: StandardId,
) => {
  const { spaceSlug: currentSpaceSlug } = useCurrentSpace();
  const { organization } = useAuthContext();
  const { orgSlug, spaceSlug } = useParams<{
    orgSlug: string;
    spaceSlug: string;
  }>();

  // Prevent query from running during org/space transitions
  // When switching orgs, the URL params may not match the current context
  const isOrgMatch = organization?.slug === orgSlug;
  const isSpaceMatch = currentSpaceSlug === spaceSlug;

  return useQuery({
    ...getRulesByStandardIdOptions(organizationId, spaceId, standardId),
    enabled:
      !!organizationId &&
      !!spaceId &&
      !!standardId &&
      isOrgMatch &&
      isSpaceMatch,
  });
};

const DELETE_STANDARD_MUTATION_KEY = 'deleteStandard';

export const useDeleteStandardMutation = () => {
  const queryClient = useQueryClient();
  const { spaceId } = useCurrentSpace();
  const { organization } = useAuthContext();

  return useMutation({
    mutationKey: [DELETE_STANDARD_MUTATION_KEY],
    mutationFn: async (standardId: StandardId) => {
      if (!organization?.id || !spaceId) {
        throw new Error('Organization and space context required');
      }
      return standardsGateway.deleteStandard(
        organization.id,
        spaceId as SpaceId,
        standardId,
      );
    },
    onSuccess: async () => {
      // Invalidate all standards (standard is gone, may have had cached details)
      await queryClient.invalidateQueries({
        queryKey: getStandardsBySpaceKey(spaceId),
      });

      // Deployments orphaned (see domain-relationships-map.md)
      await queryClient.invalidateQueries({
        queryKey: GET_STANDARDS_DEPLOYMENT_OVERVIEW_KEY,
      });

      // Packages containing the deleted standard need to be refreshed
      await queryClient.invalidateQueries({
        queryKey: LIST_PACKAGES_BY_SPACE_KEY,
      });
    },
    onError: async (error, variables, context) => {
      console.error('Error deleting standard');
      console.log('error: ', error);
      console.log('variables: ', variables);
      console.log('context: ', context);
    },
  });
};

const DELETE_STANDARDS_BATCH_MUTATION_KEY = 'deleteStandardsBatch';

export const useDeleteStandardsBatchMutation = () => {
  const queryClient = useQueryClient();
  const { spaceId } = useCurrentSpace();
  const { organization } = useAuthContext();

  return useMutation({
    mutationKey: [DELETE_STANDARDS_BATCH_MUTATION_KEY],
    mutationFn: async (standardIds: StandardId[]) => {
      if (!organization?.id || !spaceId) {
        throw new Error('Organization and space context required');
      }
      return standardsGateway.deleteStandardsBatch(
        organization.id,
        spaceId as SpaceId,
        standardIds,
      );
    },
    onSuccess: async () => {
      // Same as useDeleteStandardMutation
      await queryClient.invalidateQueries({
        queryKey: getStandardsBySpaceKey(spaceId),
      });

      await queryClient.invalidateQueries({
        queryKey: GET_STANDARDS_DEPLOYMENT_OVERVIEW_KEY,
      });

      // Packages containing the deleted standards need to be refreshed
      await queryClient.invalidateQueries({
        queryKey: LIST_PACKAGES_BY_SPACE_KEY,
      });
    },
    onError: async (error, variables, context) => {
      console.error('Error deleting standards in batch');
      console.log('error: ', error);
      console.log('variables: ', variables);
      console.log('context: ', context);
    },
  });
};
