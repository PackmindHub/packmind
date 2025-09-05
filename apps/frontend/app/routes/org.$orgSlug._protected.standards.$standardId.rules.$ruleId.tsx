import { useParams, useLoaderData } from 'react-router';
import {
  PMBox,
  PMPage,
  PMPageSection,
  PMVStack,
  PMButton,
  PMTabs,
} from '@packmind/ui';
import { queryClient } from '../../src/shared/data/queryClient';
import { Rule, RuleId, StandardId } from '@packmind/standards/types';
import { ProgrammingLanguage } from '@packmind/shared/types';
import { ProgramEditor } from '@packmind/proprietary/frontend/domain/detection/components/ProgramEditor';
import { RuleExamplesList } from '../../src/domain/rules/components';
import { useCreateRuleExampleMutation } from '../../src/domain/rules/api/queries';
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
  const createRuleExampleMutation = useCreateRuleExampleMutation();

  const handleCreateNewExample = async () => {
    try {
      await createRuleExampleMutation.mutateAsync({
        standardId,
        ruleId,
        example: {
          lang: ProgrammingLanguage.JAVASCRIPT,
          positive: '// Code complying with the rule',
          negative: '// Code violating the rule',
        },
      });
    } catch (error) {
      console.error('Failed to create new example:', error);
    }
  };

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
              <PMVStack alignItems={'stretch'} gap="4" paddingY={'4'}>
                <PMPageSection
                  title={'Examples'}
                  variant="outline"
                  cta={
                    <PMButton
                      variant="primary"
                      size="sm"
                      onClick={handleCreateNewExample}
                      loading={createRuleExampleMutation.isPending}
                      disabled={createRuleExampleMutation.isPending}
                    >
                      Add
                    </PMButton>
                  }
                >
                  <RuleExamplesList standardId={standardId} ruleId={ruleId} />
                </PMPageSection>
              </PMVStack>
            ),
          },
          {
            value: 'detection',
            triggerLabel: 'Detection',
            content: (
              <PMVStack alignItems={'stretch'} gap="4" paddingY={'4'}>
                <PMPageSection title={'Detection'} variant="outline">
                  <ProgramEditor standardId={standardId} ruleId={ruleId} />
                </PMPageSection>
              </PMVStack>
            ),
          },
        ]}
      />
    </PMPage>
  );
}
