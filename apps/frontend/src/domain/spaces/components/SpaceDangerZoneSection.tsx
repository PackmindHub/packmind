import {
  PMAlertDialog,
  PMButton,
  PMHeading,
  PMHStack,
  PMPageSection,
  PMText,
  PMVStack,
} from '@packmind/ui';

const MOCK_SPACE_NAME = 'My Space';

export function SpaceDangerZoneSection() {
  return (
    <PMPageSection
      variant="outline"
      backgroundColor="primary"
      titleComponent={
        <PMHeading level="h3" fontSize={'lg'} fontWeight={'semibold'}>
          Danger zone
        </PMHeading>
      }
    >
      <PMVStack align="stretch" gap={5} pt={4} w="lg">
        <PMText variant="body" color="secondary">
          Once deleted, all standards, commands, skills, and members associated
          with this space will be permanently removed. This action cannot be
          undone.
        </PMText>
        <PMHStack justify="flex-end">
          <PMAlertDialog
            trigger={<PMButton variant="danger">Delete this space</PMButton>}
            title="Delete space"
            message={`Are you sure you want to delete "${MOCK_SPACE_NAME}"? This action is permanent and cannot be undone.`}
            confirmText="Delete"
            cancelText="Cancel"
            onConfirm={() => {
              /* TODO: wire to API */
            }}
          />
        </PMHStack>
      </PMVStack>
    </PMPageSection>
  );
}
