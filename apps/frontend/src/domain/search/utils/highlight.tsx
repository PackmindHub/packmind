import { Fragment, type ReactNode } from 'react';
import { PMText } from '@packmind/ui';

/**
 * Split `text` around case-insensitive occurrences of `term` and wrap each
 * matched segment in a highlighted inline span.
 *
 * The highlight uses the design system's blue semantic palette —
 * `blue.subtle` (blue.800) background with `blue.fg` (blue.100) text — which is
 * dark-mode safe and high-contrast. Tokens are applied through PMText's
 * `textProps` passthrough (its `color` prop is restricted to the text palette).
 *
 * Returns the text unchanged when `term` is empty.
 */
export const highlightMatch = (text: string, term: string): ReactNode => {
  const trimmed = term.trim();
  if (!trimmed) {
    return text;
  }

  // Escape regex metacharacters so the user's term is matched literally.
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  const loweredTerm = trimmed.toLowerCase();

  return parts.map((part, index) => {
    if (!part) {
      return null;
    }
    if (part.toLowerCase() === loweredTerm) {
      return (
        <PMText
          key={index}
          as="span"
          textProps={{
            backgroundColor: 'blue.subtle',
            color: 'blue.fg',
            borderRadius: '2px',
            px: '2px',
          }}
        >
          {part}
        </PMText>
      );
    }
    return <Fragment key={index}>{part}</Fragment>;
  });
};
