import { PMAlertDialog } from '@packmind/ui';

export type CreationDecision = 'accept' | 'dismiss';

export type CreationArtefactLabel = 'skill' | 'command' | 'standard';

export interface ConfirmCreationDecisionDialogProps {
  open: boolean;
  decision: CreationDecision;
  artefactLabel: CreationArtefactLabel;
  artefactName: string;
  isPending: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}

const COPY: Record<
  CreationDecision,
  {
    title: (label: string) => string;
    body: (label: string, name: string) => string;
    confirmText: string;
    confirmColorScheme: 'green' | 'red';
  }
> = {
  accept: {
    title: (label) => `Accept this ${label} proposal?`,
    body: (label, name) =>
      `This will create the ${label} "${name}" in your space and mark the proposal as applied.`,
    confirmText: 'Accept',
    confirmColorScheme: 'green',
  },
  dismiss: {
    title: (label) => `Dismiss this ${label} proposal?`,
    body: (label, name) =>
      `The ${label} "${name}" won't be created and the proposal will be discarded.`,
    confirmText: 'Dismiss',
    confirmColorScheme: 'red',
  },
};

export function ConfirmCreationDecisionDialog({
  open,
  decision,
  artefactLabel,
  artefactName,
  isPending,
  onConfirm,
  onOpenChange,
}: Readonly<ConfirmCreationDecisionDialogProps>) {
  const copy = COPY[decision];

  return (
    <PMAlertDialog
      open={open}
      onOpenChange={(details) => onOpenChange(details.open)}
      title={copy.title(artefactLabel)}
      message={copy.body(artefactLabel, artefactName)}
      confirmText={copy.confirmText}
      confirmColorScheme={copy.confirmColorScheme}
      isLoading={isPending}
      onConfirm={onConfirm}
    />
  );
}
