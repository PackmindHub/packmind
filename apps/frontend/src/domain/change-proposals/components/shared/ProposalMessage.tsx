import { PMText } from '@packmind/ui';

interface ProposalMessageProps {
  message: string | undefined;
}

export function ProposalMessage({ message }: Readonly<ProposalMessageProps>) {
  if (!message) return null;

  return (
    <PMText fontSize="sm" fontStyle="italic" color="secondary">
      {message}
    </PMText>
  );
}
