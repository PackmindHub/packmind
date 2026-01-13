import { ChangeEvent, useMemo } from 'react';
import {
  PMBox,
  PMNativeSelect,
  PMText,
  PMVerticalNav,
  PMVerticalNavSection,
} from '@packmind/ui';
import { LuGitCommitVertical, LuHouse } from 'react-icons/lu';

import type { Rule, Standard } from '@packmind/types';
import { StandardDetailsNavEntry } from './StandardDetailsNavEntry';
import { makeRuleNavKey, NavKey } from '../utils/standardNavigation';
import { RuleLanguageDetectionStatus } from '@packmind/types';
import { useGetStandardRulesDetectionStatusQuery } from '@packmind/proprietary/frontend/domain/detection/hooks/useStandardEditionFeatures';

type StandardDetailsSidebarProps = {
  standard: Standard;
  standards: Standard[];
  activeSection: NavKey;
  onSectionSelect: (value: NavKey) => void;
  onStandardChange: (standardId: string) => void;
  isStandardSelectDisabled: boolean;
  standardsLoading: boolean;
  rules?: Rule[];
  rulesLoading: boolean;
  rulesError: boolean;
  getPathForNavKey?: (navKey: NavKey) => string | null;
};

export const StandardDetailsSidebar = ({
  standard,
  standards,
  activeSection,
  onSectionSelect,
  onStandardChange,
  isStandardSelectDisabled,
  standardsLoading,
  rules,
  rulesLoading,
  rulesError,
  getPathForNavKey,
}: StandardDetailsSidebarProps) => {
  const { data: detectionStatuses } = useGetStandardRulesDetectionStatusQuery(
    standard.id,
  );

  const rulesWithWipStatus = useMemo(() => {
    const entries = detectionStatuses ?? [];

    return new Set(
      entries
        .filter(({ languages }) =>
          languages.some(
            ({ status }) => status === RuleLanguageDetectionStatus.WIP,
          ),
        )
        .map(({ ruleId }) => ruleId),
    );
  }, [detectionStatuses]);

  const standardSelectItems = useMemo(
    () =>
      (standards.length > 0 ? standards : [standard]).map(
        (availableStandard) => ({
          label: availableStandard.name,
          value: availableStandard.id,
        }),
      ),
    [standards, standard],
  );

  const handleStandardChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextStandardId = event.target.value;

    if (!nextStandardId || nextStandardId === standard.id) {
      return;
    }

    onStandardChange(nextStandardId);
  };

  const summaryUrl = getPathForNavKey ? getPathForNavKey('summary') : null;
  const deploymentUrl = getPathForNavKey
    ? getPathForNavKey('deployment')
    : null;

  const generalNavEntries = [
    <StandardDetailsNavEntry
      key="summary"
      label={{ type: 'icon-text', icon: LuHouse, text: 'Summary', gap: 2 }}
      value="summary"
      isActive={activeSection === 'summary'}
      onSelect={onSectionSelect}
      url={summaryUrl ?? undefined}
    />,
    <StandardDetailsNavEntry
      key="deployment"
      label={{
        type: 'icon-text',
        icon: LuGitCommitVertical,
        text: 'Distribution',
        gap: 2,
      }}
      value="deployment"
      isActive={activeSection === 'deployment'}
      onSelect={onSectionSelect}
      url={deploymentUrl ?? undefined}
    />,
  ];

  const rulesNavEntries = (() => {
    if (rulesLoading) {
      return [
        <PMText key="rules-loading" color="faded">
          Loading rules...
        </PMText>,
      ];
    }

    if (rulesError) {
      return [
        <PMText key="rules-error" color="error">
          Failed to load rules.
        </PMText>,
      ];
    }

    if (!rules || rules.length === 0) {
      return [
        <PMText key="rules-empty" color="faded">
          No rules found.
        </PMText>,
      ];
    }

    return rules.map((rule) => {
      const navKey = makeRuleNavKey(rule.id);
      const hasWipStatus = rulesWithWipStatus.has(rule.id);
      const url = getPathForNavKey ? getPathForNavKey(navKey) : null;

      return (
        <StandardDetailsNavEntry
          key={rule.id}
          label={{
            type: 'rule-entry',
            content: rule.content,
            hasWipStatus,
          }}
          value={navKey}
          isActive={activeSection === navKey}
          onSelect={onSectionSelect}
          tooltipLabel={rule.content}
          isTruncated
          url={url ?? undefined}
        />
      );
    });
  })();

  const selectDisabled =
    isStandardSelectDisabled ||
    standardsLoading ||
    standardSelectItems.length === 0;

  return (
    <PMVerticalNav
      logo={false}
      showLogoContainer={false}
      width="270px"
      headerNav={
        <PMBox width="full" padding={3}>
          <PMNativeSelect
            aria-label="Select standard"
            value={standard.id}
            onChange={handleStandardChange}
            items={standardSelectItems}
            width="full"
            border="solid 1px"
            borderColor="border.secondary"
            backgroundColor="background.primary"
            disabled={selectDisabled}
          />
        </PMBox>
      }
    >
      <PMVerticalNavSection navEntries={generalNavEntries} />
      <PMVerticalNavSection title="Rules" navEntries={rulesNavEntries} />
    </PMVerticalNav>
  );
};
