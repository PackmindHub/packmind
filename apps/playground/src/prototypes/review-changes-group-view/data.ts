import { StubGroup } from './types';

export const STUB_GROUPS: StubGroup[] = [
  {
    id: 'g1',
    message: 'Add authentication standards',
    author: 'joan',
    createdAt: '2 hours ago',
    artefacts: [
      {
        id: 'a1',
        name: 'Naming conventions',
        artefactType: 'standard',
        proposals: [
          {
            id: 'p1',
            field: 'Rules',
            summary: 'Add rule: "Use camelCase for variable names"',
            status: 'pending',
            type: 'add',
          },
          {
            id: 'p2',
            field: 'Description',
            summary: 'Update description to mention auth context',
            status: 'pending',
            type: 'update',
          },
        ],
      },
      {
        id: 'a2',
        name: 'Error handling',
        artefactType: 'standard',
        proposals: [
          {
            id: 'p3',
            field: 'Rules',
            summary: 'Add rule: "Always wrap async calls in try/catch"',
            status: 'pending',
            type: 'add',
          },
        ],
      },
      {
        id: 'a3',
        name: 'Deploy to staging',
        artefactType: 'command',
        proposals: [
          {
            id: 'p4',
            field: 'Name',
            summary: 'Rename to "Deploy to staging environment"',
            status: 'pending',
            type: 'update',
          },
          {
            id: 'p5',
            field: 'Description',
            summary: 'Update description with auth prerequisites',
            status: 'pending',
            type: 'update',
          },
        ],
      },
    ],
  },
  {
    id: 'g2',
    message: 'Refactor deploy commands',
    author: 'alex',
    createdAt: '1 day ago',
    artefacts: [
      {
        id: 'a4',
        name: 'Deploy to production',
        artefactType: 'command',
        proposals: [
          {
            id: 'p6',
            field: 'Description',
            summary: 'Clarify rollback steps',
            status: 'pending',
            type: 'update',
          },
          {
            id: 'p7',
            field: 'Steps',
            summary: 'Add pre-deployment health check step',
            status: 'pending',
            type: 'add',
          },
        ],
      },
    ],
  },
  {
    id: 'g3',
    message: 'New code review skill',
    author: 'joan',
    createdAt: '3 days ago',
    artefacts: [
      {
        id: 'a5',
        name: 'PR review assistant',
        artefactType: 'skill',
        proposals: [
          {
            id: 'p8',
            field: 'Prompt',
            summary: 'Update prompt with security checklist',
            status: 'pending',
            type: 'update',
            filePath: 'SKILL.md',
          },
          {
            id: 'p9',
            field: 'Files',
            summary: 'Add review-checklist.md template',
            status: 'pending',
            type: 'add',
            filePath: 'templates/review-checklist.md',
          },
          {
            id: 'p10',
            field: 'Metadata',
            summary: 'Update compatibility to include Cursor',
            status: 'pending',
            type: 'update',
            filePath: 'SKILL.md',
          },
          {
            id: 'p11',
            field: 'Description',
            summary: 'Expand description for discoverability',
            status: 'pending',
            type: 'update',
            filePath: 'SKILL.md',
          },
          {
            id: 'p13',
            field: 'Files',
            summary: 'Update security rules configuration',
            status: 'pending',
            type: 'update',
            filePath: 'config/security-rules.json',
          },
          {
            id: 'p14',
            field: 'Files',
            summary: 'Add helper script for lint integration',
            status: 'pending',
            type: 'add',
            filePath: 'scripts/lint-helper.sh',
          },
        ],
      },
      {
        id: 'a6',
        name: 'Testing conventions',
        artefactType: 'standard',
        proposals: [
          {
            id: 'p12',
            field: 'Rules',
            summary: 'Add rule: "Each test file must have a describe block"',
            status: 'pending',
            type: 'add',
          },
        ],
      },
    ],
  },
];
