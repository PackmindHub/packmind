import { useMemo, type ComponentType } from 'react';
import { PMIcon, PMText } from '@packmind/ui';
import { getLanguageDisplayName } from '../../detection/components/DetectionCardUtils';
import { RuleLanguageDetectionStatus } from '@packmind/types';
import { LuCircleCheck, LuCircleOff } from 'react-icons/lu';
import { TiWarningOutline } from 'react-icons/ti';
import { useGetStandardRulesDetectionStatusQuery } from '../../detection/api/queries/DetectionProgramQueries';

interface RuleSummaryStatusProps {
  ruleId: string;
  standardId: string;
}

export const RuleSummaryStatus = ({
  ruleId,
  standardId,
}: RuleSummaryStatusProps) => {
  const {
    data: statusData,
    isLoading,
    isError,
  } = useGetStandardRulesDetectionStatusQuery(standardId);

  const { groupedStatuses, ruleStatus } = useMemo(() => {
    const groups: Record<RuleLanguageDetectionStatus, string[]> = {
      [RuleLanguageDetectionStatus.OK]: [],
      [RuleLanguageDetectionStatus.WIP]: [],
      [RuleLanguageDetectionStatus.NONE]: [],
    };

    const foundRuleStatus = statusData?.find((r) => r.ruleId === ruleId);

    if (foundRuleStatus) {
      foundRuleStatus.languages.forEach(({ language, status }) => {
        groups[status].push(language);
      });
    }

    return { groupedStatuses: groups, ruleStatus: foundRuleStatus };
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

  const orderedStatuses: RuleLanguageDetectionStatus[] = [
    RuleLanguageDetectionStatus.OK,
    RuleLanguageDetectionStatus.WIP,
    RuleLanguageDetectionStatus.NONE,
  ];

  const statusNodes = orderedStatuses
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
    <PMText fontSize="sm" display="inline-flex" gap={2}>
      {statusNodes}
    </PMText>
  );
};
