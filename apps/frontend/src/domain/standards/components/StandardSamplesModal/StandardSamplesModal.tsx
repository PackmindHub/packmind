import * as React from 'react';
import {
  PMBadge,
  PMButton,
  PMButtonGroup,
  PMCheckboxCard,
  PMCheckboxGroup,
  PMCloseButton,
  PMDialog,
  PMEmptyState,
  PMGrid,
  PMGridItem,
  PMHeading,
  PMHStack,
  PMInput,
  PMVStack,
  pmToaster,
} from '@packmind/ui';
import {
  standardSamples,
  type Sample,
  type SampleInput,
} from '@packmind/types';
import { useCreateStandardsFromSamplesMutation } from '../../api/queries/StandardsQueries';

interface IStandardSamplesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const StandardSamplesModal: React.FC<IStandardSamplesModalProps> = ({
  open,
  onOpenChange,
}) => {
  const [selectedLanguages, setSelectedLanguages] = React.useState<string[]>(
    [],
  );
  const [selectedFrameworks, setSelectedFrameworks] = React.useState<string[]>(
    [],
  );
  const [searchQuery, setSearchQuery] = React.useState('');
  const createMutation = useCreateStandardsFromSamplesMutation();

  const filteredLanguages = React.useMemo(
    () =>
      standardSamples.languageSamples.filter((sample) =>
        sample.displayName.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [searchQuery],
  );

  const filteredFrameworks = React.useMemo(
    () =>
      standardSamples.frameworkSamples.filter((sample) =>
        sample.displayName.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [searchQuery],
  );

  const handleCreate = () => {
    const samples: SampleInput[] = [
      ...selectedLanguages.map((id) => ({ type: 'language' as const, id })),
      ...selectedFrameworks.map((id) => ({ type: 'framework' as const, id })),
    ];

    createMutation.mutate(samples, {
      onSuccess: (data) => {
        const count = data.created.length;
        pmToaster.create({
          type: 'success',
          title: 'Standards created',
          description: `${count} standard${count !== 1 ? 's' : ''} created successfully`,
        });
        setSelectedLanguages([]);
        setSelectedFrameworks([]);
        setSearchQuery('');
        onOpenChange(false);
      },
      onError: () => {
        pmToaster.error({
          title: 'Failed to create standards',
          description:
            'An error occurred while creating standards from samples',
        });
      },
    });
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  return (
    <PMDialog.Root
      open={open}
      onOpenChange={(details: { open: boolean }) => onOpenChange(details.open)}
      size="lg"
      scrollBehavior="inside"
    >
      <PMDialog.Backdrop />
      <PMDialog.Positioner>
        <PMDialog.Content>
          <PMDialog.Header>
            <PMDialog.Title>Select Standard Samples</PMDialog.Title>
            <PMDialog.CloseTrigger asChild>
              <PMCloseButton />
            </PMDialog.CloseTrigger>
          </PMDialog.Header>
          <PMDialog.Body>
            <PMVStack gap={6} align="stretch">
              <PMInput
                placeholder="Search..."
                value={searchQuery}
                onChange={handleSearchChange}
              />

              {filteredLanguages.length > 0 && (
                <PMVStack gap={4} align="stretch">
                  <PMHStack gap={2} align="center">
                    <PMHeading size="sm">Languages</PMHeading>
                    <PMBadge>{filteredLanguages.length}</PMBadge>
                  </PMHStack>
                  <SampleCardGrid
                    samples={filteredLanguages}
                    selectedValues={selectedLanguages}
                    onValueChange={setSelectedLanguages}
                  />
                </PMVStack>
              )}

              {filteredFrameworks.length > 0 && (
                <PMVStack gap={4} align="stretch">
                  <PMHStack gap={2} align="center">
                    <PMHeading size="sm">Frameworks</PMHeading>
                    <PMBadge>{filteredFrameworks.length}</PMBadge>
                  </PMHStack>
                  <SampleCardGrid
                    samples={filteredFrameworks}
                    selectedValues={selectedFrameworks}
                    onValueChange={setSelectedFrameworks}
                  />
                </PMVStack>
              )}

              {filteredLanguages.length === 0 &&
                filteredFrameworks.length === 0 &&
                searchQuery && (
                  <PMEmptyState
                    title="No samples found"
                    description={`No languages or frameworks match "${searchQuery}"`}
                  />
                )}
            </PMVStack>
          </PMDialog.Body>
          <PMDialog.Footer>
            <PMButtonGroup size="sm">
              <PMButton variant="tertiary" onClick={handleCancel}>
                Cancel
              </PMButton>
              <PMButton
                variant="primary"
                onClick={handleCreate}
                loading={createMutation.isPending}
                disabled={
                  selectedLanguages.length === 0 &&
                  selectedFrameworks.length === 0
                }
              >
                Create
              </PMButton>
            </PMButtonGroup>
          </PMDialog.Footer>
        </PMDialog.Content>
      </PMDialog.Positioner>
    </PMDialog.Root>
  );
};

interface ISampleCardGridProps {
  samples: Sample[];
  selectedValues: string[];
  onValueChange: (values: string[]) => void;
}

const SampleCardGrid: React.FC<ISampleCardGridProps> = ({
  samples,
  selectedValues,
  onValueChange,
}) => {
  return (
    <PMCheckboxGroup value={selectedValues} onValueChange={onValueChange}>
      <PMGrid gap={4} templateColumns="repeat(auto-fill, 190px)">
        {samples.map((sample) => (
          <PMGridItem key={sample.id}>
            <PMCheckboxCard.Root
              colorPalette="blue"
              value={sample.id}
              variant="surface"
              borderColor="border.tertiary"
            >
              <PMCheckboxCard.HiddenInput />
              <PMCheckboxCard.Control>
                <PMCheckboxCard.Content>
                  <PMCheckboxCard.Label>
                    {sample.displayName}
                  </PMCheckboxCard.Label>
                </PMCheckboxCard.Content>
                <PMCheckboxCard.Indicator />
              </PMCheckboxCard.Control>
            </PMCheckboxCard.Root>
          </PMGridItem>
        ))}
      </PMGrid>
    </PMCheckboxGroup>
  );
};
