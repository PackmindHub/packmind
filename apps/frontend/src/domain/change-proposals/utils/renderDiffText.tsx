import { PMText } from '@packmind/ui';
import { diffWords } from 'diff';

export function renderDiffText(oldValue: string, newValue: string) {
  const changes = diffWords(oldValue, newValue);
  return changes.map((change, i) => {
    if (change.added) {
      return (
        <PMText
          key={i}
          as="span"
          bg="green.subtle"
          paddingX={0.5}
          borderRadius="sm"
          data-diff-change=""
        >
          {change.value}
        </PMText>
      );
    }
    if (change.removed) {
      return (
        <PMText
          key={i}
          as="span"
          bg="red.subtle"
          textDecoration="line-through"
          paddingX={0.5}
          borderRadius="sm"
          data-diff-change=""
        >
          {change.value}
        </PMText>
      );
    }
    return (
      <PMText key={i} as="span">
        {change.value}
      </PMText>
    );
  });
}
