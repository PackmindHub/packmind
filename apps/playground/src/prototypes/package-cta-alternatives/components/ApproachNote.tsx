import { PMBox, PMHStack, PMText, PMVStack } from '@packmind/ui';
import type { HeaderApproach } from '../types';

/**
 * What each approach buys and what it costs, beside the thing itself. A
 * prototype that only shows the pixels makes the reviewer reconstruct the
 * argument from them; the argument is half of what is being chosen.
 */
const NOTES: Record<
  HeaderApproach,
  { claim: string; buys: string; costs: string }
> = {
  today: {
    claim: 'One slot, three sentences.',
    buys: 'The catch-up is one click from anywhere in the package.',
    costs:
      'The label changes meaning with the state, and "Distribute" appears twice over for a reader who cannot tell reaching somewhere new from catching up where you already are. The Distribution tab, which owns both verbs, offers neither.',
  },
  none: {
    claim: 'The header stops acting. Every verb belongs to its tab.',
    buys: 'Nothing on screen changes its mind about what it does. The badge on the Distribution tab is the only thing that calls for attention, and it is a number rather than a verb.',
    costs:
      'The top-right is an ellipsis alone, which reads as unfinished. A package that stands nowhere has no loud prompt above the fold — the blank state has to carry it.',
  },
  release: {
    claim: 'The one act that belongs to neither tab, promoted.',
    buys: 'The header holds the hinge between the two halves: freeze the content so the distribution has something to send. On a package with unreleased changes it names exactly what is blocked.',
    costs:
      'Dead most of the time — switch to "Up to date everywhere" and the loudest slot on the surface is a greyed button. The version bar has to give the action up, or you have two places to cut.',
  },
  reach: {
    claim: 'A fact, not a verb.',
    buys: 'The slot answers the question a reader arrives with — where has this got to — instead of guessing which act they want. It never has to be relabelled.',
    costs:
      'It says what the tab badge already says, and what the reach strip on the Components tab says a third time. One of the three has to go.',
  },
  install: {
    claim: 'The hand-off, pulled out of the Distribute popover.',
    buys: 'Stable: one label, in every state, never making a claim about drift. Useful for a developer who wants the command rather than a push.',
    costs:
      'It is a copy button occupying the loudest slot on the surface. Nothing about the package state is reflected there any more.',
  },
};

export function ApproachNote({
  approach,
}: Readonly<{ approach: HeaderApproach }>) {
  const note = NOTES[approach];
  return (
    <PMVStack
      align="stretch"
      gap={3}
      borderWidth="1px"
      borderColor="border.tertiary"
      borderRadius="md"
      padding={4}
      bg="background.primary"
    >
      <PMText variant="body-important">{note.claim}</PMText>
      <Line label="Buys" tone="success" text={note.buys} />
      <Line label="Costs" tone="warning" text={note.costs} />
    </PMVStack>
  );
}

function Line({
  label,
  tone,
  text,
}: Readonly<{ label: string; tone: 'success' | 'warning'; text: string }>) {
  return (
    <PMHStack align="start" gap={2}>
      <PMBox width="44px" flexShrink={0}>
        <PMText variant="small-important" color={tone}>
          {label}
        </PMText>
      </PMBox>
      <PMText variant="small" color="secondary">
        {text}
      </PMText>
    </PMHStack>
  );
}
