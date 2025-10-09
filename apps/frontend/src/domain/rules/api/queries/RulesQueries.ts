import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RuleExample, RuleExampleId } from '@packmind/standards/types';
import { RuleId } from '@packmind/shared/types';
import { rulesGateway } from '../gateways';
import { GET_RULE_EXAMPLES_KEY } from '../queryKeys';
import { ORGANIZATION_QUERY_SCOPE } from '../../../organizations/api/queryKeys';
import { STANDARDS_QUERY_SCOPE } from '../../../standards/api/queryKeys';

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
      // Invalidate rules queries to refresh the data
      await queryClient.invalidateQueries({
        queryKey: [ORGANIZATION_QUERY_SCOPE, STANDARDS_QUERY_SCOPE],
      });
      await queryClient.invalidateQueries({
        queryKey: [
          ...GET_RULE_EXAMPLES_KEY,
          variables.standardId,
          variables.ruleId,
        ],
      });
    },
  });
};

export const useUpdateRuleExampleMutation = () => {
  const queryClient = useQueryClient();

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
      // Invalidate rules queries to refresh the data
      await queryClient.invalidateQueries({
        queryKey: [ORGANIZATION_QUERY_SCOPE, STANDARDS_QUERY_SCOPE],
      });
      await queryClient.invalidateQueries({
        queryKey: [
          ...GET_RULE_EXAMPLES_KEY,
          variables.standardId,
          variables.ruleId,
        ],
      });
    },
  });
};

export const useDeleteRuleExampleMutation = () => {
  const queryClient = useQueryClient();

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
      // Invalidate rules queries to refresh the data
      await queryClient.invalidateQueries({
        queryKey: [ORGANIZATION_QUERY_SCOPE, STANDARDS_QUERY_SCOPE],
      });
      await queryClient.invalidateQueries({
        queryKey: [
          ...GET_RULE_EXAMPLES_KEY,
          variables.standardId,
          variables.ruleId,
        ],
      });
    },
  });
};
