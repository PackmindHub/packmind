import { MouseEvent, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  PMTable,
  PMTableColumn,
  PMTableRow,
  PMText,
  PMLink,
} from '@packmind/ui';
import type { Rule } from '@packmind/shared';
import { RuleSummaryStatus } from './RuleSummaryStatus';
import { routes } from '../../../shared/utils/routes';

interface RuleSummaryTableProps {
  standardId: string;
  rules?: Rule[];
  isLoading: boolean;
  isError: boolean;
}

export const RuleSummaryTable = ({
  standardId,
  rules,
  isLoading,
  isError,
}: RuleSummaryTableProps) => {
  const navigate = useNavigate();
  const { orgSlug, spaceSlug } = useParams<{
    orgSlug?: string;
    spaceSlug?: string;
  }>();

  const columns = useMemo<PMTableColumn[]>(
    () => [
      { key: 'name', header: 'Name', grow: true },
      { key: 'linter', header: 'Linter status', grow: true },
    ],
    [],
  );

  const data = useMemo<PMTableRow[]>(() => {
    if (!rules) {
      return [];
    }

    return rules.map((rule) => {
      const targetRoute =
        orgSlug && spaceSlug
          ? routes.space.toStandardRule(orgSlug, spaceSlug, standardId, rule.id)
          : undefined;

      const handleRuleClick = (event: MouseEvent<HTMLAnchorElement>) => {
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.altKey ||
          event.ctrlKey ||
          event.shiftKey
        ) {
          return;
        }

        if (!targetRoute) {
          event.preventDefault();
          return;
        }

        event.preventDefault();
        navigate(targetRoute);
      };

      return {
        id: rule.id,
        name: (
          <PMLink
            href={targetRoute ?? '#'}
            textDecoration="none"
            _hover={{ textDecoration: 'underline' }}
            onClick={handleRuleClick}
            display="block"
            width="full"
          >
            <PMText color="primary" whiteSpace="normal" wordBreak="break-word">
              {rule.content}
            </PMText>
          </PMLink>
        ),
        linter: <RuleSummaryStatus ruleId={rule.id} standardId={standardId} />,
      };
    });
  }, [rules, standardId, orgSlug, spaceSlug, navigate]);

  if (isLoading) {
    return <PMText color="faded">Loading rules...</PMText>;
  }

  if (isError) {
    return <PMText color="error">Failed to load rules.</PMText>;
  }

  if (data.length === 0) {
    return (
      <PMText color="faded">
        No rules have been added to this standard yet.
      </PMText>
    );
  }

  return (
    <PMTable
      columns={columns}
      data={data}
      striped
      hoverable
      size="md"
      variant="line"
      getRowId={(row) => row.id as string}
    />
  );
};
