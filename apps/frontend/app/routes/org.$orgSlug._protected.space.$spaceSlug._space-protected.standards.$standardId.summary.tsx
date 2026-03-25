import { useMemo } from 'react';
import { PMBox, PMHeading, PMMarkdownViewer, PMVStack } from '@packmind/ui';
import { useOutletContext } from 'react-router';
import { StandardDetailsOutletContext } from '../../src/domain/standards/components/StandardDetails';
import { RuleSummaryTable } from '@packmind/proprietary/frontend/domain/standards/components/RuleSummaryTable';
import { ArtifactResultFilePreview } from '@packmind/proprietary/frontend/domain/change-proposals/components/shared/ArtifactResultFilePreview';
import { serializeStandardToMarkdown } from '@packmind/proprietary/frontend/domain/change-proposals/utils/serializeArtifactToMarkdown';

export default function StandardDetailSummaryRouteModule() {
  const { standard, rules, rulesLoading, rulesError } =
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

  return (
    <PMVStack align="stretch" gap={6} width="full">
      <ArtifactResultFilePreview
        markdown={markdown}
        previewContent={previewContent}
        hideFileName
      />

      <PMVStack align="stretch" gap={4} width="full">
        <PMHeading level="h3">Rules</PMHeading>
        <RuleSummaryTable
          standardId={standard.id}
          rules={rules}
          isLoading={rulesLoading}
          isError={rulesError}
        />
      </PMVStack>
    </PMVStack>
  );
}
