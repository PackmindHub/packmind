import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
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
import {
  LuChevronDown,
  LuChevronRight,
  LuGithub,
  LuGitlab,
  LuTriangleAlert,
} from 'react-icons/lu';
import type {
  AddConnectionDraft,
  Edition,
  UserConnection,
  Vendor,
} from '../../types';
import { GitHubAppAuthBlock } from './GitHubAppAuthBlock';
import { PatAuthBlock } from './PatAuthBlock';

type AddConnectionDrawerProps = {
  open: boolean;
  edition: Edition;
  existingInstances: string[];
  onClose: () => void;
  onSubmit: (connection: UserConnection) => void;
};

const VENDOR_DEFAULTS: Record<Vendor, { url: string; label: string }> = {
  github: { url: 'https://github.com', label: 'GitHub' },
  gitlab: { url: 'https://gitlab.com', label: 'GitLab' },
};

const INITIAL_DRAFT: AddConnectionDraft = {
  vendor: 'github',
  instanceUrl: VENDOR_DEFAULTS.github.url,
  displayName: '',
  authMethod: 'app',
  patValue: '',
  patPermissionsAcknowledged: false,
  appRegistration: 'idle',
  appInstall: 'idle',
  appConnectedIdentifier: null,
  submit: 'idle',
  submitError: null,
};

export function AddConnectionDrawer({
  open,
  edition,
  existingInstances,
  onClose,
  onSubmit,
}: Readonly<AddConnectionDrawerProps>) {
  const [draft, setDraft] = useState<AddConnectionDraft>(INITIAL_DRAFT);
  const [patDisclosureOpen, setPatDisclosureOpen] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [patError, setPatError] = useState<string | null>(null);
  const timers = useRef<number[]>([]);

  const reset = useCallback(() => {
    setDraft(INITIAL_DRAFT);
    setPatDisclosureOpen(false);
    setUrlError(null);
    setPatError(null);
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  }, []);

  useEffect(() => {
    if (!open) reset();
    return () => {
      timers.current.forEach((t) => window.clearTimeout(t));
    };
  }, [open, reset]);

  const setVendor = useCallback((next: Vendor) => {
    setDraft((prev) => ({
      ...prev,
      vendor: next,
      instanceUrl: VENDOR_DEFAULTS[next].url,
      authMethod: next === 'gitlab' ? 'pat' : 'app',
      patValue: '',
      appRegistration: 'idle',
      appInstall: 'idle',
      appConnectedIdentifier: null,
      submitError: null,
    }));
    setPatDisclosureOpen(false);
    setUrlError(null);
    setPatError(null);
  }, []);

  const setInstanceUrl = useCallback((next: string) => {
    setDraft((prev) => ({ ...prev, instanceUrl: next, submitError: null }));
    setUrlError(null);
  }, []);

  const setDisplayName = useCallback((next: string) => {
    setDraft((prev) => ({ ...prev, displayName: next, submitError: null }));
  }, []);

  const setPat = useCallback((next: string) => {
    setDraft((prev) => ({ ...prev, patValue: next, submitError: null }));
    setPatError(null);
  }, []);

  const openPatDisclosure = useCallback(() => {
    setDraft((prev) => ({ ...prev, authMethod: 'pat' }));
    setPatDisclosureOpen(true);
  }, []);

  const closePatDisclosure = useCallback(() => {
    setDraft((prev) => ({ ...prev, authMethod: 'app', patValue: '' }));
    setPatDisclosureOpen(false);
    setPatError(null);
  }, []);

  const handleRegister = useCallback(() => {
    setDraft((prev) => ({ ...prev, appRegistration: 'registering' }));
    const id = window.setTimeout(() => {
      setDraft((prev) => ({ ...prev, appRegistration: 'registered' }));
    }, 1100);
    timers.current.push(id);
  }, []);

  const handleInstall = useCallback(() => {
    setDraft((prev) => ({ ...prev, appInstall: 'installing' }));
    const id = window.setTimeout(() => {
      const host = safeHost(draft.instanceUrl);
      setDraft((prev) => ({
        ...prev,
        authMethod: 'app',
        appInstall: 'installed',
        appConnectedIdentifier: `${host}/acme-engineering`,
        patValue: '',
      }));
      setPatDisclosureOpen(false);
      setPatError(null);
    }, 1300);
    timers.current.push(id);
  }, [draft.instanceUrl]);

  const handleChangeInstall = useCallback(() => {
    setDraft((prev) => ({
      ...prev,
      appInstall: 'idle',
      appConnectedIdentifier: null,
    }));
  }, []);

  const instanceCollision = useMemo(() => {
    if (urlError) return false;
    if (!draft.instanceUrl.trim()) return false;
    return existingInstances.some(
      (existing) => normalize(existing) === normalize(draft.instanceUrl),
    );
  }, [draft.instanceUrl, existingInstances, urlError]);

  const canSubmit = useMemo(() => {
    if (!draft.instanceUrl.trim()) return false;
    if (urlError) return false;
    if (draft.authMethod === 'app') {
      return draft.appInstall === 'installed';
    }
    return draft.patValue.trim().length >= 10;
  }, [draft, urlError]);

  const validateUrl = useCallback(() => {
    const trimmed = draft.instanceUrl.trim();
    if (!trimmed) {
      setUrlError('Instance URL is required.');
      return false;
    }
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        setUrlError('Use an http:// or https:// URL.');
        return false;
      }
    } catch {
      setUrlError('Enter a valid URL, e.g. https://github.com.');
      return false;
    }
    return true;
  }, [draft.instanceUrl]);

  const handleSubmit = useCallback(() => {
    if (!validateUrl()) return;
    if (draft.authMethod === 'pat' && draft.patValue.trim().length < 10) {
      setPatError('Token must be at least 10 characters.');
      return;
    }

    setDraft((prev) => ({ ...prev, submit: 'submitting', submitError: null }));
    const id = window.setTimeout(() => {
      const host = safeHost(draft.instanceUrl);
      const identifier =
        draft.appConnectedIdentifier ?? `${host}/acme-engineering`;
      onSubmit({
        id: `cnx_${Math.random().toString(36).slice(2, 9)}`,
        vendor: draft.vendor,
        authMethod: draft.authMethod,
        displayName: draft.displayName.trim(),
        identifier,
        status: 'connected',
        lastPushAt: null,
        lastCheckedAt: new Date().toISOString(),
        installedBy: 'You',
        installedAt: new Date().toISOString().slice(0, 10),
        repos: [],
        availableRepos: [],
      });
    }, 900);
    timers.current.push(id);
  }, [draft, onSubmit, validateUrl]);

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
                <VendorSection vendor={draft.vendor} onChange={setVendor} />

                <UrlSection
                  vendor={draft.vendor}
                  value={draft.instanceUrl}
                  error={urlError}
                  collision={instanceCollision}
                  onChange={setInstanceUrl}
                  onBlur={validateUrl}
                />

                <DisplayNameSection
                  vendor={draft.vendor}
                  value={draft.displayName}
                  instanceCollision={instanceCollision}
                  onChange={setDisplayName}
                />

                <SectionDivider />

                <AuthSection
                  draft={draft}
                  edition={edition}
                  patDisclosureOpen={patDisclosureOpen}
                  patError={patError}
                  onRegister={handleRegister}
                  onInstall={handleInstall}
                  onChangeInstall={handleChangeInstall}
                  onPatChange={setPat}
                  onOpenPatDisclosure={openPatDisclosure}
                  onClosePatDisclosure={closePatDisclosure}
                />

                {draft.submitError && (
                  <PMAlert.Root status="error">
                    <PMAlert.Indicator />
                    <PMAlert.Content>
                      <PMAlert.Title>Couldn't add connection</PMAlert.Title>
                      <PMAlert.Description>
                        {draft.submitError}
                      </PMAlert.Description>
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
                <PMButton
                  variant="primary"
                  size="sm"
                  onClick={handleSubmit}
                  loading={draft.submit === 'submitting'}
                  disabled={!canSubmit || draft.submit === 'submitting'}
                >
                  Add connection
                </PMButton>
              </PMHStack>
            </PMBox>
          </PMDrawer.Content>
        </PMDrawer.Positioner>
      </PMPortal>
    </PMDrawer.Root>
  );
}

type VendorSectionProps = {
  vendor: Vendor;
  onChange: (next: Vendor) => void;
};

function VendorSection({ vendor, onChange }: Readonly<VendorSectionProps>) {
  return (
    <PMVStack gap={2} align="stretch">
      <SectionLabel>Vendor</SectionLabel>
      <PMBox alignSelf="flex-start">
        <PMSegmentGroup.Root
          size="sm"
          value={vendor}
          onValueChange={(e) => onChange(e.value as Vendor)}
        >
          <PMSegmentGroup.Indicator bg="background.tertiary" />
          {(['github', 'gitlab'] as Vendor[]).map((v) => (
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
}

type UrlSectionProps = {
  vendor: Vendor;
  value: string;
  error: string | null;
  collision: boolean;
  onChange: (next: string) => void;
  onBlur: () => void;
};

function UrlSection({
  vendor,
  value,
  error,
  collision,
  onChange,
  onBlur,
}: Readonly<UrlSectionProps>) {
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
        ) : collision ? (
          <PMHStack gap={2} align="flex-start" marginTop={1.5}>
            <PMIcon fontSize="xs" color="yellow.500" marginTop={0.5}>
              <LuTriangleAlert />
            </PMIcon>
            <PMText fontSize="xs" textProps={{ color: 'yellow.500' }}>
              A connection already exists for this instance. You can add
              another, just give them distinct names so they're easy to tell
              apart.
            </PMText>
          </PMHStack>
        ) : (
          <PMField.HelperText>{helper}</PMField.HelperText>
        )}
      </PMField.Root>
    </PMVStack>
  );
}

type DisplayNameSectionProps = {
  vendor: Vendor;
  value: string;
  instanceCollision: boolean;
  onChange: (next: string) => void;
};

function DisplayNameSection({
  vendor,
  value,
  instanceCollision,
  onChange,
}: Readonly<DisplayNameSectionProps>) {
  const vendorLabel = VENDOR_DEFAULTS[vendor].label;
  return (
    <PMVStack gap={2} align="stretch">
      <SectionLabel>Display name</SectionLabel>
      <PMField.Root>
        <PMInput
          size="sm"
          value={value}
          placeholder={`e.g. Production ${vendorLabel}`}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          maxLength={80}
        />
        <PMField.HelperText>
          {instanceCollision
            ? `Recommended when several connections share this instance. Leave blank and we'll call it "Unnamed ${vendorLabel} connection".`
            : `Optional. Leave blank and we'll call it "Unnamed ${vendorLabel} connection".`}
        </PMField.HelperText>
      </PMField.Root>
    </PMVStack>
  );
}

type AuthSectionProps = {
  draft: AddConnectionDraft;
  edition: Edition;
  patDisclosureOpen: boolean;
  patError: string | null;
  onRegister: () => void;
  onInstall: () => void;
  onChangeInstall: () => void;
  onPatChange: (next: string) => void;
  onOpenPatDisclosure: () => void;
  onClosePatDisclosure: () => void;
};

function AuthSection({
  draft,
  edition,
  patDisclosureOpen,
  patError,
  onRegister,
  onInstall,
  onChangeInstall,
  onPatChange,
  onOpenPatDisclosure,
  onClosePatDisclosure,
}: Readonly<AuthSectionProps>) {
  if (draft.vendor === 'gitlab') {
    return (
      <PMVStack gap={3} align="stretch">
        <SectionLabel>Authentication</SectionLabel>
        <PMText fontSize="xs" color="secondary">
          GitLab connections use a personal access token. Generate one from your
          GitLab account settings.
        </PMText>
        <PatAuthBlock
          vendor="gitlab"
          value={draft.patValue}
          error={patError}
          disabled={draft.submit === 'submitting'}
          onChange={onPatChange}
        />
      </PMVStack>
    );
  }

  const patActive =
    draft.authMethod === 'pat' && draft.patValue.trim().length > 0;
  const showAppBlock = draft.appInstall === 'installed' || !patActive;

  return (
    <PMVStack gap={3} align="stretch">
      <SectionLabel>Authentication</SectionLabel>
      {showAppBlock && (
        <GitHubAppAuthBlock
          edition={edition}
          registration={draft.appRegistration}
          install={draft.appInstall}
          connectedIdentifier={draft.appConnectedIdentifier}
          onRegister={onRegister}
          onInstall={onInstall}
          onChangeInstall={onChangeInstall}
        />
      )}

      {draft.appInstall !== 'installed' && (
        <PatDisclosure
          open={patDisclosureOpen}
          patActive={patActive}
          onOpen={onOpenPatDisclosure}
          onClose={onClosePatDisclosure}
        >
          <PatAuthBlock
            vendor="github"
            value={draft.patValue}
            error={patError}
            disabled={draft.submit === 'submitting'}
            onChange={onPatChange}
          />
        </PatDisclosure>
      )}
    </PMVStack>
  );
}

type PatDisclosureProps = {
  open: boolean;
  patActive: boolean;
  onOpen: () => void;
  onClose: () => void;
  children: React.ReactNode;
};

function PatDisclosure({
  open,
  patActive,
  onOpen,
  onClose,
  children,
}: Readonly<PatDisclosureProps>) {
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
}

function SectionDivider() {
  return (
    <PMBox height="1px" bg="border.tertiary" width="full" role="presentation" />
  );
}

function SectionLabel({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
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
}

function safeHost(url: string): string {
  try {
    return new URL(url).host || 'github.com';
  } catch {
    return 'github.com';
  }
}

function normalize(url: string): string {
  return url.trim().replace(/\/+$/, '').toLowerCase();
}
