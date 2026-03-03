import { Link } from 'react-router';
import { PMAlert, PMLink } from '@packmind/ui';
import { SubmittedState } from '../types';

interface SubmissionBannerProps {
  submittedState: SubmittedState;
  artefactLabel: string;
}

export function SubmissionBanner({
  submittedState,
  artefactLabel,
}: SubmissionBannerProps) {
  const capitalised =
    artefactLabel.charAt(0).toUpperCase() + artefactLabel.slice(1);

  if (submittedState.type === 'accepted') {
    return (
      <PMAlert.Root status="success">
        <PMAlert.Indicator />
        <PMAlert.Content>
          <PMAlert.Title>{capitalised} created</PMAlert.Title>
          <PMAlert.Description>
            The new {artefactLabel} has been added to your space.{' '}
            <PMLink asChild>
              <Link to={submittedState.artefactUrl}>View {artefactLabel}</Link>
            </PMLink>
          </PMAlert.Description>
        </PMAlert.Content>
      </PMAlert.Root>
    );
  }

  return (
    <PMAlert.Root status="info">
      <PMAlert.Indicator />
      <PMAlert.Content>
        <PMAlert.Title>Proposal rejected</PMAlert.Title>
        <PMAlert.Description>
          This creation proposal has been rejected.
        </PMAlert.Description>
      </PMAlert.Content>
    </PMAlert.Root>
  );
}
