import React, { useCallback, useEffect, useState } from 'react';
import {
  PMAlert,
  PMEmptyState,
  PMFlex,
  PMPageSection,
  PMSpinner,
} from '@packmind/ui';
import {
  ActiveConfigurationCard,
  ActiveConfigurationCardData,
} from './ActiveConfigurationCard';
import { DraftCardData } from './DetectionDraftCard/DetectionDraftCard';
import { DetectionAssessmentDrawer } from './DetectionAssessmentDrawer';

const LoadingState = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => (
  <PMEmptyState icon={<PMSpinner />} title={title} description={description} />
);

const ErrorState = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => (
  <PMAlert.Root status="error">
    <PMAlert.Indicator />
    <PMAlert.Title>{title}</PMAlert.Title>
    <PMAlert.Description>{description}</PMAlert.Description>
  </PMAlert.Root>
);

interface ActiveConfigurationSectionProps {
  configurations: ActiveConfigurationCardData[];
  isLoading: boolean;
  isError: boolean;
  onGenerateProgram: (language?: string) => void;
  isGeneratingProgram: boolean;
  standardId: string;
  ruleId: string;
  onTestProgram: (program: ActiveConfigurationCardData) => void;
  onActivateDraft: (draft: DraftCardData) => void;
  activatingDraftId: string | null;
  isActivatingDraft: boolean;
}

export const ActiveConfigurationSection: React.FC<
  ActiveConfigurationSectionProps
> = ({
  configurations,
  isLoading,
  isError,
  onGenerateProgram,
  isGeneratingProgram,
  standardId,
  ruleId,
  onTestProgram,
  onActivateDraft,
  activatingDraftId,
  isActivatingDraft,
}) => {
  const [openDrawerLanguage, setOpenDrawerLanguage] = useState<string | null>(
    null,
  );

  const handleOpenAssessmentDrawer = useCallback((language: string) => {
    setOpenDrawerLanguage(language);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setOpenDrawerLanguage(null);
  }, []);

  useEffect(() => {
    if (openDrawerLanguage) {
      const languageExists = configurations.some(
        (c) => c.language === openDrawerLanguage,
      );

      if (!languageExists) {
        setOpenDrawerLanguage(null);
      }
    }
  }, [configurations, openDrawerLanguage]);

  if (isLoading) {
    return (
      <PMPageSection variant="outline">
        <LoadingState
          title="Loading detection programs"
          description="Please wait while we fetch the latest configurations."
        />
      </PMPageSection>
    );
  }

  if (isError) {
    return (
      <PMPageSection variant="outline">
        <ErrorState
          title="Unable to load detection programs"
          description="Try again later or regenerate the program from the CLI."
        />
      </PMPageSection>
    );
  }

  if (configurations.length === 0) {
    return (
      <PMPageSection variant="outline">
        <PMEmptyState
          title="No configurations yet"
          description="Generate a detection program to start configuring this rule."
        />
      </PMPageSection>
    );
  }

  return (
    <>
      <PMPageSection variant="outline">
        <PMFlex gap={4} wrap="wrap">
          {configurations.map((config) => (
            <ActiveConfigurationCard
              key={config.id}
              configuration={config}
              onGenerateProgram={onGenerateProgram}
              isGenerating={isGeneratingProgram}
              standardId={standardId}
              ruleId={ruleId}
              onTestProgram={onTestProgram}
              onActivateDraft={onActivateDraft}
              activatingDraftId={activatingDraftId}
              isActivatingDraft={isActivatingDraft}
              onOpenAssessmentDrawer={handleOpenAssessmentDrawer}
            />
          ))}
        </PMFlex>
      </PMPageSection>
      <DetectionAssessmentDrawer
        isOpen={openDrawerLanguage !== null}
        onClose={handleCloseDrawer}
        standardId={standardId}
        ruleId={ruleId}
        language={openDrawerLanguage}
      />
    </>
  );
};
