import React from 'react';
import { Link } from 'react-router';
import {
  PMBox,
  PMLink,
  PMTable,
  PMTableColumn,
  PMTableRow,
  PMEmptyState,
  PMHStack,
  PMText,
  PMButton,
  PMAlert,
  PMAlertDialog,
  PMCheckbox,
} from '@packmind/ui';
import { formatDistanceToNowStrict } from 'date-fns';
import { SkillId } from '@packmind/types';

import {
  useGetSkillsQuery,
  useDeleteSkillsBatchMutation,
} from '../api/queries/SkillsQueries';
import { useCurrentSpace } from '../../spaces/hooks/useCurrentSpace';
import { routes } from '../../../shared/utils/routes';
import { GettingStartedLearnMoreDialog } from '../../organizations/components/dashboard/GettingStartedLearnMoreDialog';
import { SkillsLearnMoreContent } from './SkillsLearnMoreContent';
import { SKILL_MESSAGES } from '../constants/messages';

interface ISkillsListProps {
  orgSlug: string;
}

export const SkillsList = ({ orgSlug }: ISkillsListProps) => {
  const { spaceSlug } = useCurrentSpace();
  const { data: skills, isLoading, isError } = useGetSkillsQuery();
  const deleteBatchMutation = useDeleteSkillsBatchMutation();

  const [tableData, setTableData] = React.useState<PMTableRow[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = React.useState<SkillId[]>([]);
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [deleteAlert, setDeleteAlert] = React.useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const checkSkill = (skillId: SkillId) => {
    setSelectedSkillIds((prev) => [...prev, skillId]);
  };

  const uncheckSkill = (skillId: SkillId) => {
    setSelectedSkillIds((prev) => prev.filter((id) => id !== skillId));
  };

  const selectAll = () => {
    if (!skills) return;
    setSelectedSkillIds(skills.map((skill) => skill.id));
  };

  const clearAll = () => setSelectedSkillIds([]);

  const handleBatchDelete = async () => {
    if (selectedSkillIds.length === 0) return;

    try {
      const count = selectedSkillIds.length;
      await deleteBatchMutation.mutateAsync(selectedSkillIds);
      setSelectedSkillIds([]);
      setDeleteAlert({
        type: 'success',
        message: SKILL_MESSAGES.success.deletedBatch(count),
      });
      setDeleteModalOpen(false);

      // Auto-dismiss success alert after 3 seconds
      setTimeout(() => {
        setDeleteAlert(null);
      }, 3000);
    } catch (error) {
      console.error('Failed to delete skills:', error);
      setDeleteAlert({
        type: 'error',
        message: SKILL_MESSAGES.error.deleteBatchFailed,
      });
      setDeleteModalOpen(false);
    }
  };

  React.useEffect(() => {
    if (!skills) return;

    setTableData(
      skills.map((skill) => ({
        key: skill.id,
        select: (
          <PMCheckbox
            checked={selectedSkillIds.includes(skill.id)}
            onCheckedChange={(event) => {
              const checked = event.checked === true;
              if (checked) {
                checkSkill(skill.id);
              } else {
                uncheckSkill(skill.id);
              }
            }}
          />
        ),
        name: (
          <PMLink asChild>
            <Link
              to={
                spaceSlug
                  ? routes.space.toSkill(orgSlug, spaceSlug, skill.slug)
                  : '#'
              }
            >
              {skill.name}
            </Link>
          </PMLink>
        ),
        updatedAt: formatDistanceToNowStrict(skill.updatedAt || new Date(), {
          addSuffix: true,
        }),
        version: skill.version,
      })),
    );
  }, [skills, selectedSkillIds, spaceSlug, orgSlug]);

  const isAllSelected = skills && selectedSkillIds.length === skills.length;
  const isSomeSelected = selectedSkillIds.length > 0;

  const columns: PMTableColumn[] = [
    {
      key: 'select',
      header: (
        <PMCheckbox
          checked={isAllSelected || false}
          onCheckedChange={() => {
            if (isAllSelected) {
              clearAll();
            } else {
              selectAll();
            }
          }}
          controlProps={{ borderColor: 'border.checkbox' }}
        />
      ),
      width: '50px',
      align: 'center',
    },
    { key: 'name', header: 'Name', grow: true },
    {
      key: 'updatedAt',
      header: 'Last Updated',
      width: '250px',
      align: 'center',
    },
    { key: 'version', header: 'Version', width: '100px', align: 'center' },
  ];

  if (isLoading) return <PMText>Loading...</PMText>;
  if (isError) return <PMText color="error">Error loading skills.</PMText>;

  if (!skills?.length) {
    return (
      <PMEmptyState
        backgroundColor="background.primary"
        borderRadius="md"
        width="2xl"
        mx="auto"
        title="No skills yet"
      >
        Skills are reusable prompts that can be invoked by AI coding assistants.
        Create skills via the CLI using the command "packmind-cli skill add"
        <PMHStack>
          <GettingStartedLearnMoreDialog
            body={<SkillsLearnMoreContent />}
            title="How to create skills"
            buttonLabel="Learn how to create skills"
            buttonSize="sm"
          />
        </PMHStack>
      </PMEmptyState>
    );
  }

  return (
    <PMBox>
      {/* Delete Success/Error Alert */}
      {deleteAlert && (
        <PMBox mb={4}>
          <PMAlert.Root status={deleteAlert.type}>
            <PMAlert.Indicator />
            <PMAlert.Title>{deleteAlert.message}</PMAlert.Title>
          </PMAlert.Root>
        </PMBox>
      )}

      <PMBox mb={2}>
        <PMHStack gap={2}>
          <PMAlertDialog
            trigger={
              <PMButton
                variant="secondary"
                loading={deleteBatchMutation.isPending}
                size="sm"
                disabled={!isSomeSelected}
              >
                {`Delete (${selectedSkillIds.length})`}
              </PMButton>
            }
            title="Delete Skills"
            message={SKILL_MESSAGES.confirmation.deleteBatchSkills(
              selectedSkillIds.length,
            )}
            confirmText="Delete"
            cancelText="Cancel"
            confirmColorScheme="red"
            onConfirm={handleBatchDelete}
            open={deleteModalOpen}
            onOpenChange={(details) => setDeleteModalOpen(details.open)}
            isLoading={deleteBatchMutation.isPending}
          />
          <PMButton
            variant="secondary"
            onClick={() => setSelectedSkillIds([])}
            size="sm"
            disabled={!isSomeSelected}
          >
            Clear Selection
          </PMButton>
        </PMHStack>
      </PMBox>

      <PMTable
        columns={columns}
        data={tableData}
        striped
        hoverable
        size="md"
        variant="line"
      />
    </PMBox>
  );
};
