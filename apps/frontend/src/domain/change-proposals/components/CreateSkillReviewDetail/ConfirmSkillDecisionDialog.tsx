import { PMAlertDialog } from '@packmind/ui';

export type SkillDecision = 'accept' | 'dismiss';

export interface ConfirmSkillDecisionDialogProps {
  open: boolean;
  decision: SkillDecision;
  skillName: string;
  isPending: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}

const COPY: Record<
  SkillDecision,
  {
    title: string;
    bodyPrefix: string;
    bodySuffix: string;
    confirmText: string;
    confirmColorScheme: string;
  }
> = {
  accept: {
    title: 'Accept this skill proposal?',
    bodyPrefix: 'This will create the skill ',
    bodySuffix: ' in your space and mark the proposal as applied.',
    confirmText: 'Accept',
    confirmColorScheme: 'green',
  },
  dismiss: {
    title: 'Dismiss this skill proposal?',
    bodyPrefix: 'The skill ',
    bodySuffix: " won't be created and the proposal will be discarded.",
    confirmText: 'Dismiss',
    confirmColorScheme: 'red',
  },
};

export function ConfirmSkillDecisionDialog({
  open,
  decision,
  skillName,
  isPending,
  onConfirm,
  onOpenChange,
}: Readonly<ConfirmSkillDecisionDialogProps>) {
  const copy = COPY[decision];

  return (
    <PMAlertDialog
      open={open}
      onOpenChange={(details) => onOpenChange(details.open)}
      title={copy.title}
      message={`${copy.bodyPrefix}"${skillName}"${copy.bodySuffix}`}
      confirmText={copy.confirmText}
      confirmColorScheme={copy.confirmColorScheme}
      isLoading={isPending}
      onConfirm={onConfirm}
    />
  );
}
