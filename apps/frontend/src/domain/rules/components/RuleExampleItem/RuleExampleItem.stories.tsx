import type { Meta, StoryObj } from '@storybook/react';
import { RuleExampleItem } from './RuleExampleItem';
import { ProgrammingLanguage, RuleExample } from '@packmind/shared/types';
import { createRuleExampleId, createRuleId } from '@packmind/standards';

const meta: Meta<typeof RuleExampleItem> = {
  title: 'Rules/RuleExampleItem',
  component: RuleExampleItem,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

const mockRuleExample: RuleExample = {
  id: createRuleExampleId('example-1'),
  ruleId: createRuleId('rule-1'),
  lang: ProgrammingLanguage.JAVASCRIPT,
  positive: `// Use const for variables that won't be reassigned
const userName = 'John Doe';
const isActive = true;

// Use meaningful variable names
const userAccountBalance = 1000;`,
  negative: `// Don't use var for variable declarations
var userName = 'John Doe';
var isActive = true;

// Don't use unclear variable names
var uab = 1000;`,
};

const mockTypeScriptExample: RuleExample = {
  id: createRuleExampleId('example-2'),
  ruleId: createRuleId('rule-2'),
  lang: ProgrammingLanguage.TYPESCRIPT,
  positive: `// Use explicit types for function parameters
function calculateTotal(price: number, tax: number): number {
  return price + (price * tax);
}

// Use interfaces for object shapes
interface User {
  id: string;
  name: string;
  email: string;
}`,
  negative: `// Don't rely on implicit any types
function calculateTotal(price, tax) {
  return price + (price * tax);
}

// Don't use any instead of proper types
interface User {
  id: any;
  name: any;
  email: any;
}`,
};

export const Default: Story = {
  args: {
    example: mockRuleExample,
  },
};

export const TypeScriptExample: Story = {
  args: {
    example: mockTypeScriptExample,
  },
};

export const WithoutActions: Story = {
  args: {
    example: mockRuleExample,
    // No onEdit or onRemove handlers
  },
};
