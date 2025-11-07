import { PMPageSection, PMTabs, PMVStack } from '@packmind/ui';
import { Rule, StandardId } from '@packmind/types';
import { RuleExamplesManager } from './RuleExamplesManager';
import { ProgramEditor } from '@packmind/proprietary/frontend/domain/detection/components/ProgramEditor';

type RuleDetailsTab = 'examples' | 'detection';

interface RuleDetailsProps {
  standardId: StandardId;
  rule: Rule;
  defaultTab?: RuleDetailsTab;
  detectionLanguages?: string[];
}

export const RuleDetails = ({
  standardId,
  rule,
  defaultTab = 'examples',
  detectionLanguages = [],
}: RuleDetailsProps) => {
  const tabs = [
    {
      value: 'examples',
      triggerLabel: 'Code examples',
      content: (
        <PMVStack alignItems={'stretch'} gap="4" paddingY={'4'} width="100%">
          <RuleExamplesManager standardId={standardId} ruleId={rule.id} />
        </PMVStack>
      ),
    },
    {
      value: 'detection',
      triggerLabel: 'Linter',
      content: (
        <PMVStack alignItems={'stretch'} gap="4" paddingY={'4'}>
          <PMPageSection>
            <ProgramEditor
              standardId={standardId}
              ruleId={rule.id}
              detectionLanguages={detectionLanguages}
            />
          </PMPageSection>
        </PMVStack>
      ),
    },
  ];

  return <PMTabs defaultValue={defaultTab} tabs={tabs} />;
};
