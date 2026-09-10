import type {
  ActiveDetectionProgramId,
  DetectionSeverity,
} from '@packmind/types';

type UpdateSeverityVariables = {
  standardId: string;
  ruleId: string;
  activeDetectionProgramId: ActiveDetectionProgramId;
  severity: DetectionSeverity;
};

/**
 * Setting what a detection program reports a violation as, which this edition
 * has no programs to report from.
 *
 * A no-op rather than a notice, unlike `ProgramEditor` beside it. That one is
 * mounted here and has to say why it is empty; this one cannot be reached at
 * all: `useGetStandardRulesDetectionStatusQuery` answers with an empty array
 * forever, so no language ever arrives with a severity, and the control that
 * would call this is never rendered.
 *
 * It exists so the shared component that offers the control compiles in both
 * editions, which is the whole job of this folder.
 */
export const useUpdateActiveDetectionProgramSeverityMutation = () => ({
  mutate: (_variables: UpdateSeverityVariables): void => undefined,
  isPending: false,
});
