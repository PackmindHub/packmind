import { PMBox, PMHStack, PMIcon, PMText, PMVStack } from '@packmind/ui';
import { LuCheck } from 'react-icons/lu';
import type { StepId, StepMeta, StepStatus } from '../types';

interface StepSpineProps {
  steps: StepMeta[];
  statusById: Record<StepId, StepStatus>;
  selectedId: StepId;
  onSelect: (id: StepId) => void;
}

const STATUS_LABEL: Record<StepStatus, string> = {
  done: 'Done',
  active: 'Now',
  pending: 'Next',
};

// The vertical spine: outcome-led steps with live state. Text + symbol carry
// status, never color alone. Flat, tonal, periwinkle for the active step.
export function StepSpine({
  steps,
  statusById,
  selectedId,
  onSelect,
}: Readonly<StepSpineProps>) {
  return (
    <PMVStack gap={0} align="stretch">
      {steps.map((step, index) => {
        const status = statusById[step.id];
        const isLast = index === steps.length - 1;
        const isSelected = step.id === selectedId;
        const interactive = status !== 'pending';

        return (
          <PMHStack
            key={step.id}
            role={interactive ? 'button' : undefined}
            tabIndex={interactive ? 0 : undefined}
            onClick={interactive ? () => onSelect(step.id) : undefined}
            onKeyDown={
              interactive
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelect(step.id);
                    }
                  }
                : undefined
            }
            align="stretch"
            gap={3}
            textAlign="left"
            bg={isSelected ? 'background.tertiary' : 'transparent'}
            borderRadius="md"
            paddingY={3}
            paddingX={3}
            cursor={interactive ? 'pointer' : 'default'}
            transition="background 150ms ease-out"
            _hover={
              interactive && !isSelected
                ? { bg: 'background.secondary' }
                : undefined
            }
            opacity={status === 'pending' ? 0.55 : 1}
          >
            <Indicator status={status} index={index} isLast={isLast} />
            <PMBox flex={1} minW={0} paddingBottom={isLast ? 0 : 2}>
              <PMHStack justify="space-between" align="baseline" gap={2}>
                <PMText
                  fontSize="sm"
                  fontWeight="medium"
                  color={status === 'pending' ? 'tertiary' : 'primary'}
                >
                  {step.title}
                </PMText>
                <PMBox
                  as="span"
                  fontSize="xs"
                  fontWeight="medium"
                  flexShrink={0}
                  color={
                    status === 'done'
                      ? 'text.success'
                      : status === 'active'
                        ? 'branding.primary'
                        : 'text.faded'
                  }
                >
                  {STATUS_LABEL[status]}
                </PMBox>
              </PMHStack>
              <PMText fontSize="xs" color="tertiary" mt={1}>
                {step.outcome}
              </PMText>
            </PMBox>
          </PMHStack>
        );
      })}
    </PMVStack>
  );
}

function Indicator({
  status,
  index,
  isLast,
}: Readonly<{ status: StepStatus; index: number; isLast: boolean }>) {
  return (
    <PMVStack gap={0} align="center" flexShrink={0} width="22px">
      <PMBox
        width="22px"
        height="22px"
        borderRadius="full"
        display="flex"
        alignItems="center"
        justifyContent="center"
        flexShrink={0}
        bg={status === 'done' ? 'green.500' : 'transparent'}
        borderWidth={status === 'done' ? '0' : '1.5px'}
        borderColor={
          status === 'active' ? 'branding.primary' : 'border.checkbox'
        }
      >
        {status === 'done' ? (
          <PMIcon fontSize="2xs" color="background.primary">
            <LuCheck />
          </PMIcon>
        ) : (
          <PMBox
            width={status === 'active' ? '8px' : '6px'}
            height={status === 'active' ? '8px' : '6px'}
            borderRadius="full"
            bg={status === 'active' ? 'branding.primary' : 'text.faded'}
          />
        )}
      </PMBox>
      {!isLast && (
        <PMBox
          flex={1}
          width="1.5px"
          minHeight="28px"
          bg={status === 'done' ? 'green.500' : 'border.tertiary'}
          opacity={status === 'done' ? 0.5 : 1}
        />
      )}
      <VisuallyHiddenIndex index={index} />
    </PMVStack>
  );
}

// Keeps a stable DOM order hint for screen readers without showing a number.
function VisuallyHiddenIndex({ index }: Readonly<{ index: number }>) {
  return (
    <PMBox
      as="span"
      position="absolute"
      width="1px"
      height="1px"
      overflow="hidden"
      clipPath="inset(50%)"
    >
      {`Step ${index + 1}`}
    </PMBox>
  );
}
