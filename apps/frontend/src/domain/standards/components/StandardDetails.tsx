import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router';
import { PMBox, PMText, PMAlert, PMPage, PMTabs, PMButton } from '@packmind/ui';
import {
  Rule,
  Standard,
  OrganizationId,
  SpaceId,
  ChangeProposalStatus,
} from '@packmind/types';
import { useListChangeProposalsByStandardQuery } from '@packmind/proprietary/frontend/domain/change-proposals/api/queries/ChangeProposalsQueries';
import {
  useGetRulesByStandardIdQuery,
  useGetStandardVersionsQuery,
  useDeleteStandardMutation,
} from '../api/queries/StandardsQueries';
import { STANDARD_MESSAGES } from '../constants/messages';
import { routes } from '../../../shared/utils/routes';
import { StandardVersionHistoryHeader } from './StandardVersionHistoryHeader';
import { SummaryActions } from './StandardDetailsActions';
import { useStandardEditionFeatures } from '@packmind/proprietary/frontend/domain/detection/hooks/useStandardEditionFeatures';
import { useAuthContext } from '../../accounts/hooks/useAuthContext';
import { useCurrentSpace } from '../../spaces/hooks/useCurrentSpace';
import { LuArrowLeft } from 'react-icons/lu';

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
  const { pathname } = useLocation();
  const isEditing = pathname.endsWith('/edit');
  const defaultPath = `.packmind/standards/${standard.slug}.md`;
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteAlert, setDeleteAlert] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const { data: versions, isLoading: versionsLoading } =
    useGetStandardVersionsQuery(standard.id);

  const {
    data: rules,
    isLoading: rulesLoading,
    isError: rulesError,
  } = useGetRulesByStandardIdQuery(
    organization?.id as OrganizationId,
    spaceId as SpaceId,
    standard.id,
  );

  const { data: changeProposals } = useListChangeProposalsByStandardQuery(
    standard.id,
  );
  const pendingCount =
    changeProposals?.changeProposals?.filter(
      (p: { status: string }) => p.status === ChangeProposalStatus.pending,
    ).length ?? 0;

  const { ruleLanguages } = useStandardEditionFeatures(standard.id);

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

  const currentRuleId = useMemo(() => {
    const match = /\/rule\/([^/]+)$/.exec(pathname);
    return match ? match[1] : undefined;
  }, [pathname]);

  const isRuleView = !!currentRuleId;

  const currentRule = useMemo(() => {
    if (!currentRuleId || !sortedRules) return undefined;
    return sortedRules.find((rule) => rule.id === currentRuleId);
  }, [currentRuleId, sortedRules]);

  const activeTab = useMemo(() => {
    if (pathname.endsWith('/deployment')) return 'distribution';
    return 'summary';
  }, [pathname]);

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

  // Redirect to summary if the current rule no longer exists
  useEffect(() => {
    if (!currentRuleId || rulesLoading || rulesError) return;
    const hasRule = sortedRules?.some((rule) => rule.id === currentRuleId);
    if (!hasRule && orgSlug && spaceSlug) {
      navigate(
        routes.space.toStandardSummary(orgSlug, spaceSlug, standard.id),
        { replace: true },
      );
    }
  }, [
    currentRuleId,
    sortedRules,
    rulesLoading,
    rulesError,
    navigate,
    orgSlug,
    spaceSlug,
    standard.id,
  ]);

  if (!standard) {
    return <PMText color="error">No standard ID provided.</PMText>;
  }

  const handleDelete = async () => {
    if (!standard) return;

    try {
      await deleteStandardMutation.mutateAsync(standard.id);
      setDeleteModalOpen(false);

      if (orgSlug && spaceSlug) {
        navigate(routes.space.toStandards(orgSlug, spaceSlug));
        return;
      }
      navigate('..');
    } catch (error) {
      console.error('Failed to delete standard:', error);
      setDeleteAlert({
        type: 'error',
        message: STANDARD_MESSAGES.error.deleteFailed,
      });
      setDeleteModalOpen(false);
    }
  };

  const handleEdit = () => {
    if (!orgSlug || !spaceSlug) return;
    navigate(routes.space.toStandardEdit(orgSlug, spaceSlug, standard.id));
  };

  const handleDeleteRequest = () => setDeleteModalOpen(true);
  const handleDeleteDialogChange = (isOpen: boolean) =>
    setDeleteModalOpen(isOpen);

  const handleBackToSummary = () => {
    if (!orgSlug || !spaceSlug) return;
    navigate(routes.space.toStandardSummary(orgSlug, spaceSlug, standard.id));
  };

  const handleTabChange = (details: { value: string }) => {
    if (!orgSlug || !spaceSlug) return;
    if (details.value === 'distribution') {
      navigate(
        routes.space.toStandardDeployment(orgSlug, spaceSlug, standard.id),
      );
    } else {
      navigate(routes.space.toStandardSummary(orgSlug, spaceSlug, standard.id));
    }
  };

  // When editing, render only the outlet (edit form handles its own layout)
  if (isEditing) {
    return <Outlet context={outletContext} />;
  }

  const tabs = [
    { value: 'summary', triggerLabel: 'Overview' },
    { value: 'distribution', triggerLabel: 'Distribution' },
  ];

  return (
    <PMPage
      title={currentRule?.content ?? standard.name}
      breadcrumbComponent={
        <StandardVersionHistoryHeader
          standard={standard}
          versions={versions}
          isLoading={versionsLoading}
          orgSlug={orgSlug}
        />
      }
      actions={
        isRuleView ? (
          <PMButton variant="tertiary" size="sm" onClick={handleBackToSummary}>
            <LuArrowLeft />
            Back to standard
          </PMButton>
        ) : (
          <SummaryActions
            onEdit={handleEdit}
            onDeleteRequest={handleDeleteRequest}
            onDeleteDialogChange={handleDeleteDialogChange}
            onConfirmDelete={handleDelete}
            isDeleteDialogOpen={deleteModalOpen}
            isDeleting={deleteStandardMutation.isPending}
            deleteDialogMessage={STANDARD_MESSAGES.confirmation.deleteStandard(
              standard.name,
            )}
            pendingCount={pendingCount}
            standardId={standard.id}
            orgSlug={orgSlug}
            spaceSlug={spaceSlug}
          />
        )
      }
    >
      {deleteAlert && (
        <PMAlert.Root status={deleteAlert.type} width="lg">
          <PMAlert.Indicator />
          <PMAlert.Title>{deleteAlert.message}</PMAlert.Title>
        </PMAlert.Root>
      )}

      {!isRuleView && (
        <PMTabs
          tabs={tabs}
          defaultValue="summary"
          value={activeTab}
          onValueChange={handleTabChange}
          mb="4"
        />
      )}

      <PMBox width="full">
        <Outlet context={outletContext} />
      </PMBox>
    </PMPage>
  );
};
