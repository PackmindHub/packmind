import { TextExtractor } from './TextExtractor';
import { standardVersionFactory } from '@packmind/standards/test';
import { recipeVersionFactory } from '@packmind/recipes/test';
import { createRuleId } from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';

describe('TextExtractor', () => {
  describe('extractStandardText', () => {
    it('extracts and combines name, description, and rules content', () => {
      const standardVersion = standardVersionFactory({
        name: 'Test Standard',
        description: 'This is a test description',
        rules: [
          {
            id: createRuleId(uuidv4()),
            content: 'Rule one content',
            standardVersionId: standardVersionFactory().id,
          },
          {
            id: createRuleId(uuidv4()),
            content: 'Rule two content',
            standardVersionId: standardVersionFactory().id,
          },
        ],
      });

      const result = TextExtractor.extractStandardText(standardVersion);

      expect(result).toContain('Test Standard');
      expect(result).toContain('This is a test description');
      expect(result).toContain('Rule one content');
      expect(result).toContain('Rule two content');
    });

    it('strips markdown from combined text', () => {
      const standardVersion = standardVersionFactory({
        name: '**Bold Standard Name**',
        description:
          'Description with `inline code` and [link](https://example.com)',
        rules: [
          {
            id: createRuleId(uuidv4()),
            content: '# Header\n\n- List item 1\n- List item 2',
            standardVersionId: standardVersionFactory().id,
          },
        ],
      });

      const result = TextExtractor.extractStandardText(standardVersion);

      expect(result).toContain('Bold Standard Name');
      expect(result).toContain('inline code');
      expect(result).toContain('link');
      expect(result).toContain('List item 1');
      expect(result).toContain('List item 2');
      expect(result).not.toContain('**');
      expect(result).not.toContain('`');
      expect(result).not.toContain('[');
      expect(result).not.toContain(']');
      expect(result).not.toContain('#');
      expect(result).not.toContain('-');
    });

    it('handles standard with no rules', () => {
      const standardVersion = standardVersionFactory({
        name: 'Simple Standard',
        description: 'Just a description',
        rules: [],
      });

      const result = TextExtractor.extractStandardText(standardVersion);

      expect(result).toBe('Simple Standard Just a description');
    });

    it('handles standard with undefined rules', () => {
      const standardVersion = standardVersionFactory({
        name: 'Standard Name',
        description: 'Standard Description',
        rules: undefined,
      });

      const result = TextExtractor.extractStandardText(standardVersion);

      expect(result).toBe('Standard Name Standard Description');
    });

    it('normalizes whitespace in output', () => {
      const standardVersion = standardVersionFactory({
        name: 'Name\n\nwith\n\n\nnewlines',
        description: 'Description   with    multiple    spaces',
        rules: [],
      });

      const result = TextExtractor.extractStandardText(standardVersion);

      expect(result).not.toContain('\n\n');
      expect(result).not.toContain('  ');
      expect(result).toMatch(
        /^Name with newlines Description with multiple spaces$/,
      );
    });

    it('removes code blocks from text', () => {
      const standardVersion = standardVersionFactory({
        name: 'Standard',
        description:
          'Use this pattern:\n```typescript\nconst x = 1;\n```\nIt works well.',
        rules: [],
      });

      const result = TextExtractor.extractStandardText(standardVersion);

      expect(result).not.toContain('```');
      expect(result).not.toContain('const x = 1;');
      expect(result).toContain('Use this pattern:');
      expect(result).toContain('It works well.');
    });
  });

  describe('extractRecipeText', () => {
    it('extracts and combines name and content', () => {
      const recipeVersion = recipeVersionFactory({
        name: 'Test Recipe',
        content: 'This is the recipe content with instructions.',
      });

      const result = TextExtractor.extractRecipeText(recipeVersion);

      expect(result).toContain('Test Recipe');
      expect(result).toContain('This is the recipe content with instructions.');
    });

    it('strips markdown from combined text', () => {
      const recipeVersion = recipeVersionFactory({
        name: '**Recipe with Markdown**',
        content: `# How to Do Something

## Step 1
Do this *important* thing

## Step 2
Then do **that** thing

- Point one
- Point two

[Read more](https://example.com)`,
      });

      const result = TextExtractor.extractRecipeText(recipeVersion);

      expect(result).toContain('Recipe with Markdown');
      expect(result).toContain('How to Do Something');
      expect(result).toContain('Step 1');
      expect(result).toContain('Step 2');
      expect(result).toContain('important');
      expect(result).toContain('that');
      expect(result).toContain('Point one');
      expect(result).toContain('Point two');
      expect(result).toContain('Read more');
      expect(result).not.toContain('**');
      expect(result).not.toContain('*');
      expect(result).not.toContain('#');
      expect(result).not.toContain('[');
      expect(result).not.toContain(']');
      expect(result).not.toContain('- ');
    });

    it('removes images from text', () => {
      const recipeVersion = recipeVersionFactory({
        name: 'Recipe',
        content:
          'Here is a diagram: ![Diagram description](https://example.com/image.png) explaining the flow.',
      });

      const result = TextExtractor.extractRecipeText(recipeVersion);

      expect(result).toContain('Diagram description');
      expect(result).not.toContain('![');
      expect(result).not.toContain('](');
    });

    it('removes blockquotes from text', () => {
      const recipeVersion = recipeVersionFactory({
        name: 'Recipe',
        content:
          '> This is a quote\n> With multiple lines\n\nNormal text here.',
      });

      const result = TextExtractor.extractRecipeText(recipeVersion);

      expect(result).toContain('This is a quote');
      expect(result).toContain('With multiple lines');
      expect(result).toContain('Normal text here.');
      expect(result).not.toContain('>');
    });

    it('removes horizontal rules from text', () => {
      const recipeVersion = recipeVersionFactory({
        name: 'Recipe',
        content: 'Section one\n\n---\n\nSection two',
      });

      const result = TextExtractor.extractRecipeText(recipeVersion);

      expect(result).toContain('Section one');
      expect(result).toContain('Section two');
      expect(result).not.toContain('---');
    });

    it('normalizes whitespace in output', () => {
      const recipeVersion = recipeVersionFactory({
        name: 'Recipe\n\n\nwith\nnewlines',
        content: 'Content   with    lots     of      spaces',
      });

      const result = TextExtractor.extractRecipeText(recipeVersion);

      expect(result).not.toContain('\n\n');
      expect(result).not.toContain('  ');
      expect(result).toMatch(
        /Recipe with newlines Content with lots of spaces/,
      );
    });

    it('removes numbered lists from text', () => {
      const recipeVersion = recipeVersionFactory({
        name: 'Recipe',
        content: '1. First step\n2. Second step\n3. Third step',
      });

      const result = TextExtractor.extractRecipeText(recipeVersion);

      expect(result).toContain('First step');
      expect(result).toContain('Second step');
      expect(result).toContain('Third step');
      expect(result).not.toMatch(/\d+\./);
    });

    it('handles empty content gracefully', () => {
      const recipeVersion = recipeVersionFactory({
        name: 'Empty Recipe',
        content: '',
      });

      const result = TextExtractor.extractRecipeText(recipeVersion);

      expect(result).toBe('Empty Recipe');
    });
  });
});
