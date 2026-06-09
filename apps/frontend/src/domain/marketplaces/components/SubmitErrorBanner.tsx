import { PMAlert } from '@packmind/ui';

export interface SubmitErrorBannerProps {
  /**
   * Human-readable error message, typically surfaced verbatim from the API via
   * `getSubmitErrorMessage`.
   */
  message: string;
}

/**
 * Error banner for the link-marketplace flow. Displays the message produced by
 * `getSubmitErrorMessage` — usually the backend's own error detail — under a
 * fixed title, so the user always sees why the link failed.
 */
export const SubmitErrorBanner = ({
  message,
}: Readonly<SubmitErrorBannerProps>) => (
  <PMAlert.Root status="error" role="alert" data-testid="submit-error-banner">
    <PMAlert.Indicator />
    <PMAlert.Title>Unable to link marketplace</PMAlert.Title>
    <PMAlert.Description>{message}</PMAlert.Description>
  </PMAlert.Root>
);
