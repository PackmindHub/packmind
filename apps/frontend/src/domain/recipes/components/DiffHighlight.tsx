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
            <span
              key={i}
              style={{
                backgroundColor: 'var(--colors-green-100)',
                color: 'var(--colors-green-800)',
              }}
            >
              {change.value}
            </span>
          );
        }
        if (change.removed) {
          return (
            <span
              key={i}
              style={{
                backgroundColor: 'var(--colors-red-100)',
                color: 'var(--colors-red-800)',
                textDecoration: 'line-through',
              }}
            >
              {change.value}
            </span>
          );
        }
        return <span key={i}>{change.value}</span>;
      })}
    </PMText>
  );
}
