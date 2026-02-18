import { PMAlert, PMText } from '@packmind/ui';
import { ChangeProposalId } from '@packmind/types';

interface ConflictWarningProps {
  conflictingAcceptedNumbers: { id: ChangeProposalId; number: number }[];
  onSelectConflicting: (id: ChangeProposalId) => void;
}

export function ConflictWarning({
  conflictingAcceptedNumbers,
  onSelectConflicting,
}: Readonly<ConflictWarningProps>) {
  return (
    <PMAlert.Root status="error" size="sm" alignItems="center">
      <PMAlert.Indicator />
      <PMAlert.Title fontSize="xs">
        Conflicts with{' '}
        {conflictingAcceptedNumbers.map((item, index) => (
          <PMText
            key={item.id}
            as="span"
            cursor="pointer"
            textDecoration="underline"
            fontWeight="bold"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onSelectConflicting(item.id);
            }}
          >
            #{item.number}
            {index < conflictingAcceptedNumbers.length - 1 ? ', ' : ''}
          </PMText>
        ))}
      </PMAlert.Title>
    </PMAlert.Root>
  );
}
