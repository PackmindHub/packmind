import { StandardForm } from './StandardForm';
import { MarkdownEditorProvider } from '../../../shared/components/editor/MarkdownEditor';
import { Standard } from '@packmind/standards';
import { useNavigate, useParams } from 'react-router';

export const CreateStandard = () => {
  const { orgSlug } = useParams();
  const navigate = useNavigate();

  const onStandardCreated = (standard?: Standard) => {
    if (standard) {
      navigate(`/org/${orgSlug}/standards/${standard.id}`);
    }
  };

  return (
    <MarkdownEditorProvider>
      <StandardForm mode="create" onSuccess={onStandardCreated} />
    </MarkdownEditorProvider>
  );
};
