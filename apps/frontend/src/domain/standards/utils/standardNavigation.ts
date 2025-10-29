export type StaticSectionKey = 'summary' | 'deployment';
export type RuleNavKey = `rule:${string}`;
export type NavKey = StaticSectionKey | RuleNavKey;

export const makeRuleNavKey = (ruleId: string): RuleNavKey => `rule:${ruleId}`;

export const isRuleNavKey = (key: NavKey): key is RuleNavKey =>
  key.startsWith('rule:');

export const extractRuleIdFromNavKey = (key: NavKey): string | undefined =>
  isRuleNavKey(key) ? key.slice('rule:'.length) : undefined;
