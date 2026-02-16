import { useParams, useNavigate } from 'react-router';
import { PMPage } from '@packmind/ui';
import { PMVStack, PMBox } from '@packmind/ui';
import { StandardForm } from '../../src/domain/standards/components/StandardForm';
import { useGetStandardByIdQuery } from '../../src/domain/standards/api/queries/StandardsQueries';
import { StandardId } from '@packmind/types';
import { MarkdownEditorProvider } from '../../src/shared/components/editor/MarkdownEditor';
import { routes } from '../../src/shared/utils/routes';

export default function EditStandardRouteModule() {
  const { orgSlug, spaceSlug, standardId } = useParams<{
    orgSlug: string;
    spaceSlug: string;
    standardId: string;
  }>();
  const navigate = useNavigate();

  const { data: getStandardByIdResponse, isError: standardError } =
    useGetStandardByIdQuery(standardId as StandardId);

  const handleSuccess = () => {
    if (orgSlug && spaceSlug && standardId) {
      navigate(routes.space.toStandard(orgSlug, spaceSlug, standardId));
    }
  };

  const handleCancel = () => {
    if (orgSlug && spaceSlug && standardId) {
      navigate(routes.space.toStandard(orgSlug, spaceSlug, standardId));
    }
  };

  // If standard failed to load
  if (
    standardError ||
    !getStandardByIdResponse ||
    !getStandardByIdResponse.standard
  ) {
    return (
      <PMPage title="Error" subtitle="Failed to load standard">
        <PMBox display="flex" justifyContent="center" py={8}>
          <PMVStack gap={4}>
            <span>Failed to load standard. Please try again.</span>
          </PMVStack>
        </PMBox>
      </PMPage>
    );
  }

  return (
    <PMPage
      title={`Edit ${getStandardByIdResponse.standard.name}`}
      subtitle="Update standard details and rules"
    >
      <MarkdownEditorProvider>
        <StandardForm
          mode="edit"
          standard={getStandardByIdResponse.standard}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </MarkdownEditorProvider>
    </PMPage>
  );
}
