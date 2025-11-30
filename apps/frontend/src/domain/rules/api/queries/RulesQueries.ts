import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  OrganizationId,
  RuleExample,
  RuleExampleId,
  RuleId,
  SpaceId,
  StandardId,
} from '@packmind/types';
import { rulesGateway } from '../gateways';
import { GET_RULE_EXAMPLES_KEY, getRuleExamplesKey } from '../queryKeys';
import {
  GET_RULES_BY_STANDARD_ID_KEY,
  getStandardByIdKey,
} from '../../../standards/api/queryKeys';
import { useCurrentSpace } from '../../../spaces';
import {
  GET_ACTIVE_DETECTION_PROGRAMS_KEY,
  GET_ALL_DETECTION_PROGRAMS_KEY,
} from '@packmind/proprietary/frontend/domain/detection/api/queryKeys';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';

export const useGetRuleExamplesQuery = (
  organizationId: OrganizationId,
  spaceId: SpaceId,
  standardId: StandardId,
  ruleId: RuleId,
  enabled = true,
) => {
  return useQuery({
    queryKey: getRuleExamplesKey(organizationId, spaceId, standardId, ruleId),
    queryFn: () =>
      rulesGateway.getRuleExamples(organizationId, spaceId, standardId, ruleId),
    enabled:
      enabled && !!organizationId && !!spaceId && !!standardId && !!ruleId,
  });
};

export const useCreateRuleExampleMutation = () => {
  const queryClient = useQueryClient();
  const { spaceId } = useCurrentSpace();
  const { organization } = useAuthContext();

  return useMutation({
    mutationKey: ['createRuleExample'],
    mutationFn: async (params: {
      standardId: StandardId;
      ruleId: RuleId;
      example: {
        lang: string;
        positive: string;
        negative: string;
      };
    }) => {
      if (!organization?.id || !spaceId) {
        throw new Error('Organization and space context required');
      }
      return rulesGateway.createRuleExample(
        organization.id,
        spaceId as SpaceId,
        params.standardId,
        params.ruleId,
        params.example,
      );
    },
    onSuccess: async (newRuleExample: RuleExample, variables) => {
      // Only invalidate specific rule examples
      await Promise.all([
        organization?.id && spaceId
          ? queryClient.invalidateQueries({
              queryKey: getRuleExamplesKey(
                organization.id,
                spaceId as SpaceId,
                variables.standardId,
                variables.ruleId,
              ),
            })
          : Promise.resolve(),

        // Only invalidate the specific standard (if examples are embedded)
        queryClient.invalidateQueries({
          queryKey: getStandardByIdKey(spaceId, variables.standardId),
        }),

        // Only invalidate rules for this standard
        queryClient.invalidateQueries({
          queryKey: [...GET_RULES_BY_STANDARD_ID_KEY, variables.standardId],
        }),

        queryClient.invalidateQueries({
          queryKey: [
            ...GET_ACTIVE_DETECTION_PROGRAMS_KEY,
            variables.standardId,
            variables.ruleId,
          ],
        }),
        queryClient.invalidateQueries({
          queryKey: [
            ...GET_ALL_DETECTION_PROGRAMS_KEY,
            variables.standardId,
            variables.ruleId,
          ],
        }),
      ]);
    },
  });
};

export const useUpdateRuleExampleMutation = () => {
  const queryClient = useQueryClient();
  const { spaceId } = useCurrentSpace();
  const { organization } = useAuthContext();

  return useMutation({
    mutationKey: ['updateRuleExample'],
    mutationFn: async (params: {
      standardId: StandardId;
      ruleId: RuleId;
      exampleId: RuleExampleId;
      updates: {
        lang?: string;
        positive?: string;
        negative?: string;
      };
    }) => {
      if (!organization?.id || !spaceId) {
        throw new Error('Organization and space context required');
      }
      return rulesGateway.updateRuleExample(
        organization.id,
        spaceId as SpaceId,
        params.standardId,
        params.ruleId,
        params.exampleId,
        params.updates,
      );
    },
    onSuccess: async (updatedRuleExample: RuleExample, variables) => {
      await Promise.all([
        organization?.id && spaceId
          ? queryClient.invalidateQueries({
              queryKey: getRuleExamplesKey(
                organization.id,
                spaceId as SpaceId,
                variables.standardId,
                variables.ruleId,
              ),
            })
          : Promise.resolve(),
        queryClient.invalidateQueries({
          queryKey: getStandardByIdKey(spaceId, variables.standardId),
        }),
        queryClient.invalidateQueries({
          queryKey: [...GET_RULES_BY_STANDARD_ID_KEY, variables.standardId],
        }),
        queryClient.invalidateQueries({
          queryKey: [
            ...GET_ACTIVE_DETECTION_PROGRAMS_KEY,
            variables.standardId,
            variables.ruleId,
          ],
        }),
        queryClient.invalidateQueries({
          queryKey: [
            ...GET_ALL_DETECTION_PROGRAMS_KEY,
            variables.standardId,
            variables.ruleId,
          ],
        }),
      ]);
    },
  });
};

export const useDeleteRuleExampleMutation = () => {
  const queryClient = useQueryClient();
  const { spaceId } = useCurrentSpace();
  const { organization } = useAuthContext();

  return useMutation({
    mutationKey: ['deleteRuleExample'],
    mutationFn: async (params: {
      standardId: StandardId;
      ruleId: RuleId;
      exampleId: RuleExampleId;
    }) => {
      if (!organization?.id || !spaceId) {
        throw new Error('Organization and space context required');
      }
      return rulesGateway.deleteRuleExample(
        organization.id,
        spaceId as SpaceId,
        params.standardId,
        params.ruleId,
        params.exampleId,
      );
    },
    onSuccess: async (_, variables) => {
      await Promise.all([
        organization?.id && spaceId
          ? queryClient.invalidateQueries({
              queryKey: getRuleExamplesKey(
                organization.id,
                spaceId as SpaceId,
                variables.standardId,
                variables.ruleId,
              ),
            })
          : Promise.resolve(),
        queryClient.invalidateQueries({
          queryKey: getStandardByIdKey(spaceId, variables.standardId),
        }),
        queryClient.invalidateQueries({
          queryKey: [...GET_RULES_BY_STANDARD_ID_KEY, variables.standardId],
        }),
        queryClient.invalidateQueries({
          queryKey: [
            ...GET_ACTIVE_DETECTION_PROGRAMS_KEY,
            variables.standardId,
            variables.ruleId,
          ],
        }),
        queryClient.invalidateQueries({
          queryKey: [
            ...GET_ALL_DETECTION_PROGRAMS_KEY,
            variables.standardId,
            variables.ruleId,
          ],
        }),
      ]);
    },
  });
};
