import { useMemo } from 'react';
import { PMText } from '@packmind/ui';
import {
  RuleLanguageDetectionStatus,
  DetectionSeverity,
} from '@packmind/types';
import type { ActiveDetectionProgramId } from '@packmind/types';
import { getLanguageDisplayName } from '@packmind/proprietary/frontend/domain/detection/components/DetectionCardUtils';
import { useGetStandardRulesDetectionStatusQuery } from '@packmind/proprietary/frontend/domain/detection/hooks/useStandardEditionFeatures';
import { useUpdateActiveDetectionProgramSeverityMutation } from '@packmind/proprietary/frontend/domain/detection/api/queries/DetectionProgramQueries';
import { SeverityDropdownBadge } from '@packmind/proprietary/frontend/domain/detection/components/SeverityDropdownBadge';

interface RuleSummarySeverityProps {
  ruleId: string;
  standardId: string;
}

type LanguageSeverityData = {
  language: string;
  severity: DetectionSeverity;
  activeDetectionProgramId: ActiveDetectionProgramId;
};

export const RuleSummarySeverity = ({
  ruleId,
  standardId,
}: RuleSummarySeverityProps) => {
  const { data: statusData, isLoading } =
    useGetStandardRulesDetectionStatusQuery(standardId);

  const updateSeverity = useUpdateActiveDetectionProgramSeverityMutation();

  const languagesWithSeverity = useMemo(() => {
    const foundRuleStatus = statusData?.find((r) => r.ruleId === ruleId);
    if (!foundRuleStatus) return [];

    return foundRuleStatus.languages
      .filter(
        (
          ls,
        ): ls is typeof ls & {
          severity: DetectionSeverity;
          activeDetectionProgramId: ActiveDetectionProgramId;
        } =>
          ls.status === RuleLanguageDetectionStatus.OK &&
          ls.severity !== undefined &&
          ls.activeDetectionProgramId !== undefined,
      )
      .map(
        (ls): LanguageSeverityData => ({
          language: ls.language,
          severity: ls.severity,
          activeDetectionProgramId: ls.activeDetectionProgramId,
        }),
      )
      .sort((a, b) =>
        getLanguageDisplayName(a.language).localeCompare(
          getLanguageDisplayName(b.language),
        ),
      );
  }, [statusData, ruleId]);

  if (isLoading || languagesWithSeverity.length === 0) {
    return null;
  }

  return (
    <PMText
      fontSize="sm"
      display="inline-flex"
      gap={2}
      flexWrap="wrap"
      alignItems="center"
    >
      {languagesWithSeverity.map((langData) => (
        <PMText
          key={`${ruleId}-severity-${langData.language}`}
          as="span"
          display="inline-flex"
          alignItems="center"
          fontSize="sm"
          gap={1}
        >
          {languagesWithSeverity.length > 1 &&
            getLanguageDisplayName(langData.language)}
          <SeverityDropdownBadge
            severity={langData.severity}
            onSeverityChange={(newSeverity) => {
              updateSeverity.mutate({
                standardId,
                ruleId,
                activeDetectionProgramId: langData.activeDetectionProgramId,
                severity: newSeverity,
              });
            }}
            isDisabled={updateSeverity.isPending}
          />
        </PMText>
      ))}
    </PMText>
  );
};
