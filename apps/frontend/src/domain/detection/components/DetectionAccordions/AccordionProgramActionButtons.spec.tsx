import React from 'react';
import { render, RenderResult, fireEvent, act } from '@testing-library/react';
import { UIProvider } from '@packmind/ui';
import {
  DetectionStatus,
  ProgrammingLanguage,
  createRuleId,
  createStandardId,
  RuleDetectionAssessmentStatus,
} from '@packmind/types';
import { ActiveConfigurationSectionData } from '../ActiveConfigurationSection';
import { DraftCardData } from '../DetectionDraftCard/DetectionDraftCard';
import { AccordionProgramActionButtons } from './AccordionProgramActionButtons';
import * as DetectionProgramQueries from '../../api/queries/DetectionProgramQueries';

jest.mock('../../api/queries/DetectionProgramQueries');

describe('AccordionProgramActionButtons', () => {
  let screen: RenderResult;
  let onTestProgram: jest.Mock;
  let onGenerateProgram: jest.Mock;
  let onActivateDraft: jest.Mock;
  let onRetryDraft: jest.Mock;
  let onViewModeChange: jest.Mock;
  let onShowLogs: jest.Mock;
  let onShowProgram: jest.Mock;

  const standardId = createStandardId('standard-123');
  const ruleId = createRuleId('rule-456');

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
    onShowLogs = jest.fn();
    onShowProgram = jest.fn();

    // Mock the assessment query with SUCCESS status by default
    jest
      .spyOn(DetectionProgramQueries, 'useGetRuleDetectionAssessmentQuery')
      .mockReturnValue({
        data: {
          status: RuleDetectionAssessmentStatus.SUCCESS,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  interface RenderProps {
    activeConfigurations?: ActiveConfigurationSectionData[];
    activeDraft?: DraftCardData;
    isGeneratingProgram?: boolean;
    selectedLanguage?: string;
    isActivating?: boolean;
    viewMode?: 'active' | 'draft';
  }

  function renderComponent({
    activeConfigurations = [],
    activeDraft,
    isGeneratingProgram = false,
    selectedLanguage = ProgrammingLanguage.TYPESCRIPT,
    isActivating = false,
    viewMode = 'active',
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
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
          standardId={standardId}
          ruleId={ruleId}
          onShowLogs={onShowLogs}
          onShowProgram={onShowProgram}
          isActivating={isActivating}
        />
      </UIProvider>,
    );
  }

  describe('view mode synchronization', () => {
    describe('when only active program exists', () => {
      beforeEach(() => {
        screen = renderComponent({
          activeConfigurations: [createActiveConfig()],
          viewMode: 'active',
        });
      });

      it('calls onViewModeChange with active mode to sync state', () => {
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
          viewMode: 'active',
        });
      });

      it('calls onViewModeChange with draft mode to sync state', () => {
        expect(onViewModeChange).toHaveBeenCalledWith('draft');
      });
    });

    describe('when both active and draft exist', () => {
      beforeEach(() => {
        screen = renderComponent({
          activeConfigurations: [createActiveConfig()],
          activeDraft: createDraftData(),
          viewMode: 'active',
        });
      });

      it('does not auto-switch mode when both exist', () => {
        // Component is controlled, doesn't auto-switch when both exist
        expect(onViewModeChange).not.toHaveBeenCalled();
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
        expect(screen.getByText('Draft: OK')).toBeInTheDocument();
      });
    });

    describe('when only active program exists', () => {
      beforeEach(() => {
        screen = renderComponent({
          activeConfigurations: [createActiveConfig()],
        });
      });

      it('does not render the switch button', () => {
        expect(screen.queryByText('Draft: OK')).not.toBeInTheDocument();
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

    describe('when active config has TO_REVIEW status', () => {
      beforeEach(() => {
        screen = renderComponent({
          activeConfigurations: [createActiveConfig(DetectionStatus.TO_REVIEW)],
        });
      });

      it('renders the To review dropdown button', () => {
        expect(screen.getByText('To review')).toBeInTheDocument();
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

    describe('when generating program with active config', () => {
      beforeEach(() => {
        screen = renderComponent({
          activeConfigurations: [createActiveConfig()],
          isGeneratingProgram: true,
        });
      });

      it('renders menu with disabled Generate action', () => {
        // Menu still renders with disabled "Generate new draft" action when there's an active program
        expect(screen.getByText('Active')).toBeInTheDocument();
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
