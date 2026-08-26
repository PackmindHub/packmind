import { useParams, useNavigate } from 'react-router';
import { PMPage, PMVStack, PMBox, PMButton } from '@packmind/ui';
import { LuArrowLeft } from 'react-icons/lu';
import { StandardForm } from '../../src/domain/standards/components/StandardForm';
import { useGetStandardByIdQuery } from '../../src/domain/standards/api/queries/StandardsQueries';
import { StandardId } from '@packmind/types';
import { MarkdownEditorProvider } from '../../src/shared/components/editor/MarkdownEditor';
import { routes } from '../../src/shared/utils/routes';
import { usePackageInAddress } from '../../src/domain/deployments/hooks/useCreateIntoPackage';
import { contextPackageHref } from '../../src/domain/deployments/components/context/buildComponentDetail';

export default function EditStandardRouteModule() {
  const { orgSlug, spaceSlug, standardId } = useParams<{
    orgSlug: string;
    spaceSlug: string;
    standardId: string;
  }>();
  const navigate = useNavigate();
  const packageId = usePackageInAddress();

  const { data: getStandardByIdResponse, isError: standardError } =
    useGetStandardByIdQuery(standardId as StandardId);

  /*
   * Back where the form was opened from, saved or cancelled alike. A package in
   * the address means Edit was pressed on the Context surface, so that is the
   * screen to return to, with this standard open in it. Without one the form was
   * reached from the standard's own page, and that page is where it goes.
   */
  const goBack = () => {
    if (!orgSlug || !spaceSlug || !standardId) {
      return;
    }

    navigate(
      packageId
        ? contextPackageHref({ orgSlug, spaceSlug }, packageId, standardId)
        : routes.space.toStandard(orgSlug, spaceSlug, standardId),
    );
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

  const standard = getStandardByIdResponse.standard;

  return (
    <PMPage
      title="Edit standard"
      actions={
        <PMButton variant="tertiary" size="sm" onClick={goBack}>
          <LuArrowLeft />
          {/* The label names where the button goes, which is not always the
              standard's page: opened from a package, it goes back to it. */}
          {packageId ? 'Back to package' : 'Back to standard'}
        </PMButton>
      }
    >
      <MarkdownEditorProvider>
        <StandardForm
          mode="edit"
          standard={standard}
          onSuccess={goBack}
          onCancel={goBack}
        />
      </MarkdownEditorProvider>
    </PMPage>
  );
}
