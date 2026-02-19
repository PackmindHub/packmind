import { useMemo, type ComponentType } from 'react';
import { PMIcon, PMText } from '@packmind/ui';
import {
  RuleLanguageDetectionStatus,
  DetectionSeverity,
} from '@packmind/types';
import type { ActiveDetectionProgramId } from '@packmind/types';
import { LuCircleCheck, LuCircleOff } from 'react-icons/lu';
import { TiWarningOutline } from 'react-icons/ti';
import { getLanguageDisplayName } from '@packmind/proprietary/frontend/domain/detection/components/DetectionCardUtils';
import { useGetStandardRulesDetectionStatusQuery } from '@packmind/proprietary/frontend/domain/detection/hooks/useStandardEditionFeatures';
import { useUpdateActiveDetectionProgramSeverityMutation } from '@packmind/proprietary/frontend/domain/detection/api/queries/DetectionProgramQueries';
import { SeverityDropdownBadge } from '@packmind/proprietary/frontend/domain/detection/components/SeverityDropdownBadge';

interface RuleSummaryStatusProps {
  ruleId: string;
  standardId: string;
}

type OkLanguageData = {
  language: string;
  severity?: DetectionSeverity;
  activeDetectionProgramId?: ActiveDetectionProgramId;
};

export const RuleSummaryStatus = ({
  ruleId,
  standardId,
}: RuleSummaryStatusProps) => {
  const {
    data: statusData,
    isLoading,
    isError,
  } = useGetStandardRulesDetectionStatusQuery(standardId);

  const updateSeverity = useUpdateActiveDetectionProgramSeverityMutation();

  const { okLanguages, groupedStatuses, ruleStatus } = useMemo(() => {
    const groups: Record<RuleLanguageDetectionStatus, string[]> = {
      [RuleLanguageDetectionStatus.OK]: [],
      [RuleLanguageDetectionStatus.WIP]: [],
      [RuleLanguageDetectionStatus.NONE]: [],
    };
    const okLangs: OkLanguageData[] = [];

    const foundRuleStatus = statusData?.find((r) => r.ruleId === ruleId);

    if (foundRuleStatus) {
      foundRuleStatus.languages.forEach(
        ({ language, status, severity, activeDetectionProgramId }) => {
          groups[status].push(language);
          if (status === RuleLanguageDetectionStatus.OK) {
            okLangs.push({ language, severity, activeDetectionProgramId });
          }
        },
      );
    }

    return {
      okLanguages: okLangs.sort((a, b) =>
        getLanguageDisplayName(a.language).localeCompare(
          getLanguageDisplayName(b.language),
        ),
      ),
      groupedStatuses: groups,
      ruleStatus: foundRuleStatus,
    };
  }, [statusData, ruleId]);

  if (isLoading) {
    return <PMText color="faded">Loading...</PMText>;
  }

  if (isError) {
    return <PMText color="error">Failed to load linter status.</PMText>;
  }

  if (!ruleStatus || ruleStatus.languages.length === 0) {
    return <PMText color="faded">No examples available.</PMText>;
  }

  const statusMeta: Record<
    RuleLanguageDetectionStatus,
    { Icon: ComponentType; color: string }
  > = {
    [RuleLanguageDetectionStatus.OK]: {
      Icon: LuCircleCheck,
      color: 'text.success',
    },
    [RuleLanguageDetectionStatus.WIP]: {
      Icon: TiWarningOutline,
      color: 'text.warning',
    },
    [RuleLanguageDetectionStatus.NONE]: {
      Icon: LuCircleOff,
      color: 'text.tertiary',
    },
  };

  const okStatusNodes = okLanguages.map((langData) => {
    const { Icon, color } = statusMeta[RuleLanguageDetectionStatus.OK];
    const adpId = langData.activeDetectionProgramId;
    return (
      <PMText
        key={`${ruleId}-ok-${langData.language}`}
        as="span"
        display="inline-flex"
        alignItems="center"
        fontSize="sm"
        gap={1}
      >
        <PMIcon as="span" display="inline-flex" color={color}>
          <Icon />
        </PMIcon>
        {getLanguageDisplayName(langData.language)}
        {langData.severity && adpId && (
          <SeverityDropdownBadge
            severity={langData.severity}
            onSeverityChange={(newSeverity) => {
              updateSeverity.mutate({
                standardId,
                ruleId,
                activeDetectionProgramId: adpId,
                severity: newSeverity,
              });
            }}
            isDisabled={updateSeverity.isPending}
          />
        )}
      </PMText>
    );
  });

  const otherStatusNodes = (
    [RuleLanguageDetectionStatus.WIP, RuleLanguageDetectionStatus.NONE] as const
  )
    .filter((status) => groupedStatuses[status].length > 0)
    .map((status) => {
      const languagesForStatus = groupedStatuses[status]
        .map((language) => getLanguageDisplayName(language))
        .sort((a, b) => a.localeCompare(b))
        .join(', ');

      const { Icon, color } = statusMeta[status];

      return (
        <PMText
          key={`${ruleId}-${status}`}
          as="span"
          display="inline-flex"
          alignItems="center"
          fontSize="sm"
        >
          <PMIcon as="span" display="inline-flex" color={color} mr={1}>
            <Icon />
          </PMIcon>
          {languagesForStatus}
        </PMText>
      );
    });

  return (
    <PMText fontSize="sm" display="inline-flex" gap={2} flexWrap="wrap">
      {okStatusNodes}
      {otherStatusNodes}
    </PMText>
  );
};
