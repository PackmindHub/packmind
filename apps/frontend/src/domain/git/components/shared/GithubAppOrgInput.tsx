import React from 'react';
import validator from 'validator';
import { PMInput, PMText, PMVStack } from '@packmind/ui';

// Empty means the app is registered under the user's personal account.
// Otherwise the value must look like a GitHub org slug (matches the backend
// guard in GitProvidersService); GitHub itself is the real validator.
export const isGithubOrgValid = (githubOrg: string): boolean => {
  const trimmed = githubOrg.trim();
  return trimmed.length === 0 || validator.isSlug(trimmed.toLowerCase());
};

export const githubOrgForRegistration = (
  githubOrg: string,
): string | undefined => githubOrg.trim() || undefined;

type GithubAppOrgInputProps = {
  githubOrg: string;
  onGithubOrgChange: (githubOrg: string) => void;
  disabled?: boolean;
};

export const GithubAppOrgInput: React.FC<GithubAppOrgInputProps> = ({
  githubOrg,
  onGithubOrgChange,
  disabled = false,
}) => {
  const showValidationMessage = !isGithubOrgValid(githubOrg);

  return (
    <PMVStack gap={1} align="stretch">
      <PMText fontSize="xs" color="secondary">
        GitHub organization (optional)
      </PMText>
      <PMInput
        size="sm"
        placeholder="e.g., my-company"
        value={githubOrg}
        onChange={(e) => onGithubOrgChange(e.target.value)}
        disabled={disabled}
        aria-label="GitHub organization"
        data-testid="github-app-org-input"
      />
      {showValidationMessage ? (
        <PMText fontSize="xs" color="error">
          Enter a valid organization slug (letters, numbers, and hyphens)
        </PMText>
      ) : (
        <PMText fontSize="xs" color="faded">
          Leave empty to register the app under your personal account. To use an
          organization, enter its slug — you must be one of its owners.
        </PMText>
      )}
    </PMVStack>
  );
};
