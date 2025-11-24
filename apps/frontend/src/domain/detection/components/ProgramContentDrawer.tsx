import React from 'react';
import {
  PMBox,
  PMCloseButton,
  PMDrawer,
  PMPortal,
  PMText,
  PMCodeMirror,
  PMMarkdownViewer,
} from '@packmind/ui';
import { useGetDetectionProgramMetadataQuery } from '@packmind/proprietary/frontend/domain/detection';

interface ProgramContentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  standardId: string;
  ruleId: string;
  detectionProgramId: string;
  programCode: string;
}

export const ProgramContentDrawer: React.FC<ProgramContentDrawerProps> = ({
  isOpen,
  onClose,
  standardId,
  ruleId,
  detectionProgramId,
  programCode,
}) => {
  const handleOpenChange = ({ open }: { open: boolean }) => {
    if (!open) {
      onClose();
    }
  };

  const { data: draftMetadata } = useGetDetectionProgramMetadataQuery(
    standardId,
    ruleId,
    detectionProgramId,
  );

  return (
    <PMDrawer.Root open={isOpen} onOpenChange={handleOpenChange} size="xl">
      <PMPortal>
        <PMDrawer.Backdrop />
        <PMDrawer.Positioner>
          <PMDrawer.Content>
            <PMDrawer.Header>
              <PMDrawer.Title>Program Content</PMDrawer.Title>
            </PMDrawer.Header>
            <PMDrawer.Body height="full" display="flex" flexDirection="column">
              <PMBox
                width="full"
                flex="1"
                display="flex"
                flexDirection="column"
              >
                {draftMetadata?.programDescription && (
                  <PMMarkdownViewer
                    content={draftMetadata?.programDescription}
                  />
                )}

                {!programCode || programCode.trim() === '' ? (
                  <PMBox p={4}>
                    <PMText color="faded">No program content available.</PMText>
                  </PMBox>
                ) : (
                  <PMCodeMirror
                    value={programCode}
                    editable={false}
                    language="javascript"
                    height="100%"
                    basicSetup={{
                      lineNumbers: true,
                      foldGutter: false,
                      dropCursor: false,
                      allowMultipleSelections: false,
                    }}
                  />
                )}
              </PMBox>
            </PMDrawer.Body>
            <PMDrawer.CloseTrigger asChild>
              <PMCloseButton size="sm" />
            </PMDrawer.CloseTrigger>
          </PMDrawer.Content>
        </PMDrawer.Positioner>
      </PMPortal>
    </PMDrawer.Root>
  );
};
