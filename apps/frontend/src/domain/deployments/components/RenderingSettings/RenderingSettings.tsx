import * as React from 'react';
import {
  PMAlert,
  PMButton,
  PMButtonGroup,
  PMCheckboxCard,
  PMCheckboxGroup,
  PMGrid,
  PMGridItem,
  PMVStack,
  pmToaster,
} from '@packmind/ui';
import { RenderMode } from '@packmind/types';
import {
  useGetRenderModeConfigurationQuery,
  useUpdateRenderModeConfigurationMutation,
} from '../../api/queries/DeploymentsQueries';

type RenderingItem = {
  value: string;
  name: string;
  checked: boolean;
  disabled?: boolean;
};

const RENDER_MODE_TO_VALUE: Record<RenderMode, string> = {
  [RenderMode.PACKMIND]: 'packmind',
  [RenderMode.AGENTS_MD]: 'agents-md',
  [RenderMode.GH_COPILOT]: 'github-copilot',
  [RenderMode.CURSOR]: 'cursor',
  [RenderMode.CLAUDE]: 'claude',
  [RenderMode.JUNIE]: 'junie',
  [RenderMode.GITLAB_DUO]: 'gitlab_duo',
  [RenderMode.CONTINUE]: 'continue',
};

const VALUE_TO_RENDER_MODE: Record<string, RenderMode> = {
  packmind: RenderMode.PACKMIND,
  'agents-md': RenderMode.AGENTS_MD,
  'github-copilot': RenderMode.GH_COPILOT,
  cursor: RenderMode.CURSOR,
  claude: RenderMode.CLAUDE,
  junie: RenderMode.JUNIE,
  gitlab_duo: RenderMode.GITLAB_DUO,
  continue: RenderMode.CONTINUE,
};

const DEFAULT_FORMATS: RenderingItem[] = [
  { value: 'packmind', name: 'Packmind', checked: true, disabled: true },
  { value: 'agents-md', name: 'AGENTS.md', checked: true },
  { value: 'github-copilot', name: 'Github Copilot', checked: false },
  { value: 'cursor', name: 'Cursor', checked: false },
  { value: 'claude', name: 'Claude Code', checked: false },
  { value: 'junie', name: 'Junie', checked: false },
  { value: 'gitlab_duo', name: 'Gitlab Duo', checked: false },
  { value: 'continue', name: 'Continue', checked: false },
];

type RenderingSettingsContextValue = {
  renderFormats: RenderingItem[];
  selectedValues: string[];
  isLoading: boolean;
  isSaving: boolean;
  shouldShowNoConfigurationAlert: boolean;
  onFormatsChange: (values: string[]) => void;
  onReset: () => void;
  onSave: () => void;
};

const RenderingSettingsContext =
  React.createContext<RenderingSettingsContextValue | null>(null);

export const useRenderingSettings = () => {
  const context = React.useContext(RenderingSettingsContext);
  if (!context) {
    throw new Error(
      'useRenderingSettings must be used within <RenderingSettings>',
    );
  }
  return context;
};

interface RenderingSettingsProps {
  children?: React.ReactNode;
}

const RenderingSettingsComponent: React.FC<RenderingSettingsProps> = ({
  children,
}) => {
  const { data: configData, isLoading } = useGetRenderModeConfigurationQuery();
  const updateMutation = useUpdateRenderModeConfigurationMutation();
  const { isPending: isSaving } = updateMutation;

  const initialFormats: RenderingItem[] = React.useMemo(() => {
    if (!configData?.configuration) {
      return DEFAULT_FORMATS;
    }

    const activeValues = new Set(
      configData.configuration.activeRenderModes.map(
        (mode) => RENDER_MODE_TO_VALUE[mode],
      ),
    );

    return DEFAULT_FORMATS.map((format) => ({
      ...format,
      checked: activeValues.has(format.value),
    }));
  }, [configData]);

  const [renderFormats, setRenderFormats] =
    React.useState<RenderingItem[]>(initialFormats);

  React.useEffect(() => {
    setRenderFormats(initialFormats);
  }, [initialFormats]);

  const selectedValues = React.useMemo(
    () => renderFormats.filter((f) => f.checked).map((f) => f.value),
    [renderFormats],
  );

  const handleFormatsChange = React.useCallback((values: string[]) => {
    setRenderFormats((prev) => {
      const locked = new Set(
        prev.filter((f) => f.disabled && f.checked).map((f) => f.value),
      );
      const next = new Set(values);
      locked.forEach((value) => next.add(value));

      return prev.map((f) => ({ ...f, checked: next.has(f.value) }));
    });
  }, []);

  const handleReset = React.useCallback(() => {
    setRenderFormats(initialFormats.map((f) => ({ ...f })));
  }, [initialFormats]);

  const handleSave = React.useCallback(() => {
    const activeRenderModes = selectedValues
      .map((value) => VALUE_TO_RENDER_MODE[value])
      .filter((mode): mode is RenderMode => mode !== undefined);

    updateMutation.mutate(
      { activeRenderModes },
      {
        onSuccess: () => {
          pmToaster.create({
            title: 'Success',
            description: 'Rendering settings updated successfully',
            type: 'success',
          });
        },
        onError: (error) => {
          pmToaster.create({
            title: 'Error',
            description:
              error instanceof Error
                ? error.message
                : 'Failed to update rendering settings',
            type: 'error',
          });
        },
      },
    );
  }, [selectedValues, updateMutation]);

  const contextValue = React.useMemo(
    (): RenderingSettingsContextValue => ({
      renderFormats,
      selectedValues,
      isLoading,
      isSaving,
      shouldShowNoConfigurationAlert: !configData?.configuration && !isLoading,
      onFormatsChange: handleFormatsChange,
      onReset: handleReset,
      onSave: handleSave,
    }),
    [
      renderFormats,
      selectedValues,
      isLoading,
      isSaving,
      configData?.configuration,
      handleFormatsChange,
      handleReset,
      handleSave,
    ],
  );

  return (
    <RenderingSettingsContext.Provider value={contextValue}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        {children ?? <RenderingSettingsDefaultLayout />}
      </form>
    </RenderingSettingsContext.Provider>
  );
};

function RenderingSettingsBody() {
  const {
    renderFormats,
    selectedValues,
    shouldShowNoConfigurationAlert,
    onFormatsChange,
  } = useRenderingSettings();

  return (
    <PMVStack gap={6} align="stretch">
      {shouldShowNoConfigurationAlert && (
        <PMAlert.Root status="info">
          <PMAlert.Indicator />
          <PMAlert.Content>
            <PMAlert.Title>No configuration yet</PMAlert.Title>
            <PMAlert.Description>
              Deployments will default to Packmind and AGENTS.md formats until
              you save your preferences.
            </PMAlert.Description>
          </PMAlert.Content>
        </PMAlert.Root>
      )}
      <PMCheckboxGroup value={selectedValues} onValueChange={onFormatsChange}>
        <RenderingFormatsGrid formats={renderFormats} />
      </PMCheckboxGroup>
    </PMVStack>
  );
}

function RenderingSettingsCta() {
  const { isLoading, isSaving, onReset, onSave } = useRenderingSettings();

  return (
    <PMButtonGroup>
      <PMButton
        variant="tertiary"
        type="button"
        onClick={onReset}
        disabled={isLoading || isSaving}
      >
        Reset
      </PMButton>
      <PMButton
        type="button"
        onClick={onSave}
        loading={isSaving}
        disabled={isLoading}
      >
        Save changes
      </PMButton>
    </PMButtonGroup>
  );
}

function RenderingSettingsDefaultLayout() {
  return (
    <PMVStack gap={6} align="stretch">
      <RenderingSettingsBody />
      <RenderingSettingsCta />
    </PMVStack>
  );
}

export function RenderingFormatsGrid({
  formats,
}: Readonly<{
  formats: ReadonlyArray<RenderingItem>;
}>) {
  return (
    <PMGrid gap={4} templateColumns="repeat(auto-fit, minmax(150px, 1fr))">
      {formats.map((format) => (
        <PMGridItem key={format.value}>
          <PMCheckboxCard.Root
            colorPalette="blue"
            value={format.value}
            variant={'surface'}
            disabled={format.disabled}
          >
            <PMCheckboxCard.HiddenInput />
            <PMCheckboxCard.Control>
              <PMCheckboxCard.Content>
                <PMCheckboxCard.Label>{format.name}</PMCheckboxCard.Label>
              </PMCheckboxCard.Content>
              <PMCheckboxCard.Indicator />
            </PMCheckboxCard.Control>
          </PMCheckboxCard.Root>
        </PMGridItem>
      ))}
    </PMGrid>
  );
}

export const RenderingSettings =
  RenderingSettingsComponent as React.FC<RenderingSettingsProps> & {
    Body: typeof RenderingSettingsBody;
    Cta: typeof RenderingSettingsCta;
  };

RenderingSettings.Body = RenderingSettingsBody;
RenderingSettings.Cta = RenderingSettingsCta;
