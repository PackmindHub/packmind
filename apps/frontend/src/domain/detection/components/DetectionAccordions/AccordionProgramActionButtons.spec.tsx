import React from 'react';
import { render, RenderResult, fireEvent } from '@testing-library/react';
import { UIProvider } from '@packmind/ui';
import {
  DetectionStatus,
  ProgrammingLanguage,
  createRuleId,
} from '@packmind/types';
import { ActiveConfigurationSectionData } from '../ActiveConfigurationSection';
import { DraftCardData } from '../DetectionDraftCard/DetectionDraftCard';
import { AccordionProgramActionButtons } from './AccordionProgramActionButtons';

describe('AccordionProgramActionButtons', () => {
  let screen: RenderResult;
  let onTestProgram: jest.Mock;
  let onGenerateProgram: jest.Mock;
  let onActivateDraft: jest.Mock;
  let onRetryDraft: jest.Mock;
  let onViewModeChange: jest.Mock;

  const createActiveConfig = (
    status: DetectionStatus = DetectionStatus.READY,
  ): ActiveConfigurationSectionData => ({
    id: 'config-123',
    language: ProgrammingLanguage.TYPESCRIPT,
    detectionProgram: {
      id: 'program-123',
      ruleId: createRuleId('rule-456'),
      language: ProgrammingLanguage.TYPESCRIPT,
      status,
      code: '',
      sourceCodeState: 'NONE' as const,
      version: 1,
      mode: 'singleAst',
    },
    draftProgram: null,
    state: 'ok' as any, // eslint-disable-line @typescript-eslint/no-explicit-any
  });

  const createDraftData = (
    status: DetectionStatus = DetectionStatus.READY,
  ): DraftCardData => ({
    id: 'draft-123',
    language: ProgrammingLanguage.TYPESCRIPT,
    activeDetectionProgramId: 'active-456',
    draftProgram: {
      id: 'draft-program-123',
      ruleId: createRuleId('rule-456'),
      language: ProgrammingLanguage.TYPESCRIPT,
      status,
      code: '',
      sourceCodeState: 'NONE' as const,
      version: 2,
      mode: 'singleAst',
    } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    status,
    mode: 'AI_GENERATION',
    version: 2,
  });

  beforeEach(() => {
    onTestProgram = jest.fn();
    onGenerateProgram = jest.fn();
    onActivateDraft = jest.fn();
    onRetryDraft = jest.fn();
    onViewModeChange = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  interface RenderProps {
    activeConfigurations?: ActiveConfigurationSectionData[];
    activeDraft?: DraftCardData;
    isGeneratingProgram?: boolean;
    selectedLanguage?: string;
  }

  function renderComponent({
    activeConfigurations = [],
    activeDraft,
    isGeneratingProgram = false,
    selectedLanguage = ProgrammingLanguage.TYPESCRIPT,
  }: RenderProps = {}) {
    return render(
      <UIProvider>
        <AccordionProgramActionButtons
          activeConfigurations={activeConfigurations}
          activeDraft={activeDraft}
          onTestProgram={onTestProgram}
          onGenerateProgram={onGenerateProgram}
          onActivateDraft={onActivateDraft}
          onRetryDraft={onRetryDraft}
          isGeneratingProgram={isGeneratingProgram}
          selectedLanguage={selectedLanguage}
          onViewModeChange={onViewModeChange}
        />
      </UIProvider>,
    );
  }

  describe('view mode initialization', () => {
    describe('when only active program exists', () => {
      beforeEach(() => {
        screen = renderComponent({
          activeConfigurations: [createActiveConfig()],
        });
      });

      it('calls onViewModeChange with active mode', () => {
        expect(onViewModeChange).toHaveBeenCalledWith('active');
      });
    });

    describe('when only draft exists', () => {
      beforeEach(() => {
        screen = renderComponent({
          activeConfigurations: [
            { ...createActiveConfig(), detectionProgram: null },
          ],
          activeDraft: createDraftData(),
        });
      });

      it('calls onViewModeChange with draft mode', () => {
        expect(onViewModeChange).toHaveBeenCalledWith('draft');
      });
    });

    describe('when both active and draft exist', () => {
      beforeEach(() => {
        screen = renderComponent({
          activeConfigurations: [createActiveConfig()],
          activeDraft: createDraftData(),
        });
      });

      it('calls onViewModeChange with active mode by default', () => {
        expect(onViewModeChange).toHaveBeenCalledWith('active');
      });
    });
  });

  describe('switch button visibility', () => {
    describe('when both active program and draft exist', () => {
      beforeEach(() => {
        screen = renderComponent({
          activeConfigurations: [createActiveConfig()],
          activeDraft: createDraftData(),
        });
      });

      it('renders the See draft switch button', () => {
        expect(screen.getByText('See draft')).toBeInTheDocument();
      });
    });

    describe('when only active program exists', () => {
      beforeEach(() => {
        screen = renderComponent({
          activeConfigurations: [createActiveConfig()],
        });
      });

      it('does not render the switch button', () => {
        expect(screen.queryByText('See draft')).not.toBeInTheDocument();
      });
    });

    describe('when only draft exists', () => {
      beforeEach(() => {
        screen = renderComponent({
          activeConfigurations: [
            { ...createActiveConfig(), detectionProgram: null },
          ],
          activeDraft: createDraftData(),
        });
      });

      it('does not render the switch button', () => {
        expect(screen.queryByText('See draft')).not.toBeInTheDocument();
      });
    });
  });

  describe('active dropdown', () => {
    describe('when active config has READY status', () => {
      beforeEach(() => {
        screen = renderComponent({
          activeConfigurations: [createActiveConfig(DetectionStatus.READY)],
        });
      });

      it('renders the Active dropdown button', () => {
        expect(screen.getByText('Active')).toBeInTheDocument();
      });
    });

    describe('when active config has ERROR status', () => {
      beforeEach(() => {
        screen = renderComponent({
          activeConfigurations: [createActiveConfig(DetectionStatus.ERROR)],
        });
      });

      it('does not render Test program action without READY config', () => {
        // Active dropdown won't render if there are no actions
        // Generate new draft would be the only action if not generating
        expect(screen.queryByText('Test program')).not.toBeInTheDocument();
      });
    });

    describe('when not generating program', () => {
      beforeEach(() => {
        screen = renderComponent({
          activeConfigurations: [createActiveConfig()],
          isGeneratingProgram: false,
        });
      });

      it('renders the Active dropdown button', () => {
        expect(screen.getByText('Active')).toBeInTheDocument();
      });
    });

    describe('when generating program', () => {
      beforeEach(() => {
        screen = renderComponent({
          activeConfigurations: [
            { ...createActiveConfig(), detectionProgram: null },
          ],
          isGeneratingProgram: true,
        });
      });

      it('does not render the Active dropdown when no actions available', () => {
        // When generating and no READY config, no actions are available
        expect(screen.queryByText('Active')).not.toBeInTheDocument();
      });
    });
  });

  describe('draft dropdown status labels', () => {
    describe('when draft status is READY', () => {
      beforeEach(() => {
        screen = renderComponent({
          activeConfigurations: [
            { ...createActiveConfig(), detectionProgram: null },
          ],
          activeDraft: createDraftData(DetectionStatus.READY),
        });
      });

      it('renders Draft: Ready label', () => {
        expect(screen.getByText('Draft: Ready')).toBeInTheDocument();
      });
    });

    describe('when draft status is ERROR', () => {
      beforeEach(() => {
        screen = renderComponent({
          activeConfigurations: [
            { ...createActiveConfig(), detectionProgram: null },
          ],
          activeDraft: createDraftData(DetectionStatus.ERROR),
        });
      });

      it('renders Draft: Error label', () => {
        expect(screen.getByText('Draft: Error')).toBeInTheDocument();
      });
    });

    describe('when draft status is FAILURE', () => {
      beforeEach(() => {
        screen = renderComponent({
          activeConfigurations: [
            { ...createActiveConfig(), detectionProgram: null },
          ],
          activeDraft: createDraftData(DetectionStatus.FAILURE),
        });
      });

      it('renders Draft: Failed label', () => {
        expect(screen.getByText('Draft: Failed')).toBeInTheDocument();
      });
    });

    describe('when draft status is IN_PROGRESS', () => {
      beforeEach(() => {
        screen = renderComponent({
          activeConfigurations: [
            { ...createActiveConfig(), detectionProgram: null },
          ],
          activeDraft: createDraftData(DetectionStatus.IN_PROGRESS),
        });
      });

      it('renders Draft: In progress label', () => {
        expect(screen.getByText('Draft: In progress')).toBeInTheDocument();
      });
    });
  });

  describe('toggle functionality', () => {
    describe('when clicking the switch button from active view', () => {
      beforeEach(() => {
        screen = renderComponent({
          activeConfigurations: [createActiveConfig()],
          activeDraft: createDraftData(),
        });
        fireEvent.click(screen.getByText('See draft'));
      });

      it('calls onViewModeChange with draft mode', () => {
        expect(onViewModeChange).toHaveBeenLastCalledWith('draft');
      });

      it('shows the Go back button', () => {
        expect(screen.getByText('Go back')).toBeInTheDocument();
      });
    });

    describe('when clicking the switch button from draft view', () => {
      beforeEach(() => {
        screen = renderComponent({
          activeConfigurations: [createActiveConfig()],
          activeDraft: createDraftData(),
        });
        // First click to go to draft
        fireEvent.click(screen.getByText('See draft'));
        // Second click to go back
        fireEvent.click(screen.getByText('Go back'));
      });

      it('calls onViewModeChange with active mode', () => {
        expect(onViewModeChange).toHaveBeenLastCalledWith('active');
      });

      it('shows the See draft button again', () => {
        expect(screen.getByText('See draft')).toBeInTheDocument();
      });
    });
  });

  describe('draft menu actions', () => {
    describe('when draft status is READY', () => {
      beforeEach(() => {
        screen = renderComponent({
          activeConfigurations: [
            { ...createActiveConfig(), detectionProgram: null },
          ],
          activeDraft: createDraftData(DetectionStatus.READY),
        });
      });

      it('renders the draft dropdown', () => {
        expect(screen.getByText('Draft: Ready')).toBeInTheDocument();
      });
    });

    describe('when draft status is ERROR', () => {
      beforeEach(() => {
        screen = renderComponent({
          activeConfigurations: [
            { ...createActiveConfig(), detectionProgram: null },
          ],
          activeDraft: createDraftData(DetectionStatus.ERROR),
        });
      });

      it('renders the draft dropdown with error status', () => {
        expect(screen.getByText('Draft: Error')).toBeInTheDocument();
      });
    });

    describe('when draft status is FAILURE', () => {
      beforeEach(() => {
        screen = renderComponent({
          activeConfigurations: [
            { ...createActiveConfig(), detectionProgram: null },
          ],
          activeDraft: createDraftData(DetectionStatus.FAILURE),
        });
      });

      it('renders the draft dropdown with failed status', () => {
        expect(screen.getByText('Draft: Failed')).toBeInTheDocument();
      });
    });
  });

  describe('when no active program and no draft', () => {
    beforeEach(() => {
      screen = renderComponent({
        activeConfigurations: [
          { ...createActiveConfig(), detectionProgram: null },
        ],
      });
    });

    it('renders Active dropdown with Generate new draft action', () => {
      // Even without READY active config, the dropdown shows for "Generate new draft"
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('does not render the switch button', () => {
      expect(screen.queryByText('See draft')).not.toBeInTheDocument();
    });
  });

  describe('when no active program, no draft, and generating', () => {
    beforeEach(() => {
      screen = renderComponent({
        activeConfigurations: [
          { ...createActiveConfig(), detectionProgram: null },
        ],
        isGeneratingProgram: true,
      });
    });

    it('does not render the Active dropdown', () => {
      expect(screen.queryByText('Active')).not.toBeInTheDocument();
    });
  });
});
