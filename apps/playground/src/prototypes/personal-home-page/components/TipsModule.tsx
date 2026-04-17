import {
  PMBox,
  PMHStack,
  PMText,
  PMHeading,
  PMIcon,
  PMButton,
  PMCloseButton,
} from '@packmind/ui';
import { LuLightbulb } from 'react-icons/lu';
import type { Tip } from '../types';

interface TipsModuleProps {
  tips: Tip[];
  onDismiss: (id: string) => void;
  onAction: (id: string) => void;
}

function TipCard({
  tip,
  onDismiss,
  onAction,
}: Readonly<{
  tip: Tip;
  onDismiss: (id: string) => void;
  onAction: (id: string) => void;
}>) {
  return (
    <PMBox
      borderWidth="1px"
      borderColor="border.tertiary"
      borderRadius="lg"
      paddingX={4}
      paddingY={3}
      display="flex"
      flexDirection="column"
      gap={2}
      position="relative"
      _hover={{ borderColor: 'border.secondary' }}
      transition="border-color 0.15s"
    >
      <PMBox position="absolute" top={2} right={2}>
        <PMCloseButton size="xs" onClick={() => onDismiss(tip.id)} />
      </PMBox>

      <PMText fontSize="sm" fontWeight="medium" color="text.primary" pr={6}>
        {tip.title}
      </PMText>

      <PMText fontSize="sm" color="text.secondary">
        {tip.description}
      </PMText>

      <PMBox>
        <PMButton size="xs" variant="ghost" onClick={() => onAction(tip.id)}>
          {tip.actionLabel}
        </PMButton>
      </PMBox>
    </PMBox>
  );
}

export function TipsModule({
  tips,
  onDismiss,
  onAction,
}: Readonly<TipsModuleProps>) {
  if (tips.length === 0) return null;

  return (
    <PMBox>
      {/* Module header */}
      <PMHStack gap={2} align="center" marginBottom={4}>
        <PMIcon fontSize="md" color="text.secondary">
          <LuLightbulb />
        </PMIcon>
        <PMHeading size="md">Discover</PMHeading>
      </PMHStack>

      {/* Tips grid — 1 column on narrow, 2 on wider */}
      <PMBox
        display="grid"
        gridTemplateColumns="repeat(auto-fill, minmax(280px, 1fr))"
        gap={3}
      >
        {tips.map((tip) => (
          <TipCard
            key={tip.id}
            tip={tip}
            onDismiss={onDismiss}
            onAction={onAction}
          />
        ))}
      </PMBox>
    </PMBox>
  );
}
