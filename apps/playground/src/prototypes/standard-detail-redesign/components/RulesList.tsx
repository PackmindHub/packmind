import { PMBox, PMText, PMVStack } from '@packmind/ui';
import {
  LuChevronRight,
  LuShield,
  LuShieldCheck,
  LuShieldAlert,
} from 'react-icons/lu';
import { LinterStatus, MockRule } from '../types';

type RulesListProps = {
  rules: MockRule[];
  onRuleClick: (ruleId: string) => void;
};

const SHIELD_CONFIG: Record<
  LinterStatus,
  { icon: typeof LuShield; color: string; title: string }
> = {
  active: {
    icon: LuShieldCheck,
    color: 'green.400',
    title: 'Linter active',
  },
  draft: {
    icon: LuShieldAlert,
    color: 'yellow.400',
    title: 'Linter draft',
  },
  'not-configured': {
    icon: LuShield,
    color: 'transparent',
    title: '',
  },
};

export function RulesList({ rules, onRuleClick }: RulesListProps) {
  return (
    <PMVStack gap={0} align="stretch">
      {rules.map((rule, index) => {
        const shield = SHIELD_CONFIG[rule.linterStatus];
        const ShieldIcon = shield.icon;
        const showShield = rule.linterStatus !== 'not-configured';

        return (
          <PMBox
            key={rule.id}
            as="button"
            onClick={() => onRuleClick(rule.id)}
            display="flex"
            alignItems="center"
            gap={3}
            padding={3}
            cursor="pointer"
            borderRadius="md"
            textAlign="left"
            background="none"
            border="none"
            width="full"
            _hover={{ backgroundColor: 'background.secondary' }}
            transition="background-color 0.15s"
          >
            <PMText
              fontSize="sm"
              color="secondary"
              fontWeight="medium"
              flexShrink={0}
              minWidth="24px"
            >
              {index + 1}.
            </PMText>

            <PMText
              fontSize="sm"
              color="primary"
              lineHeight="tall"
              flex={1}
              minWidth={0}
            >
              {rule.content}
            </PMText>

            {showShield && (
              <PMBox color={shield.color} flexShrink={0} title={shield.title}>
                <ShieldIcon size={16} />
              </PMBox>
            )}

            <PMBox color="secondary" flexShrink={0}>
              <LuChevronRight size={14} />
            </PMBox>
          </PMBox>
        );
      })}
    </PMVStack>
  );
}
