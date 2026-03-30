import { MockStandard } from './types';

export const MOCK_STANDARD: MockStandard = {
  id: 'std-1',
  name: 'Front-end UI and Design Systems',
  description: `This standard establishes guidelines for using Chakra UI v3 through the @packmind/ui design system to ensure consistent UI implementation across the frontend application. The @packmind/ui package provides a mapping of Chakra UI components with the same names and props, enhanced with Packmind-specific theming and semantic tokens. Apply this standard when building or modifying any React components in the frontend application to maintain visual consistency and leverage the centralized design system.`,
  version: 2,
  lastUpdated: '5 months ago',
  packageName: 'frontend-standards',
  rules: [
    {
      id: 'rule-1',
      content:
        'Never use vanilla HTML tags (div, span, button, input, etc.) in frontend component code; always use corresponding @packmind/ui components (PMBox, PMText, PMButton, PMInput, etc.) to ensure consistent styling and theming.',
      linterStatus: 'active',
      languageConfigs: [
        {
          language: 'TypeScript (TSX)',
          linterStatus: 'active',
          detectability: 'success',
          codeExamples: [
            {
              id: 'ex-1a',
              positive: `<PMBox key={props.id} flex="1 1 280px">
  <PMBox border="1px solid" borderColor="border.tertiary" borderRadius="lg" p={4}>
    <PMVStack alignItems="stretch" gap={4}>
      <PMHeading size="sm">{props.title}</PMHeading>
      <PMText color="secondary">{props.description}</PMText>
    </PMVStack>
  </PMBox>
</PMBox>`,
              negative: `<div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
  <span className="title">{props.title}</span>
  <p className="description">{props.description}</p>
</div>`,
            },
          ],
          activeProgram: {
            status: 'active',
            canBeDetected: true,
            programGenerated: true,
            readyToUse: true,
          },
          draftProgram: {
            status: 'draft-ok',
            canBeDetected: true,
            programGenerated: true,
            readyToUse: true,
          },
        },
        {
          language: 'TypeScript',
          linterStatus: 'draft',
          detectability: 'success',
          codeExamples: [
            {
              id: 'ex-1b',
              positive: `import { PMBox } from '@packmind/ui';
const container = <PMBox padding={4}>content</PMBox>;`,
              negative: `const container = document.createElement('div');
container.style.padding = '16px';`,
            },
          ],
          draftProgram: {
            status: 'draft-ok',
            canBeDetected: true,
            programGenerated: true,
            readyToUse: true,
          },
        },
      ],
    },
    {
      id: 'rule-2',
      content:
        "Prefer using the design token 'full' instead of the literal value '100%' for width or height properties in UI components to maintain consistency with the design system token vocabulary.",
      linterStatus: 'draft',
      languageConfigs: [
        {
          language: 'TypeScript (TSX)',
          linterStatus: 'draft',
          detectability: 'success',
          codeExamples: [
            {
              id: 'ex-2',
              positive: `<PMBox width="full" height="full">
  <PMInput width="full" />
</PMBox>`,
              negative: `<PMBox width="100%" height="100%">
  <PMInput width="100%" />
</PMBox>`,
            },
          ],
          draftProgram: {
            status: 'draft-ok',
            canBeDetected: true,
            programGenerated: true,
            readyToUse: true,
          },
        },
      ],
    },
    {
      id: 'rule-3',
      content:
        "Use components imported from '@packmind/ui' instead of importing directly from '@chakra-ui/react' to ensure all UI elements go through the design system abstraction layer.",
      linterStatus: 'active',
      languageConfigs: [
        {
          language: 'TypeScript (TSX)',
          linterStatus: 'active',
          detectability: 'success',
          codeExamples: [
            {
              id: 'ex-3',
              positive: `import { PMBox, PMButton, PMText } from '@packmind/ui';`,
              negative: `import { Box, Button, Text } from '@chakra-ui/react';`,
            },
          ],
          activeProgram: {
            status: 'active',
            canBeDetected: true,
            programGenerated: true,
            readyToUse: true,
          },
        },
      ],
    },
    {
      id: 'rule-4',
      content:
        'Use only semantic tokens to define colors instead of raw color values or Chakra color palette references to ensure theme consistency and dark mode support.',
      linterStatus: 'not-configured',
      languageConfigs: [],
    },
    {
      id: 'rule-5',
      content:
        'Always provide an aria-label or accessible name for interactive elements that lack visible text content, such as icon-only buttons or image links.',
      linterStatus: 'not-configured',
      languageConfigs: [],
    },
    {
      id: 'rule-6',
      content:
        'Use PMVStack and PMHStack for one-dimensional layouts instead of nesting PMBox with flexDirection, to improve readability and reduce boilerplate.',
      linterStatus: 'draft',
      languageConfigs: [
        {
          language: 'TypeScript (TSX)',
          linterStatus: 'draft',
          detectability: 'fail',
          codeExamples: [
            {
              id: 'ex-6',
              positive: `<PMVStack gap={4} align="stretch">
  <PMHeading>Title</PMHeading>
  <PMText>Description</PMText>
</PMVStack>`,
              negative: `<PMBox display="flex" flexDirection="column" gap={4}>
  <PMHeading>Title</PMHeading>
  <PMText>Description</PMText>
</PMBox>`,
            },
          ],
          draftProgram: {
            status: 'draft-fail',
            canBeDetected: false,
            programGenerated: true,
            readyToUse: false,
          },
        },
      ],
    },
    {
      id: 'rule-7',
      content:
        "Avoid using inline styles via the 'style' prop; prefer Chakra UI style props for consistency and to benefit from responsive design utilities and theme integration.",
      linterStatus: 'active',
      languageConfigs: [
        {
          language: 'TypeScript (TSX)',
          linterStatus: 'active',
          detectability: 'success',
          codeExamples: [
            {
              id: 'ex-7',
              positive: `<PMBox padding={4} marginBottom={2} backgroundColor="background.secondary" borderRadius="md">
  Content
</PMBox>`,
              negative: `<PMBox style={{ padding: '16px', marginBottom: '8px', backgroundColor: '#f5f5f5' }}>
  Content
</PMBox>`,
            },
          ],
          activeProgram: {
            status: 'active',
            canBeDetected: true,
            programGenerated: true,
            readyToUse: true,
          },
        },
      ],
    },
    {
      id: 'rule-8',
      content:
        'Group related form fields using PMFormContainer with proper labels and helper text to ensure consistent form layouts and accessibility.',
      linterStatus: 'not-configured',
      languageConfigs: [],
    },
  ],
};
