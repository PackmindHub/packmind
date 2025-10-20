import { useParams, useLoaderData } from 'react-router';
import {
  DEFAULT_FEATURE_DOMAIN_MAP,
  PMBox,
  PMPage,
  PMPageSection,
  PMTabs,
  PMVStack,
  RULE_DETAILS_DETECTION_TAB_FEATURE_KEY,
  isFeatureFlagEnabled,
} from '@packmind/ui';
import { queryClient } from '../../src/shared/data/queryClient';
import { Rule, RuleId, StandardId } from '@packmind/standards/types';
import { RuleExamplesManager } from '../../src/domain/rules/components';
import { getRulesByStandardIdOptions } from '../../src/domain/standards/api/queries/StandardsQueries';
import { ProgramEditor } from '@packmind/proprietary/frontend/domain/detection/components/ProgramEditor';
import { useAuthContext } from '../../src/domain/accounts/hooks';

export async function clientLoader({
  params,
}: {
  params: { standardId: string; ruleId: string };
}) {
  const rulesData = await queryClient.ensureQueryData(
    getRulesByStandardIdOptions(params.standardId as StandardId),
  );

  return rulesData.find((r) => r.id === params.ruleId) || null;
}

export default function RuleDetailRouteModule() {
  const { standardId, ruleId } = useParams() as {
    standardId: string;
    ruleId: RuleId;
  };
  const rule = useLoaderData() as Rule | null;
  const { user } = useAuthContext();
  const isDetectionTabEnabled = isFeatureFlagEnabled({
    featureKeys: [RULE_DETAILS_DETECTION_TAB_FEATURE_KEY],
    featureDomainMap: DEFAULT_FEATURE_DOMAIN_MAP,
    userEmail: user?.email,
  });

  if (!ruleId || !rule) {
    return <PMBox>Rule not found</PMBox>;
  }

  const tabs = [
    {
      value: 'examples',
      triggerLabel: 'Examples',
      content: (
        <PMVStack alignItems={'stretch'} gap="4" paddingY={'4'} width="100%">
          <RuleExamplesManager standardId={standardId} ruleId={ruleId} />
        </PMVStack>
      ),
    },
    ...(isDetectionTabEnabled
      ? [
          {
            value: 'detection',
            triggerLabel: 'Detection',
            content: (
              <PMVStack alignItems={'stretch'} gap="4" paddingY={'4'}>
                <PMPageSection>
                  <ProgramEditor standardId={standardId} ruleId={ruleId} />
                </PMPageSection>
              </PMVStack>
            ),
          },
        ]
      : []),
  ];

  return (
    <PMPage title={rule.content} titleLevel="h3" isFullWidth>
      <PMTabs defaultValue="examples" tabs={tabs} />
    </PMPage>
  );
}
