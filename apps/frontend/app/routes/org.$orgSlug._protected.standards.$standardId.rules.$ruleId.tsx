import { useParams, useLoaderData } from 'react-router';
import { PMBox, PMPage, PMPageSection, PMVStack, PMTabs } from '@packmind/ui';
import { queryClient } from '../../src/shared/data/queryClient';
import { Rule, RuleId, StandardId } from '@packmind/standards/types';
import { RuleExamplesManager } from '../../src/domain/rules/components';
import { getRulesByStandardIdOptions } from '../../src/domain/standards/api/queries/StandardsQueries';

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

  if (!ruleId || !rule) {
    return <PMBox>Rule not found</PMBox>;
  }

  return (
    <PMPage title={rule.content} titleLevel="h3" isFullWidth>
      <PMTabs
        defaultValue="examples"
        tabs={[
          {
            value: 'examples',
            triggerLabel: 'Examples',
            content: (
              <PMVStack
                alignItems={'stretch'}
                gap="4"
                paddingY={'4'}
                width="100%"
              >
                <RuleExamplesManager standardId={standardId} ruleId={ruleId} />
              </PMVStack>
            ),
          },
        ]}
      />
    </PMPage>
  );
}
