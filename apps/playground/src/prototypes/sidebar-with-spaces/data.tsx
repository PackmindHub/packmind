import {
  LuBookCheck,
  LuTerminal,
  LuWandSparkles,
  LuPackage,
  LuEye,
  LuHouse,
  LuGitPullRequestArrow,
} from 'react-icons/lu';

import type { NavSection, Space, JoinableSpace } from './types';

export const SPACE_CATEGORIES = [
  'Engineering',
  'Product & Design',
  'Operations',
] as const;

const spaceContent: NavSection[] = [
  {
    items: [{ id: 'dashboard', label: 'Dashboard', icon: <LuHouse /> }],
  },
  {
    heading: 'Playbook',
    items: [
      { id: 'standards', label: 'Standards', icon: <LuBookCheck /> },
      { id: 'commands', label: 'Commands', icon: <LuTerminal /> },
      { id: 'skills', label: 'Skills', icon: <LuWandSparkles /> },
      {
        id: 'review-changes',
        label: 'Review Changes',
        icon: <LuGitPullRequestArrow />,
      },
    ],
  },
  {
    heading: 'Distribution',
    items: [
      { id: 'packages', label: 'Packages', icon: <LuPackage /> },
      { id: 'overview', label: 'Overview', icon: <LuEye /> },
    ],
  },
];

export const spaces: Space[] = [
  {
    id: 'default',
    name: 'Acme Company',
    color: '#60a5fa',
    sections: spaceContent,
    category: 'Operations',
  },
  {
    id: 'frontend',
    name: 'Frontend team',
    color: '#34d399',
    sections: spaceContent,
    category: 'Engineering',
  },
  {
    id: 'security',
    name: 'Security',
    color: '#f97316',
    sections: spaceContent,
    category: 'Operations',
  },
  {
    id: 'backend',
    name: 'Backend guild',
    color: '#f472b6',
    sections: spaceContent,
    category: 'Engineering',
  },
  {
    id: 'platform',
    name: 'Platform',
    color: '#a78bfa',
    sections: spaceContent,
    category: 'Engineering',
  },
  {
    id: 'mobile',
    name: 'Mobile squad',
    color: '#818cf8',
    sections: spaceContent,
    category: 'Engineering',
  },
  {
    id: 'data',
    name: 'Data engineering',
    color: '#4ade80',
    sections: spaceContent,
    category: 'Engineering',
  },
  {
    id: 'devops',
    name: 'DevOps',
    color: '#fb923c',
    sections: spaceContent,
    category: 'Operations',
  },
  {
    id: 'design',
    name: 'Design system',
    color: '#f9a8d4',
    sections: spaceContent,
    category: 'Product & Design',
  },
  {
    id: 'qa',
    name: 'QA & Testing',
    color: '#fbbf24',
    sections: spaceContent,
    category: 'Operations',
  },
  {
    id: 'infra',
    name: 'Infrastructure',
    color: '#67e8f9',
    sections: spaceContent,
    category: 'Operations',
  },
  {
    id: 'ml',
    name: 'Machine Learning',
    color: '#c084fc',
    sections: spaceContent,
    category: 'Engineering',
  },
];

export const joinableSpaces: JoinableSpace[] = [
  {
    id: 'j-arch',
    name: 'Architecture guild',
    color: '#60a5fa',
    requiresRequest: true,
    category: 'Engineering',
  },
  {
    id: 'j-perf',
    name: 'Performance',
    color: '#34d399',
    requiresRequest: false,
    category: 'Engineering',
  },
  {
    id: 'j-a11y',
    name: 'Accessibility',
    color: '#818cf8',
    requiresRequest: false,
    category: 'Engineering',
  },
  {
    id: 'j-api',
    name: 'API design',
    color: '#f472b6',
    requiresRequest: true,
    category: 'Engineering',
  },
  {
    id: 'j-ux',
    name: 'UX research',
    color: '#f9a8d4',
    requiresRequest: false,
    category: 'Product & Design',
  },
  {
    id: 'j-brand',
    name: 'Brand guidelines',
    color: '#a78bfa',
    requiresRequest: false,
    category: 'Product & Design',
  },
  {
    id: 'j-growth',
    name: 'Growth team',
    color: '#fbbf24',
    requiresRequest: true,
    category: 'Product & Design',
  },
  {
    id: 'j-sre',
    name: 'SRE',
    color: '#fb923c',
    requiresRequest: true,
    category: 'Operations',
  },
  {
    id: 'j-incident',
    name: 'Incident response',
    color: '#f97316',
    requiresRequest: true,
    category: 'Operations',
  },
  {
    id: 'j-comply',
    name: 'Compliance',
    color: '#67e8f9',
    requiresRequest: false,
    category: 'Operations',
  },
];
