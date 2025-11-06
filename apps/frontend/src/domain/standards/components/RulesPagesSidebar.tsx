import { Rule, Standard } from '@packmind/types';
import { PMVStack, PMLink, PMBox } from '@packmind/ui';
import { RulesList } from './RulesList';
import { NavLink } from 'react-router';

interface RulesPagesSidebarProps {
  standard?: Standard;
  rulesData?: Rule[];
  isLoading: boolean;
  isError: boolean;
}

export const RulesPagesSidebar: React.FC<RulesPagesSidebarProps> = ({
  standard,
  rulesData,
  isLoading,
  isError,
}) => {
  return (
    <PMVStack
      alignItems={'stretch'}
      borderRight={'solid 1px'}
      borderColor={'border.tertiary'}
      height={'full'}
      overflow={'auto'}
      gap={0}
    >
      <PMBox
        padding={4}
        borderBottom={'solid 1px'}
        borderColor={'border.tertiary'}
      >
        <PMLink asChild>
          <NavLink to=".."> &lt; {standard?.name}</NavLink>
        </PMLink>
      </PMBox>
      <PMBox minH={0} flex="1 1 auto" overflow={'auto'}>
        <RulesList rules={rulesData} isLoading={isLoading} isError={isError} />
      </PMBox>
    </PMVStack>
  );
};
