import { PMAccordion, PMBox, PMMarkdownViewer, PMText } from '@packmind/ui';
import {
  CollectionItemUpdatePayload,
  SkillFile,
  SkillFileId,
} from '@packmind/types';
import { buildDiffHtml, markdownDiffCss } from '../../../utils/markdownDiff';

export function UpdatedFileContentItem({
  file,
  payload,
}: {
  file: SkillFile;
  payload: CollectionItemUpdatePayload<SkillFileId>;
}) {
  return (
    <PMAccordion.Item
      key={file.id}
      value={file.id}
      borderRadius="md"
      border="1px solid"
      borderColor="border.primary"
    >
      <PMAccordion.ItemTrigger cursor="pointer" bg="background.primary" px={2}>
        <PMAccordion.ItemIndicator />
        <PMText fontSize="sm" fontWeight="semibold">
          {file.path}
        </PMText>
      </PMAccordion.ItemTrigger>
      <PMAccordion.ItemContent>
        {file.isBase64 ? (
          <PMText fontSize="sm" color="secondary">
            Binary file has changed
          </PMText>
        ) : (
          <PMBox padding="16px" css={markdownDiffCss}>
            <PMMarkdownViewer
              htmlContent={buildDiffHtml(payload.oldValue, payload.newValue)}
            />
          </PMBox>
        )}
      </PMAccordion.ItemContent>
    </PMAccordion.Item>
  );
}
