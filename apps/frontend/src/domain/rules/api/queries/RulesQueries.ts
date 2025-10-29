import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createStandardId,
  RuleExample,
  RuleExampleId,
} from '@packmind/shared/types';
import { RuleId } from '@packmind/shared/types';
import { rulesGateway } from '../gateways';
import { GET_RULE_EXAMPLES_KEY } from '../queryKeys';
import {
  GET_ACTIVE_DETECTION_PROGRAMS_KEY,
  GET_ALL_DETECTION_PROGRAMS_KEY,
} from '../../../detection/api/queryKeys';
import {
  GET_RULES_BY_STANDARD_ID_KEY,
  getStandardByIdKey,
} from '../../../standards/api/queryKeys';
import { useCurrentSpace } from '../../../spaces';

export const useGetRuleExamplesQuery = (
  standardId: string,
  ruleId: RuleId,
  enabled = true,
) => {
  return useQuery({
    queryKey: [...GET_RULE_EXAMPLES_KEY, standardId, ruleId],
    queryFn: () => rulesGateway.getRuleExamples(standardId, ruleId),
    enabled: enabled && !!standardId && !!ruleId,
  });
};

export const useCreateRuleExampleMutation = () => {
  const queryClient = useQueryClient();
  const { spaceId } = useCurrentSpace();

  return useMutation({
    mutationKey: ['createRuleExample'],
    mutationFn: async (params: {
      standardId: string;
      ruleId: RuleId;
      example: {
        lang: string;
        positive: string;
        negative: string;
      };
    }) => {
      return rulesGateway.createRuleExample(
        params.standardId,
        params.ruleId,
        params.example,
      );
    },
    onSuccess: async (newRuleExample: RuleExample, variables) => {
      // Only invalidate specific rule examples
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [
            ...GET_RULE_EXAMPLES_KEY,
            variables.standardId,
            variables.ruleId,
          ],
        }),

        // Only invalidate the specific standard (if examples are embedded)
        queryClient.invalidateQueries({
          queryKey: getStandardByIdKey(
            spaceId,
            createStandardId(variables.standardId),
          ),
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

  return useMutation({
    mutationKey: ['updateRuleExample'],
    mutationFn: async (params: {
      standardId: string;
      ruleId: RuleId;
      exampleId: RuleExampleId;
      updates: {
        lang?: string;
        positive?: string;
        negative?: string;
      };
    }) => {
      return rulesGateway.updateRuleExample(
        params.standardId,
        params.ruleId,
        params.exampleId,
        params.updates,
      );
    },
    onSuccess: async (updatedRuleExample: RuleExample, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [
            ...GET_RULE_EXAMPLES_KEY,
            variables.standardId,
            variables.ruleId,
          ],
        }),
        queryClient.invalidateQueries({
          queryKey: getStandardByIdKey(
            spaceId,
            createStandardId(variables.standardId),
          ),
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

  return useMutation({
    mutationKey: ['deleteRuleExample'],
    mutationFn: async (params: {
      standardId: string;
      ruleId: RuleId;
      exampleId: RuleExampleId;
    }) => {
      return rulesGateway.deleteRuleExample(
        params.standardId,
        params.ruleId,
        params.exampleId,
      );
    },
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [
            ...GET_RULE_EXAMPLES_KEY,
            variables.standardId,
            variables.ruleId,
          ],
        }),
        queryClient.invalidateQueries({
          queryKey: getStandardByIdKey(
            spaceId,
            createStandardId(variables.standardId),
          ),
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
