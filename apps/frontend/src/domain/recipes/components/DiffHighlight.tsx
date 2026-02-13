import { diffWords } from 'diff';
import { PMText } from '@packmind/ui';

interface DiffHighlightProps {
  oldText: string;
  newText: string;
}

export function DiffHighlight({
  oldText,
  newText,
}: Readonly<DiffHighlightProps>) {
  const changes = diffWords(oldText, newText);

  return (
    <PMText whiteSpace="pre-wrap">
      {changes.map((change, i) => {
        if (change.added) {
          return (
            <PMText key={i} color="success" p={1}>
              {change.value}
            </PMText>
          );
        }
        if (change.removed) {
          return (
            <PMText key={i} color="error" p={1}>
              {change.value}
            </PMText>
          );
        }
        return <span key={i}>{change.value}</span>;
      })}
    </PMText>
  );
}
