import {
  ActiveConfigurationCard,
  ActiveConfigurationCardData,
  ActiveConfigurationCardProps,
  ActiveConfigurationState,
} from './ActiveConfigurationCard';
import { render, RenderResult } from '@testing-library/react';
import {
  QueryClient,
  QueryClientProvider,
  UseQueryResult,
} from '@tanstack/react-query';
import * as DetectionProgramQueries from '../../../domain/detection/api/queries/DetectionProgramQueries';
import {
  createDetectionProgramId,
  createRuleDetectionAssessmentId,
  createRuleId,
  createStandardId,
  DetectionModeEnum,
  DetectionStatus,
  ProgrammingLanguage,
  RuleDetectionAssessment,
  RuleDetectionAssessmentStatus,
} from '@packmind/types';
import React from 'react';
import { UIProvider } from '@packmind/ui';
import userEvent from '@testing-library/user-event';

jest.mock('../../../domain/detection');

describe('ActivateConfigurationCard', () => {
  let configuration: ActiveConfigurationCardData;
  let props: ActiveConfigurationCardProps;
  let screen: RenderResult;

  beforeEach(() => {
    configuration = {
      id: 'some-random-id',
      language: 'typescript',
      detectionProgram: undefined,
      draftProgram: undefined,
      state: ActiveConfigurationState.OK,
    };

    props = {
      configuration,
      onTestProgram: jest.fn(),
      ruleId: createRuleId('rule-id'),
      standardId: createStandardId('standard-id'),
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const queryClient = new QueryClient();

  function renderWithContext() {
    return render(
      <UIProvider>
        <QueryClientProvider client={queryClient}>
          <ActiveConfigurationCard {...props} />
        </QueryClientProvider>
      </UIProvider>,
    );
  }

  describe('when there is no configuration for the rule', () => {
    beforeEach(() => {
      configuration.state = ActiveConfigurationState.NO_CONFIG;
    });

    describe('when assessment is not available', () => {
      beforeEach(() => {
        jest
          .spyOn(DetectionProgramQueries, 'useGetRuleDetectionAssessmentQuery')
          .mockReturnValue({ data: undefined } as Partial<
            UseQueryResult<RuleDetectionAssessment | null>
          > as UseQueryResult<RuleDetectionAssessment | null>);

        screen = renderWithContext();
      });

      it('shows a "Loading assessment data" message', () => {
        expect(
          screen.getByText('Loading assessment data.'),
        ).toBeInTheDocument();
      });
    });

    describe('when assessment is available', () => {
      let ruleDetectionAssessment: RuleDetectionAssessment;

      beforeEach(() => {
        ruleDetectionAssessment = {
          id: createRuleDetectionAssessmentId('assessment-id'),
          details: '',
          detectionMode: DetectionModeEnum.SINGLE_AST,
          language: ProgrammingLanguage.TYPESCRIPT,
          ruleId: createRuleId(props.ruleId),
          status: RuleDetectionAssessmentStatus.NOT_STARTED,
          clarificationAnswers: [],
          clarificationQuestion: '',
        };

        jest
          .spyOn(DetectionProgramQueries, 'useGetRuleDetectionAssessmentQuery')
          .mockReturnValue({ data: ruleDetectionAssessment } as Partial<
            UseQueryResult<RuleDetectionAssessment | null>
          > as UseQueryResult<RuleDetectionAssessment | null>);
      });

      describe('when assessment is in progress', () => {
        beforeEach(() => {
          ruleDetectionAssessment.status =
            RuleDetectionAssessmentStatus.IN_PROGRESS;
          ruleDetectionAssessment.details = 'Assessment in progress';

          screen = renderWithContext();
        });

        it('shows an "Assessment in progress" message', () => {
          expect(
            screen.getByText('Assessment in progress'),
          ).toBeInTheDocument();
        });

        it('does not show a configure button', () => {
          expect(screen.queryByText('Configure')).not.toBeInTheDocument();
        });
      });

      describe('when assessment has failed', () => {
        beforeEach(() => {
          ruleDetectionAssessment.status = RuleDetectionAssessmentStatus.FAILED;
          ruleDetectionAssessment.details =
            'Some reasons why this can not be automated';

          screen = renderWithContext();
        });

        it('shows a "This rule can not be automated" message', () => {
          expect(
            screen.getByText('This rule can not be automated.'),
          ).toBeInTheDocument();
        });

        it('shows a tooltip why the rule can not be automated', async () => {
          const user = userEvent.setup();
          const icon = screen.container.querySelector('svg');
          await user.hover(icon!);

          expect(
            await screen.findByText(ruleDetectionAssessment.details),
          ).toBeInTheDocument();
        });
      });

      describe('when assessment is done', () => {
        let onGenerateProgramSpy: jest.Mock;

        beforeEach(() => {
          ruleDetectionAssessment.status =
            RuleDetectionAssessmentStatus.SUCCESS;
          onGenerateProgramSpy = jest.fn();
          props.onGenerateProgram = onGenerateProgramSpy;

          screen = renderWithContext();
        });

        it('shows a "No configuration" message', () => {
          expect(screen.getByText('No configuration.')).toBeInTheDocument();
        });

        it('shows a button to start configuration', async () => {
          const user = userEvent.setup();
          const button = screen.getByText('Configure');

          await user.click(button);

          expect(onGenerateProgramSpy).toHaveBeenCalledWith(
            configuration.language,
          );
        });
      });
    });
  });

  describe('when a configuration is available', () => {
    beforeEach(() => {
      configuration.detectionProgram = {
        code: '',
        createdAt: undefined,
        id: createDetectionProgramId('123'),
        language: ProgrammingLanguage.TYPESCRIPT,
        mode: DetectionModeEnum.SINGLE_AST,
        ruleId: createRuleId('456'),
        status: DetectionStatus.READY,
        sourceCodeState: 'AST',
        version: 5,
      };
    });

    describe('when configuration is in progress', () => {
      beforeEach(() => {
        configuration.state = ActiveConfigurationState.IN_PROGRESS;

        screen = renderWithContext();
      });

      it('shows a "Configuration in progress" message', () => {
        expect(
          screen.getByText('Configuration in progress.'),
        ).toBeInTheDocument();
      });
    });

    describe('when configuration needs review', () => {
      let onTestProgramSpy: jest.Mock;
      let onGenerateProgramSpy: jest.Mock;
      let onActivateDraft: jest.Mock;

      beforeEach(() => {
        configuration.state = ActiveConfigurationState.TO_REVIEW;
        onTestProgramSpy = jest.fn();
        props.onTestProgram = onTestProgramSpy;
        onGenerateProgramSpy = jest.fn();
        props.onGenerateProgram = onGenerateProgramSpy;
        onActivateDraft = jest.fn();
        props.onActivateDraft = onActivateDraft;

        screen = renderWithContext();
      });

      it('shows a "To review" badge', () => {
        expect(screen.getByText('To review')).toBeInTheDocument();
      });

      it('shows the current program version', () => {
        expect(screen.getByText('Version 5')).toBeInTheDocument();
      });

      it('shows a "Test program" menu action', async () => {
        const user = userEvent.setup();

        await user.click(screen.getAllByRole('button')[0]);
        await user.click(screen.getByText('Test program'));

        expect(onTestProgramSpy).toHaveBeenCalled();
      });

      describe('when there are no draft', () => {
        beforeEach(() => {
          configuration.detectionProgram = null;

          screen = renderWithContext();
        });

        it('shows a "New draft" button', async () => {
          const user = userEvent.setup();
          await user.click(screen.getAllByText('New draft')[0]);

          expect(onGenerateProgramSpy).toHaveBeenCalledWith(
            configuration.language,
          );
        });
      });

      describe('when there is a successful draft', () => {
        beforeEach(() => {
          configuration.draftProgram = {
            code: '',
            createdAt: undefined,
            id: createDetectionProgramId('some-draft-id'),
            language: ProgrammingLanguage.TYPESCRIPT,
            mode: DetectionModeEnum.SINGLE_AST,
            ruleId: createRuleId('some-rule-id'),
            sourceCodeState: 'AST',
            status: DetectionStatus.READY,
            version: 0,
          };

          screen = renderWithContext();
        });

        it('shows a "Activate draft" button', async () => {
          const user = userEvent.setup();
          await user.click(screen.getByText('Activate draft'));

          expect(onActivateDraft).toHaveBeenCalled();
        });
      });

      describe('when there is a draft to-review', () => {
        beforeEach(() => {
          configuration.draftProgram = {
            code: '',
            createdAt: undefined,
            id: createDetectionProgramId('some-draft-id'),
            language: ProgrammingLanguage.TYPESCRIPT,
            mode: DetectionModeEnum.SINGLE_AST,
            ruleId: createRuleId('some-rule-id'),
            sourceCodeState: 'AST',
            status: DetectionStatus.TO_REVIEW,
            version: 0,
          };

          screen = renderWithContext();
        });

        it('shows an "Update draft" button', async () => {
          const user = userEvent.setup();
          await user.click(screen.getByText('Update draft'));

          expect(onGenerateProgramSpy).toHaveBeenCalledWith(
            configuration.language,
          );
        });
      });

      describe('when there is a draft neither ok nor to review', () => {
        beforeEach(() => {
          configuration.draftProgram = {
            code: '',
            createdAt: undefined,
            id: createDetectionProgramId('some-draft-id'),
            language: ProgrammingLanguage.TYPESCRIPT,
            mode: DetectionModeEnum.SINGLE_AST,
            ruleId: createRuleId('some-rule-id'),
            sourceCodeState: 'AST',
            status: DetectionStatus.ERROR,
            version: 0,
          };

          screen = renderWithContext();
        });

        it('shows an "Retry draft" button', async () => {
          const user = userEvent.setup();
          await user.click(screen.getByText('Retry draft'));

          expect(onGenerateProgramSpy).toHaveBeenCalledWith(
            configuration.language,
          );
        });
      });
    });

    describe('when configuration is ok', () => {
      let onTestProgramSpy: jest.Mock;

      beforeEach(() => {
        configuration.state = ActiveConfigurationState.OK;

        onTestProgramSpy = jest.fn();
        props.onTestProgram = onTestProgramSpy;

        screen = renderWithContext();
      });

      it('shows a "OK" badge', () => {
        expect(screen.getByText('OK')).toBeInTheDocument();
      });

      it('shows the current program version', () => {
        expect(screen.getByText('Version 5')).toBeInTheDocument();
      });

      it('shows a "Test program" menu action', async () => {
        const user = userEvent.setup();

        await user.click(screen.getByRole('button'));
        await user.click(screen.getByText('Test program'));

        expect(onTestProgramSpy).toHaveBeenCalled();
      });
    });
  });
});
