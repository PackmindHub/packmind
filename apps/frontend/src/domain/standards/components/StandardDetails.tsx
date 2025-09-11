import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  PMPage,
  PMVStack,
  PMHStack,
  PMButton,
  PMText,
  PMPageSection,
  PMAlert,
  PMSpinner,
  PMAlertDialog,
  PMTabs,
  PMGrid,
  PMGridItem,
  PMDataList,
  PMBox,
  pmUseToken,
} from '@packmind/ui';
import {
  useGetStandardVersionsQuery,
  useGetRulesByStandardIdQuery,
  useDeleteStandardMutation,
} from '../api/queries/StandardsQueries';
import { StandardVersionsList } from './StandardVersionsList';
import { RulesList } from './RulesList';

import { useDeployStandard } from '../../deployments/hooks';
import { Standard } from '@packmind/standards/types';
import { GitRepoId } from '@packmind/git/types';
import { STANDARD_MESSAGES } from '../constants/messages';
import { AutobreadCrumb } from '../../../shared/components/navigation/AutobreadCrumb';
import { DeploymentsPanel } from '../../deployments/components/StandardDeployments/DeploymentsPanel';
import {
  MarkdownEditor,
  MarkdownEditorProvider,
} from '../../../shared/components/editor/MarkdownEditor';

interface StandardDetailsProps {
  standard: Standard;
  orgSlug?: string;
}

export const StandardDetails = ({
  standard,
  orgSlug,
}: StandardDetailsProps) => {
  const navigate = useNavigate();
  const [minRulesWidth, maxRulesWidth] = pmUseToken('sizes', ['md', '2xl']);

  // Alert state management for deployment
  const [deploymentAlert, setDeploymentAlert] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
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
  } = useGetRulesByStandardIdQuery(standard.id);

  const deleteStandardMutation = useDeleteStandardMutation();
  const { deployStandard, isDeploying } = useDeployStandard();

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
        navigate(`../`);
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

  const handleDeploy = async (gitRepoIds: GitRepoId[]) => {
    if (!standard) return;

    try {
      // Show loading alert with spinner
      setDeploymentAlert({
        type: 'info',
        message: STANDARD_MESSAGES.loading.deploying,
      });

      await deployStandard(
        {
          id: standard.id,
          version: standard.version,
          name: standard.name,
        },
        gitRepoIds,
      );

      // Show success alert
      setDeploymentAlert({
        type: 'success',
        message: STANDARD_MESSAGES.success.deployed,
      });

      // Auto-dismiss success alert after 3 seconds
      setTimeout(() => {
        setDeploymentAlert(null);
      }, 3000);
    } catch (error) {
      console.error('Failed to deploy standard:', error);
      setDeploymentAlert({
        type: 'error',
        message: STANDARD_MESSAGES.error.deployFailed,
      });
    }
  };

  return (
    <PMPage
      title={standard.name}
      breadcrumbComponent={<AutobreadCrumb />}
      isFullWidth
      actions={
        <PMHStack gap={2}>
          <PMButton variant="primary" onClick={() => navigate(`./edit`)}>
            Edit
          </PMButton>
          <PMAlertDialog
            trigger={
              <PMButton
                variant="tertiary"
                loading={deleteStandardMutation.isPending}
              >
                Delete
              </PMButton>
            }
            title="Delete Standard"
            message={
              standard
                ? STANDARD_MESSAGES.confirmation.deleteStandard(standard.name)
                : 'Are you sure you want to delete this standard?'
            }
            confirmText="Delete"
            cancelText="Cancel"
            confirmColorScheme="red"
            onConfirm={handleDelete}
            open={deleteModalOpen}
            onOpenChange={setDeleteModalOpen}
            isLoading={deleteStandardMutation.isPending}
          />
        </PMHStack>
      }
    >
      {deploymentAlert && (
        <PMAlert.Root status={deploymentAlert.type} width="lg" mb={4}>
          {deploymentAlert.type === 'info' ? (
            <PMAlert.Indicator>
              <PMSpinner size="sm" />
            </PMAlert.Indicator>
          ) : (
            <PMAlert.Indicator />
          )}
          <PMAlert.Title>{deploymentAlert.message}</PMAlert.Title>
        </PMAlert.Root>
      )}

      {/* Delete Success/Error Alert */}
      {deleteAlert && (
        <PMAlert.Root status={deleteAlert.type} width="lg" mb={4}>
          <PMAlert.Indicator />
          <PMAlert.Title>{deleteAlert.message}</PMAlert.Title>
        </PMAlert.Root>
      )}

      <PMVStack align="stretch" gap={6}>
        <PMDataList
          size="md"
          orientation="horizontal"
          items={[
            {
              label: 'Version',
              value: (
                <PMHStack gap={2} alignItems={'baseline'}>
                  {standard.version}
                  <StandardVersionsList
                    standardId={standard.id}
                    isLoading={versionsLoading}
                    versions={versions}
                    orgSlug={orgSlug}
                  />
                </PMHStack>
              ),
            },
          ]}
        />
        <PMTabs
          defaultValue="documentation"
          tabs={[
            {
              value: 'documentation',
              triggerLabel: 'Documentation',
              content: (
                <PMGrid
                  templateColumns={{
                    base: '1fr',
                    '2xl': `1fr minmax(${minRulesWidth}, ${maxRulesWidth})`,
                  }}
                  gap={4}
                  maxH={'100%'}
                  marginTop={4}
                >
                  <PMGridItem>
                    <PMPageSection title="Description">
                      <PMBox
                        border="solid 1px"
                        borderColor="border.primary"
                        width="full"
                      >
                        <MarkdownEditorProvider>
                          <MarkdownEditor
                            defaultValue={standard.description}
                            readOnly
                          />
                        </MarkdownEditorProvider>
                      </PMBox>
                    </PMPageSection>
                  </PMGridItem>
                  <PMGridItem borderRadius={2}>
                    <PMPageSection title="Rules">
                      <RulesList
                        rules={rules}
                        isLoading={rulesLoading}
                        isError={rulesError}
                      />
                    </PMPageSection>
                  </PMGridItem>
                </PMGrid>
              ),
            },
            {
              value: 'deployments',
              triggerLabel: 'Deployments',
              content: (
                <DeploymentsPanel
                  standard={standard}
                  orgSlug={orgSlug}
                  handleDeploy={handleDeploy}
                  isDeploying={isDeploying}
                />
              ),
            },
          ]}
        />
      </PMVStack>
    </PMPage>
  );
};
