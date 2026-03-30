import { PMBox, PMButton, PMHStack, PMHeading, PMVStack } from '@packmind/ui';
import { LuPlus } from 'react-icons/lu';
import { MockRule } from '../types';
import { StandardPrompt } from './StandardPrompt';
import { RulesList } from './RulesList';

type SummaryTabProps = {
  description: string;
  rules: MockRule[];
  onRuleClick: (ruleId: string) => void;
};

export function SummaryTab({
  description,
  rules,
  onRuleClick,
}: SummaryTabProps) {
  return (
    <PMVStack gap={6} align="stretch">
      <StandardPrompt description={description} />

      <PMBox>
        <PMHStack justify="space-between" align="center" mb={3}>
          <PMHeading size="md">Rules ({rules.length})</PMHeading>
          <PMButton variant="outline" size="xs">
            <LuPlus size={14} />
            Add rule
          </PMButton>
        </PMHStack>

        <RulesList rules={rules} onRuleClick={onRuleClick} />
      </PMBox>
    </PMVStack>
  );
}
