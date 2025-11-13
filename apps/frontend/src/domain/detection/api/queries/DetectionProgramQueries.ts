import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { detectionGateway } from '../gateways';
import {
  GET_ACTIVE_DETECTION_PROGRAMS_KEY,
  GET_ALL_DETECTION_PROGRAMS_KEY,
  GET_DETECTION_PROGRAM_METADATA_KEY,
  GET_RULE_DETECTION_ASSESSMENT_KEY,
  GET_RULE_LANGUAGE_DETECTION_STATUS_KEY,
  GET_STANDARD_RULES_DETECTION_STATUS_KEY,
  GET_DETECTION_HEURISTICS_KEY,
} from '../queryKeys';

export const UPDATE_DETECTION_PROGRAM_MUTATION_KEY = 'updateDetectionProgram';
export const GENERATE_PROGRAM_MUTATION_KEY = 'generateProgram';
export const ACTIVATE_DETECTION_PROGRAM_MUTATION_KEY =
  'activateDetectionProgram';
export const TEST_PROGRAM_EXECUTION_MUTATION_KEY = 'testProgramExecution';
export const UPDATE_DETECTION_HEURISTICS_MUTATION_KEY =
  'updateDetectionHeuristics';

export const useSaveDetectionProgramMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      standardId,
      ruleId,
      code,
    }: {
      standardId: string;
      ruleId: string;
      code: string;
    }) => {
      return detectionGateway.saveDetectionProgram(standardId, ruleId, code);
    },
    onSuccess: async (_, variables) => {
      await Promise.all([
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

export const useGetActiveDetectionProgramsQuery = (
  standardId: string,
  ruleId: string,
) => {
  return useQuery({
    queryKey: [...GET_ACTIVE_DETECTION_PROGRAMS_KEY, standardId, ruleId],
    queryFn: () =>
      detectionGateway.getActiveDetectionPrograms(standardId, ruleId),
    enabled: !!standardId && !!ruleId,
  });
};

export const useUpdateDetectionProgramMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: [UPDATE_DETECTION_PROGRAM_MUTATION_KEY],
    mutationFn: async ({
      standardId,
      ruleId,
      detectionProgramId,
      code,
    }: {
      standardId: string;
      ruleId: string;
      detectionProgramId: string;
      code: string;
    }) => {
      return detectionGateway.updateDetectionProgram(
        standardId,
        ruleId,
        detectionProgramId,
        code,
      );
    },
    onSuccess: async (_, variables) => {
      await Promise.all([
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

export const useActivateDetectionDraftMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: [ACTIVATE_DETECTION_PROGRAM_MUTATION_KEY],
    mutationFn: async ({
      standardId,
      ruleId,
      activeDetectionProgramId,
      detectionProgramId,
    }: {
      standardId: string;
      ruleId: string;
      activeDetectionProgramId: string;
      detectionProgramId: string;
    }) => {
      return detectionGateway.activateDetectionProgram(
        standardId,
        ruleId,
        activeDetectionProgramId,
        detectionProgramId,
      );
    },
    onSuccess: async (_, variables) => {
      await Promise.all([
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

export const useGetAllDetectionProgramsQuery = (
  standardId: string,
  ruleId: string,
) => {
  return useQuery({
    queryKey: [...GET_ALL_DETECTION_PROGRAMS_KEY, standardId, ruleId],
    queryFn: () => detectionGateway.getAllDetectionPrograms(standardId, ruleId),
    enabled: !!standardId && !!ruleId,
  });
};

export const useGenerateProgramMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: [GENERATE_PROGRAM_MUTATION_KEY],
    mutationFn: async ({
      standardId,
      ruleId,
      language,
    }: {
      standardId: string;
      ruleId: string;
      language?: string;
    }) => {
      return detectionGateway.generateProgram(standardId, ruleId, language);
    },
    onSuccess: async (_, variables) => {
      await Promise.all([
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
    onError: async (error, variables, context) => {
      console.error('Error generating program');
      console.log('error: ', error);
      console.log('variables: ', variables);
      console.log('context: ', context);
    },
  });
};

export const useGetDetectionProgramMetadataQuery = (
  standardId: string,
  ruleId: string,
  detectionProgramId: string | null,
) => {
  return useQuery({
    queryKey: [
      ...GET_DETECTION_PROGRAM_METADATA_KEY,
      standardId,
      ruleId,
      detectionProgramId,
    ],
    queryFn: () =>
      detectionGateway.getDetectionProgramMetadata(
        standardId,
        ruleId,
        detectionProgramId!,
      ),
    enabled: !!standardId && !!ruleId && !!detectionProgramId,
  });
};

export const useGetRuleDetectionAssessmentQuery = (
  standardId: string,
  ruleId: string,
  language: string,
) => {
  return useQuery({
    queryKey: [
      ...GET_RULE_DETECTION_ASSESSMENT_KEY,
      standardId,
      ruleId,
      language,
    ],
    queryFn: () =>
      detectionGateway.getRuleDetectionAssessment(standardId, ruleId, language),
    enabled: !!standardId && !!ruleId && !!language,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: 'always',
  });
};

export const useGetRuleLanguageDetectionStatusQuery = (
  standardId: string,
  ruleId: string,
  language: string,
) => {
  return useQuery({
    queryKey: [
      ...GET_RULE_LANGUAGE_DETECTION_STATUS_KEY,
      standardId,
      ruleId,
      language,
    ],
    queryFn: () =>
      detectionGateway.getRuleLanguageDetectionStatus(
        standardId,
        ruleId,
        language,
      ),
    enabled: !!standardId && !!ruleId && !!language,
  });
};

export const useGetStandardRulesDetectionStatusQuery = (standardId: string) => {
  return useQuery({
    queryKey: [...GET_STANDARD_RULES_DETECTION_STATUS_KEY, standardId],
    queryFn: () => detectionGateway.getStandardRulesDetectionStatus(standardId),
    enabled: !!standardId,
  });
};

export const useTestProgramExecutionMutation = () => {
  return useMutation({
    mutationKey: [TEST_PROGRAM_EXECUTION_MUTATION_KEY],
    mutationFn: async ({
      standardId,
      ruleId,
      detectionProgramId,
      sandboxCode,
    }: {
      standardId: string;
      ruleId: string;
      detectionProgramId: string;
      sandboxCode: string;
    }) => {
      return detectionGateway.testProgramExecution(
        standardId,
        ruleId,
        detectionProgramId,
        sandboxCode,
      );
    },
  });
};

export const getDetectionHeuristicsQueryOptions = (
  standardId: string,
  ruleId: string,
  language: string,
) => ({
  queryKey: [...GET_DETECTION_HEURISTICS_KEY, standardId, ruleId, language],
  queryFn: () =>
    detectionGateway.getDetectionHeuristics(standardId, ruleId, language),
  enabled: !!standardId && !!ruleId && !!language,
});

export const useGetDetectionHeuristicsQuery = (
  standardId: string,
  ruleId: string,
  language: string,
) => {
  return useQuery(
    getDetectionHeuristicsQueryOptions(standardId, ruleId, language),
  );
};

export const useUpdateDetectionHeuristicsMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: [UPDATE_DETECTION_HEURISTICS_MUTATION_KEY],
    mutationFn: async ({
      standardId,
      ruleId,
      detectionHeuristicsId,
      heuristics,
      clarificationQuestion,
    }: {
      standardId: string;
      ruleId: string;
      detectionHeuristicsId: string;
      heuristics: string[];
      clarificationQuestion?: {
        question: string;
        answer: string;
      };
    }) => {
      return detectionGateway.updateDetectionHeuristics(
        standardId,
        ruleId,
        detectionHeuristicsId,
        heuristics,
        clarificationQuestion,
      );
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: [
          ...GET_DETECTION_HEURISTICS_KEY,
          variables.standardId,
          variables.ruleId,
        ],
      });
    },
  });
};
