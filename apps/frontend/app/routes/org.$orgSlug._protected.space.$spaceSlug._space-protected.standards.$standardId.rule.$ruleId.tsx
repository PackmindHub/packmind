import { useEffect } from 'react';
import { PMText } from '@packmind/ui';
import { useOutletContext, useParams } from 'react-router';
import { StandardDetailsOutletContext } from '../../src/domain/standards/components/StandardDetails';
import { RuleDetails } from '../../src/domain/rules/components';

export default function StandardDetailRuleRouteModule() {
  const { ruleId } = useParams<{ ruleId: string }>();
  const { standard, rules, rulesLoading, rulesError } =
    useOutletContext<StandardDetailsOutletContext>();

  useEffect(() => {
    const allElements = Array.from(document.querySelectorAll('*'));
    let scrollableElement: HTMLElement | null = null;

    for (const element of allElements) {
      const { overflowY, overflow } = window.getComputedStyle(element);
      const isScrollable =
        overflowY === 'auto' ||
        overflowY === 'scroll' ||
        overflow === 'auto' ||
        overflow === 'scroll';

      if (isScrollable && element.scrollHeight > element.clientHeight) {
        scrollableElement = element as HTMLElement;
        break;
      }
    }

    if (scrollableElement) {
      scrollableElement.scrollTop = 0;
    } else {
      window.scrollTo(0, 0);
    }
  }, [ruleId]);

  if (rulesLoading) {
    return <PMText color="faded">Loading rules...</PMText>;
  }

  if (rulesError) {
    return <PMText color="error">Failed to load rules.</PMText>;
  }

  const selectedRule = rules?.find((rule) => rule.id === ruleId);

  if (!selectedRule) {
    return (
      <PMText color="faded">
        Select a rule from the navigation to view its details.
      </PMText>
    );
  }

  return <RuleDetails standardId={standard.id} rule={selectedRule} />;
}
