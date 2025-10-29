import {
  MarkdownEditor,
  MarkdownEditorProvider,
} from '../../src/shared/components/editor/MarkdownEditor';
import { PMHeading, PMVStack } from '@packmind/ui';
import { useOutletContext } from 'react-router';
import { StandardDetailsOutletContext } from '../../src/domain/standards/components/StandardDetails';
import { RuleSummaryTable } from '@packmind/proprietary/frontend/domain/standards/components/RuleSummaryTable';

export default function StandardDetailSummaryRouteModule() {
  const { standard, rules, rulesLoading, rulesError } =
    useOutletContext<StandardDetailsOutletContext>();

  return (
    <PMVStack align="stretch" gap={6} width="full">
      <PMVStack align="stretch" gap={4} width="full">
        <PMHeading level="h3">Description</PMHeading>
        <MarkdownEditorProvider>
          <MarkdownEditor
            defaultValue={standard.description}
            readOnly
            paddingVariant="none"
          />
        </MarkdownEditorProvider>
      </PMVStack>

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
