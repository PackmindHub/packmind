import { StandardForm } from './StandardForm';
import { MarkdownEditorProvider } from '../../../shared/components/editor/MarkdownEditor';
import { Standard } from '@packmind/types';
import { pmToaster } from '@packmind/ui';
import { useNavigation } from '../../../shared/hooks/useNavigation';
import { useCreateIntoPackage } from '../../deployments/hooks/useCreateIntoPackage';

export const CreateStandard = () => {
  const nav = useNavigation();
  const { attachToPackage } = useCreateIntoPackage();

  const onStandardCreated = (standard?: Standard) => {
    if (!standard) {
      return;
    }

    /*
     * Navigating only once the membership is settled. The standard is saved
     * either way, so the wait is short and it is what makes the detail page
     * show the package the user asked for rather than none.
     */
    void attachToPackage({ standardIds: [standard.id] }).then((outcome) => {
      if (outcome === 'failed') {
        pmToaster.error({
          title: 'Standard created, but not added to the package',
          description:
            'It is in the space. Add it to a package to distribute it.',
        });
      }
      nav.space.toStandard(standard.id);
    });
  };

  return (
    <MarkdownEditorProvider>
      <StandardForm mode="create" onSuccess={onStandardCreated} />
    </MarkdownEditorProvider>
  );
};
