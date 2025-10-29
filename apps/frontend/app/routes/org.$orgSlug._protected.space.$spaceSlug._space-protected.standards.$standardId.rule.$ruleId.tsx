import { PMHeading, PMText, PMVStack } from '@packmind/ui';
import { useOutletContext, useParams } from 'react-router';
import { StandardDetailsOutletContext } from '../../src/domain/standards/components/StandardDetails';
import { RuleDetails } from '../../src/domain/rules/components';

export default function StandardDetailRuleRouteModule() {
  const { ruleId } = useParams<{ ruleId: string }>();
  const { standard, rules, rulesLoading, rulesError, ruleDetectionLanguages } =
    useOutletContext<StandardDetailsOutletContext>();

  if (rulesLoading) {
    return <PMText color="faded">Loading rules...</PMText>;
  }

  if (rulesError) {
    return <PMText color="error">Failed to load rules.</PMText>;
  }

  const selectedRule = rules?.find((rule) => rule.id === ruleId);

  if (!selectedRule) {
    return (
      <PMText color="faded">
        Select a rule from the navigation to view its details.
      </PMText>
    );
  }

  const detectionLanguages =
    (ruleDetectionLanguages && selectedRule
      ? (ruleDetectionLanguages[String(selectedRule.id)] ?? [])
      : []) || [];

  return (
    <PMVStack align="stretch" gap={4}>
      <PMHeading level="h3">{selectedRule.content}</PMHeading>
      <RuleDetails
        standardId={standard.id}
        rule={selectedRule}
        detectionLanguages={detectionLanguages}
      />
    </PMVStack>
  );
}
