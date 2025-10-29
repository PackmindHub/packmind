import {
  DEFAULT_FEATURE_DOMAIN_MAP,
  PMPageSection,
  PMTabs,
  PMVStack,
  RULE_DETAILS_DETECTION_TAB_FEATURE_KEY,
  isFeatureFlagEnabled,
} from '@packmind/ui';
import { Rule, StandardId } from '@packmind/shared/types';
import { RuleExamplesManager } from './RuleExamplesManager';
import { ProgramEditor } from '@packmind/proprietary/frontend/domain/detection/components/ProgramEditor';
import { useAuthContext } from '../../accounts/hooks';

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
  const { user } = useAuthContext();

  const isDetectionTabEnabled = isFeatureFlagEnabled({
    featureKeys: [RULE_DETAILS_DETECTION_TAB_FEATURE_KEY],
    featureDomainMap: DEFAULT_FEATURE_DOMAIN_MAP,
    userEmail: user?.email,
  });

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
    ...(isDetectionTabEnabled
      ? [
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
        ]
      : []),
  ];

  return <PMTabs defaultValue={defaultTab} tabs={tabs} />;
};
