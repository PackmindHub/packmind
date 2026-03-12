import type { ReactNode } from 'react';

export type NavItem = {
  id: string;
  label: string;
  icon: ReactNode;
};

export type NavSection = {
  heading?: string;
  items: NavItem[];
};

export type Space = {
  id: string;
  name: string;
  color: string;
  icon?: ReactNode;
  sections: NavSection[];
  category?: string;
};

export type JoinableSpace = {
  id: string;
  name: string;
  color: string;
  requiresRequest: boolean;
  category: string;
};
