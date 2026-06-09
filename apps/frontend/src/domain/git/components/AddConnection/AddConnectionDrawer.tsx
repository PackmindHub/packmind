import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_FEATURE_DOMAIN_MAP,
  GITHUB_APP_FEATURE_KEY,
  isFeatureFlagEnabled,
  PMAlert,
  PMBox,
  PMButton,
  PMCloseButton,
  PMDrawer,
  PMField,
  PMHStack,
  PMHeading,
  PMIcon,
  PMInput,
  PMPortal,
  PMSegmentGroup,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { OrganizationId } from '@packmind/types';
import {
  LuChevronDown,
  LuChevronRight,
  LuGithub,
  LuGitlab,
} from 'react-icons/lu';
import { useGetMeQuery } from '../../../accounts/api/queries/UserQueries';
import { useCreateGitProviderMutation } from '../../api/queries';
import {
  CreateGitProviderForm,
  GitProviderUI,
} from '../../types/GitProviderTypes';
import { extractErrorMessage } from '../../utils/errorUtils';
import { GitHubAppAuthBlock } from './GitHubAppAuthBlock';
import { PatAuthBlock, SupportedVendor } from './PatAuthBlock';

const DISPLAY_NAME_MAX_LENGTH = 64;

type AddConnectionDrawerProps = {
  organizationId: OrganizationId;
  open: boolean;
  onClose: () => void;
  onSuccess?: (provider: GitProviderUI) => void;
};

const VENDOR_DEFAULTS: Record<SupportedVendor, { url: string; label: string }> =
  {
    github: { url: 'https://github.com', label: 'GitHub' },
    gitlab: { url: 'https://gitlab.com', label: 'GitLab' },
  };

const isValidUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

export const AddConnectionDrawer: React.FC<AddConnectionDrawerProps> = ({
  organizationId,
  open,
  onClose,
  onSuccess,
}) => {
  const { data: me } = useGetMeQuery();
  const userEmail = me?.authenticated ? me.user?.email : null;
  const githubAppMode: 'on-prem' | 'shared' =
    me?.authenticated && me.organization
      ? me.organization.githubAppMode
      : 'on-prem';
  const githubAppEnabled = isFeatureFlagEnabled({
    featureKeys: [GITHUB_APP_FEATURE_KEY],
    featureDomainMap: DEFAULT_FEATURE_DOMAIN_MAP,
    userEmail,
  });

  const [vendor, setVendor] = useState<SupportedVendor>('github');
  const [instanceUrl, setInstanceUrl] = useState<string>(
    VENDOR_DEFAULTS.github.url,
  );
  const [authMethod, setAuthMethod] = useState<'app' | 'pat'>('app');
  const [patValue, setPatValue] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [patDisclosureOpen, setPatDisclosureOpen] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [patError, setPatError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const createMutation = useCreateGitProviderMutation();

  const showAppPath = vendor === 'github' && githubAppEnabled;

  const reset = useCallback(() => {
    setVendor('github');
    setInstanceUrl(VENDOR_DEFAULTS.github.url);
    setAuthMethod('app');
    setPatValue('');
    setDisplayName('');
    setPatDisclosureOpen(false);
    setUrlError(null);
    setPatError(null);
    setSubmitError(null);
  }, []);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const handleVendorChange = useCallback(
    (next: SupportedVendor) => {
      setVendor(next);
      setInstanceUrl(VENDOR_DEFAULTS[next].url);
      // GitHub keeps App-first when allowed; GitLab + non-allowlisted = PAT.
      setAuthMethod(next === 'github' && githubAppEnabled ? 'app' : 'pat');
      setPatValue('');
      setPatDisclosureOpen(false);
      setUrlError(null);
      setPatError(null);
      setSubmitError(null);
    },
    [githubAppEnabled],
  );

  const handleInstanceUrlChange = (next: string) => {
    setInstanceUrl(next);
    setUrlError(null);
    setSubmitError(null);
  };

  const handlePatChange = (next: string) => {
    setPatValue(next);
    setPatError(null);
    setSubmitError(null);
  };

  const validateUrl = useCallback((): boolean => {
    const trimmed = instanceUrl.trim();
    if (!trimmed) {
      setUrlError('Instance URL is required.');
      return false;
    }
    if (!isValidUrl(trimmed)) {
      setUrlError('Enter a valid URL, e.g. https://github.com.');
      return false;
    }
    return true;
  }, [instanceUrl]);

  const openPatDisclosure = useCallback(() => {
    setAuthMethod('pat');
    setPatDisclosureOpen(true);
  }, []);

  const closePatDisclosure = useCallback(() => {
    setAuthMethod('app');
    setPatValue('');
    setPatDisclosureOpen(false);
    setPatError(null);
  }, []);

  const patActive =
    showAppPath && authMethod === 'pat' && patValue.trim().length > 0;
  const showAppBlock = showAppPath && !patActive;
  const showPatDisclosure = showAppPath;

  const handlePatSubmit = useCallback(async () => {
    if (!validateUrl()) return;
    if (patValue.trim().length < 10) {
      setPatError('Token must be at least 10 characters.');
      return;
    }
    setSubmitError(null);
    try {
      const data: CreateGitProviderForm = {
        source: vendor,
        token: patValue.trim(),
        url: instanceUrl.trim(),
        displayName: displayName.trim(),
      };
      const provider = await createMutation.mutateAsync({ data });
      onSuccess?.(provider);
      onClose();
    } catch (error) {
      setSubmitError(
        extractErrorMessage(
          error,
          'Failed to save connection. Please try again.',
        ),
      );
    }
  }, [
    validateUrl,
    patValue,
    vendor,
    instanceUrl,
    displayName,
    createMutation,
    onSuccess,
    onClose,
  ]);

  const inPatMode = !showAppPath || authMethod === 'pat';
  const canSubmitPat = useMemo(() => {
    if (!inPatMode) return false;
    if (!instanceUrl.trim() || urlError) return false;
    return patValue.trim().length >= 10;
  }, [inPatMode, instanceUrl, urlError, patValue]);

  return (
    <PMDrawer.Root
      open={open}
      onOpenChange={(e) => {
        if (!e.open) onClose();
      }}
      placement="end"
      size="md"
    >
      <PMPortal>
        <PMDrawer.Backdrop />
        <PMDrawer.Positioner>
          <PMDrawer.Content>
            <PMDrawer.Header
              borderBottom="1px solid"
              borderColor="border.tertiary"
            >
              <PMVStack gap={1} align="stretch" flex={1}>
                <PMHeading size="md">Add connection</PMHeading>
                <PMText fontSize="xs" color="faded">
                  Grant Packmind access to your repos. You can connect more
                  repos later from this connection.
                </PMText>
              </PMVStack>
              <PMDrawer.CloseTrigger asChild>
                <PMCloseButton size="sm" />
              </PMDrawer.CloseTrigger>
            </PMDrawer.Header>

            <PMDrawer.Body padding={5}>
              <PMVStack gap={6} align="stretch">
                <VendorSection vendor={vendor} onChange={handleVendorChange} />

                <UrlSection
                  vendor={vendor}
                  value={instanceUrl}
                  error={urlError}
                  onChange={handleInstanceUrlChange}
                  onBlur={validateUrl}
                />

                <DisplayNameSection
                  vendor={vendor}
                  value={displayName}
                  onChange={setDisplayName}
                />

                <SectionDivider />

                <PMVStack gap={3} align="stretch">
                  <SectionLabel>Authentication</SectionLabel>

                  {!showAppPath && (
                    <>
                      {vendor === 'gitlab' && (
                        <PMText fontSize="xs" color="secondary">
                          GitLab connections use a personal access token.
                          Generate one from your GitLab account settings.
                        </PMText>
                      )}
                      <PatAuthBlock
                        vendor={vendor}
                        value={patValue}
                        error={patError}
                        disabled={createMutation.isPending}
                        onChange={handlePatChange}
                      />
                    </>
                  )}

                  {showAppPath && showAppBlock && (
                    <GitHubAppAuthBlock
                      organizationId={organizationId}
                      githubAppMode={githubAppMode}
                    />
                  )}

                  {showPatDisclosure && (
                    <PatDisclosure
                      open={patDisclosureOpen || patActive}
                      patActive={patActive}
                      onOpen={openPatDisclosure}
                      onClose={closePatDisclosure}
                    >
                      <PatAuthBlock
                        vendor="github"
                        value={patValue}
                        error={patError}
                        disabled={createMutation.isPending}
                        onChange={handlePatChange}
                      />
                    </PatDisclosure>
                  )}
                </PMVStack>

                {submitError && (
                  <PMAlert.Root status="error">
                    <PMAlert.Indicator />
                    <PMAlert.Content>
                      <PMAlert.Title>Couldn't add connection</PMAlert.Title>
                      <PMAlert.Description>{submitError}</PMAlert.Description>
                    </PMAlert.Content>
                  </PMAlert.Root>
                )}
              </PMVStack>
            </PMDrawer.Body>

            <PMBox
              borderTop="1px solid"
              borderColor="border.tertiary"
              paddingX={5}
              paddingY={3}
            >
              <PMHStack justify="space-between" align="center">
                <PMButton variant="tertiary" size="sm" onClick={onClose}>
                  Cancel
                </PMButton>
                {inPatMode && (
                  <PMButton
                    variant="primary"
                    size="sm"
                    onClick={handlePatSubmit}
                    loading={createMutation.isPending}
                    disabled={!canSubmitPat || createMutation.isPending}
                  >
                    Add connection
                  </PMButton>
                )}
              </PMHStack>
            </PMBox>
          </PMDrawer.Content>
        </PMDrawer.Positioner>
      </PMPortal>
    </PMDrawer.Root>
  );
};

type VendorSectionProps = {
  vendor: SupportedVendor;
  onChange: (next: SupportedVendor) => void;
};

const VendorSection: React.FC<VendorSectionProps> = ({ vendor, onChange }) => {
  return (
    <PMVStack gap={2} align="stretch">
      <SectionLabel>Vendor</SectionLabel>
      <PMBox alignSelf="flex-start">
        <PMSegmentGroup.Root
          size="sm"
          value={vendor}
          onValueChange={(e) => onChange(e.value as SupportedVendor)}
        >
          <PMSegmentGroup.Indicator bg="background.tertiary" />
          {(['github', 'gitlab'] as SupportedVendor[]).map((v) => (
            <PMSegmentGroup.Item
              key={v}
              value={v}
              _checked={{ color: 'text.primary' }}
            >
              <PMHStack gap={2} align="center" paddingX={1}>
                <PMIcon fontSize="sm">
                  {v === 'github' ? <LuGithub /> : <LuGitlab />}
                </PMIcon>
                <PMSegmentGroup.ItemText>
                  {VENDOR_DEFAULTS[v].label}
                </PMSegmentGroup.ItemText>
              </PMHStack>
              <PMSegmentGroup.ItemHiddenInput />
            </PMSegmentGroup.Item>
          ))}
        </PMSegmentGroup.Root>
      </PMBox>
    </PMVStack>
  );
};

type UrlSectionProps = {
  vendor: SupportedVendor;
  value: string;
  error: string | null;
  onChange: (next: string) => void;
  onBlur: () => void;
};

const UrlSection: React.FC<UrlSectionProps> = ({
  vendor,
  value,
  error,
  onChange,
  onBlur,
}) => {
  const helper =
    vendor === 'github'
      ? 'Use https://github.com for github.com, or your GitHub Enterprise host.'
      : 'Use https://gitlab.com for gitlab.com, or your self-managed host.';

  return (
    <PMVStack gap={2} align="stretch">
      <SectionLabel>Instance URL</SectionLabel>
      <PMField.Root required invalid={!!error}>
        <PMInput
          size="sm"
          type="url"
          value={value}
          placeholder={VENDOR_DEFAULTS[vendor].url}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          autoComplete="off"
          spellCheck={false}
          maxLength={200}
        />
        {error ? (
          <PMField.ErrorText>{error}</PMField.ErrorText>
        ) : (
          <PMField.HelperText>{helper}</PMField.HelperText>
        )}
      </PMField.Root>
    </PMVStack>
  );
};

type DisplayNameSectionProps = {
  vendor: SupportedVendor;
  value: string;
  onChange: (next: string) => void;
};

const DisplayNameSection: React.FC<DisplayNameSectionProps> = ({
  vendor,
  value,
  onChange,
}) => {
  const vendorLabel = VENDOR_DEFAULTS[vendor].label;
  return (
    <PMVStack gap={2} align="stretch">
      <SectionLabel>Display name</SectionLabel>
      <PMField.Root>
        <PMInput
          size="sm"
          value={value}
          placeholder={`e.g. Production ${vendorLabel}`}
          onChange={(e) =>
            onChange(e.target.value.slice(0, DISPLAY_NAME_MAX_LENGTH))
          }
          autoComplete="off"
          spellCheck={false}
          maxLength={DISPLAY_NAME_MAX_LENGTH}
        />
        <PMField.HelperText>
          {`Optional. Leave blank and we'll call it "Unnamed ${vendorLabel} connection".`}
        </PMField.HelperText>
      </PMField.Root>
    </PMVStack>
  );
};

type PatDisclosureProps = {
  open: boolean;
  patActive: boolean;
  onOpen: () => void;
  onClose: () => void;
  children: React.ReactNode;
};

const PatDisclosure: React.FC<PatDisclosureProps> = ({
  open,
  patActive,
  onOpen,
  onClose,
  children,
}) => {
  const triggerLabel = patActive
    ? 'Use the GitHub App instead'
    : open
      ? 'Hide personal access token'
      : 'Use a personal access token instead';
  const triggerIcon = patActive ? (
    <LuChevronRight />
  ) : open ? (
    <LuChevronDown />
  ) : (
    <LuChevronRight />
  );

  return (
    <PMBox>
      <PMBox
        as="button"
        onClick={open ? onClose : onOpen}
        bg="transparent"
        border="none"
        padding={0}
        cursor="pointer"
        textAlign="left"
        _hover={{ color: 'text.primary' }}
      >
        <PMHStack gap={1} align="center">
          <PMIcon fontSize="xs" color="text.secondary">
            {triggerIcon}
          </PMIcon>
          <PMText fontSize="xs" color="secondary">
            {triggerLabel}
          </PMText>
        </PMHStack>
      </PMBox>
      {open && (
        <PMBox
          marginTop={3}
          paddingLeft={4}
          borderLeft="1px solid"
          borderColor="border.tertiary"
        >
          {children}
          {!patActive && (
            <PMText fontSize="xs" color="faded" marginTop={2}>
              Tokens don't rotate automatically. Prefer the GitHub App when you
              can.
            </PMText>
          )}
        </PMBox>
      )}
    </PMBox>
  );
};

const SectionDivider: React.FC = () => (
  <PMBox height="1px" bg="border.tertiary" width="full" role="presentation" />
);

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <PMText
    fontSize="xs"
    color="faded"
    textTransform="uppercase"
    letterSpacing="wider"
    fontWeight="semibold"
  >
    {children}
  </PMText>
);
