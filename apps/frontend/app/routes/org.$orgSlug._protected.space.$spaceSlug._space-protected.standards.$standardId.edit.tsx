import { useParams, useNavigate, NavLink } from 'react-router';
import { PMPage } from '@packmind/ui';
import { PMVStack, PMBox } from '@packmind/ui';
import { StandardForm } from '../../src/domain/standards/components/StandardForm';
import { useGetStandardByIdQuery } from '../../src/domain/standards/api/queries/StandardsQueries';
import { StandardId } from '@packmind/shared/types';
import { AutobreadCrumb } from '../../src/shared/components/navigation/AutobreadCrumb';
import { MarkdownEditorProvider } from '../../src/shared/components/editor/MarkdownEditor';
import { routes } from '../../src/shared/utils/routes';

export const handle = {
  crumb: ({
    params,
  }: {
    params: { orgSlug: string; spaceSlug: string; standardId: string };
  }) => {
    return (
      <NavLink
        to={routes.space.toStandardEdit(
          params.orgSlug,
          params.spaceSlug,
          params.standardId,
        )}
      >
        Edit
      </NavLink>
    );
  },
};

export default function EditStandardRouteModule() {
  const { orgSlug, spaceSlug, standardId } = useParams<{
    orgSlug: string;
    spaceSlug: string;
    standardId: string;
  }>();
  const navigate = useNavigate();

  const { data: standard, isError: standardError } = useGetStandardByIdQuery(
    standardId as StandardId,
  );

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
