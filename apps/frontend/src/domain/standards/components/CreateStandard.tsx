import { useParams } from 'react-router';
import { StandardForm } from './StandardForm';
import { MarkdownEditorProvider } from '../../../shared/components/editor/MarkdownEditor';
import { Standard } from '@packmind/types';
import { pmToaster } from '@packmind/ui';
import { useNavigation } from '../../../shared/hooks/useNavigation';
import { useCreateIntoPackage } from '../../deployments/hooks/useCreateIntoPackage';
import { contextPackageHref } from '../../deployments/components/context/buildComponentDetail';

export const CreateStandard = () => {
  const { orgSlug, spaceSlug } = useParams() as {
    orgSlug: string;
    spaceSlug: string;
  };
  const nav = useNavigation();
  const { packageId, attachToPackage } = useCreateIntoPackage();

  const onStandardCreated = (standard?: Standard) => {
    if (!standard) {
      return;
    }

    /*
     * Navigating only once the membership is settled. The standard is saved
     * either way, so the wait is short and it is what makes the screen that
     * comes next show the package the user asked for rather than none.
     */
    void attachToPackage({ standardIds: [standard.id] }).then((outcome) => {
      if (outcome === 'failed') {
        pmToaster.error({
          title: 'Standard created, but not added to the package',
          description:
            'It is in the space. Add it to a package to distribute it.',
        });
      }
      /*
       * Back where the form was opened from. A package in the address means
       * this form was reached from the Context surface, so that is the screen
       * the user was working on, with the new standard open in it. The
       * standard's own page is where the per-type pages send it, and it is
       * still the right answer for them.
       */
      if (packageId) {
        nav.to(
          contextPackageHref({ orgSlug, spaceSlug }, packageId, standard.id),
        );
      } else {
        nav.space.toStandard(standard.id);
      }
    });
  };

  return (
    <MarkdownEditorProvider>
      <StandardForm mode="create" onSuccess={onStandardCreated} />
    </MarkdownEditorProvider>
  );
};
