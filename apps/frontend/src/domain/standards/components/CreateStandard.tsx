import { StandardForm } from './StandardForm';
import { MarkdownEditorProvider } from '../../../shared/components/editor/MarkdownEditor';
import { Standard } from '@packmind/standards';
import { useNavigate, useParams } from 'react-router';
import { useNavigation } from '../../../shared/hooks/useNavigation';

export const CreateStandard = () => {
  const { orgSlug, spaceSlug } = useParams<{
    orgSlug: string;
    spaceSlug: string;
  }>();
  const nav = useNavigation();

  const onStandardCreated = (standard?: Standard) => {
    if (standard) {
      nav.space.toStandard(standard.id);
    }
  };

  return (
    <MarkdownEditorProvider>
      <StandardForm mode="create" onSuccess={onStandardCreated} />
    </MarkdownEditorProvider>
  );
};
