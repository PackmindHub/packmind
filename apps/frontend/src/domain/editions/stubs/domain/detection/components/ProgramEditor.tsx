import { PMAlert } from '@packmind/ui';

interface ProgramEditorProps {
  standardId: string;
  ruleId: string;
  detectionLanguages: string[];
  selectedLanguage: string;
}

export const ProgramEditor = (props: ProgramEditorProps) => {
  return (
    <PMAlert.Root status="info">
      <PMAlert.Indicator />
      <PMAlert.Title>
        Rule detection is not available in the Community edition.
      </PMAlert.Title>
    </PMAlert.Root>
  );
};
