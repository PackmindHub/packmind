import { useMemo } from 'react';
import { PMBox, PMHeading, PMMarkdownViewer, PMVStack } from '@packmind/ui';
import { useOutletContext } from 'react-router';
import { StandardDetailsOutletContext } from '../../src/domain/standards/components/StandardDetails';
import { RuleSummaryTable } from '@packmind/proprietary/frontend/domain/standards/components/RuleSummaryTable';
import { ArtifactResultFilePreview } from '../../src/domain/artifacts/components/ArtifactResultFilePreview';
import { serializeStandardToMarkdown } from '@packmind/proprietary/frontend/domain/change-proposals/utils/serializeArtifactToMarkdown';

export default function StandardDetailSummaryRouteModule() {
  const { standard, rules, rulesLoading, rulesError, navMode } =
    useOutletContext<StandardDetailsOutletContext>();

  const markdown = useMemo(
    () =>
      serializeStandardToMarkdown({
        name: standard.name,
        scope: standard.scope ?? '',
        description: standard.description,
        rules: rules ?? [],
      }),
    [standard.name, standard.scope, standard.description, rules],
  );

  const previewContent = (
    <PMBox
      border="solid 1px"
      borderColor="border.primary"
      borderRadius="md"
      padding={4}
      backgroundColor="background.primary"
    >
      <PMMarkdownViewer content={standard.description} />
    </PMBox>
  );

  const rulesTable = (
    <RuleSummaryTable
      standardId={standard.id}
      rules={rules}
      isLoading={rulesLoading}
      isError={rulesError}
    />
  );

  /*
   * The table, and that is the whole page.
   *
   * The frame above already names the standard, in the link back to the pane
   * this reader came from, and titles the page Rules. What is left to drop is
   * the prose: the pane's Instructions tab is what a standard says, and reading
   * the same paragraph again under the rules it introduces was the content half
   * of the duplication `StandardRulesFrame` fixes the chrome half of.
   */
  if (navMode === 'plugin-first') {
    return rulesTable;
  }

  return (
    <PMVStack align="stretch" gap={6} width="full">
      <ArtifactResultFilePreview
        markdown={markdown}
        previewContent={previewContent}
        hideFileName
      />

      <PMVStack align="stretch" gap={4} width="full">
        <PMHeading level="h3">Rules</PMHeading>
        {rulesTable}
      </PMVStack>
    </PMVStack>
  );
}
