import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RuleExample, RuleExampleId } from '@packmind/standards/types';
import { RuleId } from '@packmind/shared/types';
import { rulesGateway } from '../gateways';

export const useGetRuleExamplesQuery = (
  standardId: string,
  ruleId: RuleId,
  enabled = true,
) => {
  return useQuery({
    queryKey: ['ruleExamples', standardId, ruleId],
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
        queryKey: ['rules', variables.standardId],
      });
      await queryClient.invalidateQueries({
        queryKey: ['ruleExamples', variables.standardId, variables.ruleId],
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
        queryKey: ['rules', variables.standardId],
      });
      await queryClient.invalidateQueries({
        queryKey: ['ruleExamples', variables.standardId, variables.ruleId],
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
        queryKey: ['rules', variables.standardId],
      });
      await queryClient.invalidateQueries({
        queryKey: ['ruleExamples', variables.standardId, variables.ruleId],
      });
    },
  });
};
