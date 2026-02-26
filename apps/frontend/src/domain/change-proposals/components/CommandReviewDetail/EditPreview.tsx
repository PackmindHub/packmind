import { PMBox, PMMarkdownViewer, PMText } from '@packmind/ui';

interface EditPreviewProps {
  value: string;
}

export function EditPreview({ value }: Readonly<EditPreviewProps>) {
  return (
    <PMBox>
      <PMText
        fontSize="xs"
        fontWeight="semibold"
        textTransform="uppercase"
        color="secondary"
        mb={2}
      >
        Preview
      </PMText>
      <PMBox
        border="1px solid"
        borderColor="border.muted"
        borderRadius="md"
        p={3}
      >
        <PMMarkdownViewer content={value} />
      </PMBox>
    </PMBox>
  );
}
