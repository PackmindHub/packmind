import { useParams, useNavigate, NavLink } from 'react-router';
import { PMPage } from '@packmind/ui';
import { PMVStack, PMBox } from '@packmind/ui';
import { StandardForm } from '../../src/domain/standards/components/StandardForm';
import { useGetStandardByIdQuery } from '../../src/domain/standards/api/queries/StandardsQueries';
import { StandardId } from '@packmind/standards/types';
import { AutobreadCrumb } from '../../src/shared/components/navigation/AutobreadCrumb';
import { MarkdownEditorProvider } from '../../src/shared/components/editor/MarkdownEditor';

export const handle = {
  crumb: ({ params }: { params: { orgSlug: string; standardId: string } }) => {
    return (
      <NavLink
        to={`/org/${params.orgSlug}/standards/${params.standardId}/edit`}
      >
        Edit
      </NavLink>
    );
  },
};

export default function EditStandardRouteModule() {
  const { orgSlug, standardId } = useParams();
  const navigate = useNavigate();

  const { data: standard, isError: standardError } = useGetStandardByIdQuery(
    standardId as StandardId,
  );

  const handleSuccess = () => {
    navigate(`/org/${orgSlug}/standards/${standardId}`);
  };

  const handleCancel = () => {
    navigate(`/org/${orgSlug}/standards/${standardId}`);
  };

  // If standard failed to load
  if (standardError || !standard) {
    return (
      <PMPage
        title="Error"
        subtitle="Failed to load standard"
        breadcrumbComponent={<AutobreadCrumb />}
      >
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
      title={`Edit ${standard.name}`}
      subtitle="Update standard details and rules"
      breadcrumbComponent={<AutobreadCrumb />}
    >
      <MarkdownEditorProvider>
        <StandardForm
          mode="edit"
          standard={standard}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </MarkdownEditorProvider>
    </PMPage>
  );
}
