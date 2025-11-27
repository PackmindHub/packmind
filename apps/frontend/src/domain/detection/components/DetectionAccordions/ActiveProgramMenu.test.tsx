import React from 'react';
import {
  render,
  RenderResult,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import {
  DetectionStatus,
  ProgrammingLanguage,
  createRuleId,
} from '@packmind/types';
import { ActiveProgramMenu } from './ActiveProgramMenu';
import { ActiveConfigurationSectionData } from '../ActiveConfigurationSection';
import { UIProvider } from '@packmind/ui';

describe('ActiveProgramMenu', () => {
  let screen: RenderResult;
  let onTestProgram: jest.Mock;
  let onGenerateProgram: jest.Mock;
  let onShowDetails: jest.Mock;

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

  beforeEach(() => {
    onTestProgram = jest.fn();
    onGenerateProgram = jest.fn();
    onShowDetails = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  interface RenderProps {
    activeConfigurations?: ActiveConfigurationSectionData[];
    isGeneratingProgram?: boolean;
    selectedLanguage?: string;
  }

  function renderComponent({
    activeConfigurations = [],
    isGeneratingProgram = false,
    selectedLanguage = ProgrammingLanguage.TYPESCRIPT,
  }: RenderProps = {}) {
    return render(
      <UIProvider>
        <ActiveProgramMenu
          activeConfigurations={activeConfigurations}
          onTestProgram={onTestProgram}
          onShowDetails={onShowDetails}
          onGenerateProgram={onGenerateProgram}
          isGeneratingProgram={isGeneratingProgram}
          selectedLanguage={selectedLanguage}
        />
      </UIProvider>,
    );
  }

  describe('menu label', () => {
    describe('when config status is READY', () => {
      beforeEach(() => {
        screen = renderComponent({
          activeConfigurations: [createActiveConfig(DetectionStatus.READY)],
        });
      });

      it('displays "Active" label', () => {
        expect(screen.getByText('Active')).toBeInTheDocument();
      });
    });

    describe('when config status is TO_REVIEW', () => {
      beforeEach(() => {
        screen = renderComponent({
          activeConfigurations: [createActiveConfig(DetectionStatus.TO_REVIEW)],
        });
      });

      it('displays "To review" label', () => {
        expect(screen.getByText('To review')).toBeInTheDocument();
      });
    });

    describe('when no active program exists but not generating', () => {
      beforeEach(() => {
        screen = renderComponent({
          activeConfigurations: [
            { ...createActiveConfig(), detectionProgram: null },
          ],
          isGeneratingProgram: false,
        });
      });

      it('displays "Active" label for Generate action', () => {
        expect(screen.getByText('Active')).toBeInTheDocument();
      });
    });
  });

  describe('menu visibility', () => {
    describe('when generating and no detection program', () => {
      beforeEach(() => {
        screen = renderComponent({
          activeConfigurations: [
            { ...createActiveConfig(), detectionProgram: null },
          ],
          isGeneratingProgram: true,
        });
      });

      it('does not render menu when generating without active program', () => {
        // Menu should not render when there's no active program and we're generating
        expect(screen.queryByText('Active')).not.toBeInTheDocument();
      });
    });
  });

  describe('menu actions', () => {
    describe('when config has READY status', () => {
      beforeEach(() => {
        screen = renderComponent({
          activeConfigurations: [createActiveConfig(DetectionStatus.READY)],
          isGeneratingProgram: false,
        });
      });

      it('shows "Test program", "Generation details" and "Generate new draft" actions', async () => {
        const trigger = screen.getByText('Active');
        fireEvent.click(trigger);

        await waitFor(() => {
          expect(screen.getByText('Test program')).toBeInTheDocument();
          expect(screen.getByText('Generation details')).toBeInTheDocument();
          expect(screen.getByText('Generate new draft')).toBeInTheDocument();
        });
      });

      it('calls onTestProgram when "Test program" is clicked', async () => {
        const trigger = screen.getByText('Active');
        fireEvent.click(trigger);

        await waitFor(() => {
          const testItem = screen.getByText('Test program');
          fireEvent.click(testItem);
        });

        expect(onTestProgram).toHaveBeenCalled();
      });

      it('calls onGenerateProgram when "Generate new draft" is clicked', async () => {
        const trigger = screen.getByText('Active');
        fireEvent.click(trigger);

        await waitFor(() => {
          const generateItem = screen.getByText('Generate new draft');
          fireEvent.click(generateItem);
        });

        expect(onGenerateProgram).toHaveBeenCalledWith(
          ProgrammingLanguage.TYPESCRIPT,
        );
      });
    });

    describe('when config has TO_REVIEW status', () => {
      beforeEach(() => {
        screen = renderComponent({
          activeConfigurations: [createActiveConfig(DetectionStatus.TO_REVIEW)],
          isGeneratingProgram: false,
        });
      });

      it('shows "Generation details" and "Generate new draft" actions (no Test for TO_REVIEW)', async () => {
        const trigger = screen.getByText('To review');
        fireEvent.click(trigger);

        await waitFor(() => {
          expect(screen.queryByText('Test program')).not.toBeInTheDocument();
          expect(screen.getByText('Generation details')).toBeInTheDocument();
          expect(screen.getByText('Generate new draft')).toBeInTheDocument();
        });
      });
    });

    describe('when generating program', () => {
      beforeEach(() => {
        screen = renderComponent({
          activeConfigurations: [createActiveConfig(DetectionStatus.READY)],
          isGeneratingProgram: true,
        });
      });

      it('shows "Generate new draft" action as disabled', async () => {
        const trigger = screen.getByText('Active');
        fireEvent.click(trigger);

        await waitFor(() => {
          expect(screen.getByText('Test program')).toBeInTheDocument();
          const generateItem = screen.getByText('Generate new draft');
          expect(generateItem).toBeInTheDocument();
          expect(generateItem.closest('[data-disabled]')).toBeInTheDocument();
        });
      });
    });
  });
});
