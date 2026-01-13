import { useMemo, useState } from 'react';
import { Outlet, useNavigate, useParams } from 'react-router';
import { PMPage, PMVStack, PMText, PMAlert, PMGrid, PMBox } from '@packmind/ui';
import {
  useGetStandardsQuery,
  useGetStandardVersionsQuery,
  useGetRulesByStandardIdQuery,
  useDeleteStandardMutation,
} from '../api/queries/StandardsQueries';

import { Rule, Standard, OrganizationId, SpaceId } from '@packmind/types';
import { STANDARD_MESSAGES } from '../constants/messages';
import { routes } from '../../../shared/utils/routes';
import { StandardVersionHistoryHeader } from './StandardVersionHistoryHeader';
import { StandardDetailsSidebar } from './StandardDetailsSidebar';
import { useStandardSectionNavigation } from '../hooks/useStandardSectionNavigation';
import { RuleActions, SummaryActions } from './StandardDetailsActions';
import { useStandardEditionFeatures } from '@packmind/proprietary/frontend/domain/detection/hooks/useStandardEditionFeatures';
import { useAuthContext } from '../../accounts/hooks/useAuthContext';
import { useCurrentSpace } from '../../spaces/hooks/useCurrentSpace';

interface StandardDetailsProps {
  standard: Standard;
  orgSlug?: string;
}

export type StandardDetailsOutletContext = {
  standard: Standard;
  defaultPath: string;
  rules?: Rule[];
  rulesLoading: boolean;
  rulesError: boolean;
  ruleLanguages: Record<string, string[]>;
};

export const StandardDetails = ({
  standard,
  orgSlug,
}: StandardDetailsProps) => {
  const navigate = useNavigate();
  const { spaceSlug } = useParams<{ spaceSlug?: string }>();
  const { organization } = useAuthContext();
  const { spaceId } = useCurrentSpace();
  const defaultPath = `.packmind/standards/${standard.slug}.md`;
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteAlert, setDeleteAlert] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const { data: versions, isLoading: versionsLoading } =
    useGetStandardVersionsQuery(standard.id);

  const {
    data: availableStandards = {
      standards: [],
    },
    isLoading: standardsLoading,
  } = useGetStandardsQuery();

  const {
    data: rules,
    isLoading: rulesLoading,
    isError: rulesError,
  } = useGetRulesByStandardIdQuery(
    organization?.id as OrganizationId,
    spaceId as SpaceId,
    standard.id,
  );

  const { ruleLanguages } = useStandardEditionFeatures(standard.id);

  const {
    activeSection,
    currentRuleId,
    showSummaryActions,
    showRuleActions,
    handleSectionSelect,
    handleBackToSummary,
    getPathForNavKey,
  } = useStandardSectionNavigation({
    standardId: standard.id,
    orgSlug,
    spaceSlug,
    rules,
    rulesLoading,
    rulesError,
  });
  const sortedRules = useMemo<Rule[] | undefined>(() => {
    if (!rules) {
      return undefined;
    }

    return [...rules].sort((firstRule, secondRule) =>
      firstRule.content.localeCompare(secondRule.content, undefined, {
        sensitivity: 'base',
      }),
    );
  }, [rules]);

  const selectedRule = useMemo(() => {
    if (!currentRuleId || !sortedRules) {
      return undefined;
    }
    return sortedRules.find((rule) => rule.id === currentRuleId);
  }, [currentRuleId, sortedRules]);

  const pageTitle = selectedRule ? selectedRule.content : standard.name;

  const deleteStandardMutation = useDeleteStandardMutation();

  const outletContext = useMemo<StandardDetailsOutletContext>(
    () => ({
      standard,
      defaultPath,
      rules: sortedRules,
      rulesLoading,
      rulesError,
      ruleLanguages,
    }),
    [
      standard,
      defaultPath,
      sortedRules,
      rulesLoading,
      rulesError,
      ruleLanguages,
    ],
  );

  const availableStandardOptions = useMemo<Standard[]>(() => {
    if (!availableStandards) {
      return [];
    }

    if (Array.isArray(availableStandards)) {
      return availableStandards;
    }

    if (
      'standards' in availableStandards &&
      Array.isArray(availableStandards.standards)
    ) {
      return availableStandards.standards;
    }

    return [];
  }, [availableStandards]);

  // Early return if no standardId is provided
  if (!standard) {
    return <PMText color="error">No standard ID provided.</PMText>;
  }

  const handleDelete = async () => {
    if (!standard) return;

    try {
      await deleteStandardMutation.mutateAsync(standard.id);
      setDeleteAlert({
        type: 'success',
        message: STANDARD_MESSAGES.success.deleted,
      });
      setDeleteModalOpen(false);

      // Auto-dismiss success alert and navigate back after 2 seconds
      setTimeout(() => {
        setDeleteAlert(null);
        if (orgSlug && spaceSlug) {
          navigate(routes.space.toStandards(orgSlug, spaceSlug));
          return;
        }
        navigate('..');
      }, 2000);
    } catch (error) {
      console.error('Failed to delete standard:', error);
      setDeleteAlert({
        type: 'error',
        message: STANDARD_MESSAGES.error.deleteFailed,
      });
      setDeleteModalOpen(false);
    }
  };

  const handleStandardSelect = (nextStandardId: string) => {
    if (!orgSlug || !spaceSlug) {
      return;
    }

    navigate(
      routes.space.toStandardSummary(orgSlug, spaceSlug, nextStandardId),
    );
  };

  const handleEdit = () => {
    if (!orgSlug || !spaceSlug) {
      return;
    }

    navigate(routes.space.toStandardEdit(orgSlug, spaceSlug, standard.id));
  };

  const handleDeleteRequest = () => {
    setDeleteModalOpen(true);
  };

  const handleDeleteDialogChange = (isOpen: boolean) => {
    setDeleteModalOpen(isOpen);
  };

  return (
    <PMGrid
      height="full"
      gridTemplateColumns={{
        base: 'minmax(240px, 270px) minmax(0, 1fr)',
      }}
      gap={6}
      alignItems="start"
      overflowX="auto"
    >
      <StandardDetailsSidebar
        standard={standard}
        standards={availableStandardOptions}
        activeSection={activeSection}
        onSectionSelect={handleSectionSelect}
        onStandardChange={handleStandardSelect}
        isStandardSelectDisabled={!orgSlug || !spaceSlug}
        standardsLoading={standardsLoading}
        rules={sortedRules}
        rulesLoading={rulesLoading}
        rulesError={rulesError}
        getPathForNavKey={getPathForNavKey}
      />

      <PMPage
        title={pageTitle}
        breadcrumbComponent={
          !showRuleActions ? (
            <StandardVersionHistoryHeader
              standard={standard}
              versions={versions}
              isLoading={versionsLoading}
              orgSlug={orgSlug}
            />
          ) : undefined
        }
        isFullWidth
        actions={
          showSummaryActions ? (
            <SummaryActions
              onEdit={handleEdit}
              onDeleteRequest={handleDeleteRequest}
              onDeleteDialogChange={handleDeleteDialogChange}
              onConfirmDelete={handleDelete}
              isDeleteDialogOpen={deleteModalOpen}
              isDeleting={deleteStandardMutation.isPending}
              deleteDialogMessage={
                standard
                  ? STANDARD_MESSAGES.confirmation.deleteStandard(standard.name)
                  : 'Are you sure you want to delete this standard?'
              }
            />
          ) : showRuleActions ? (
            <RuleActions onBackToSummary={handleBackToSummary} />
          ) : undefined
        }
      >
        {deleteAlert && (
          <PMAlert.Root status={deleteAlert.type} width="lg" mb={4}>
            <PMAlert.Indicator />
            <PMAlert.Title>{deleteAlert.message}</PMAlert.Title>
          </PMAlert.Root>
        )}

        <PMVStack align="stretch" gap={6}>
          <PMBox width="full">
            <Outlet context={outletContext} />
          </PMBox>
        </PMVStack>
      </PMPage>
    </PMGrid>
  );
};
