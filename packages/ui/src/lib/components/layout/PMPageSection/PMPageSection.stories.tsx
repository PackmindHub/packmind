import React from 'react';
import { PMPageSection } from './PMPageSection';
import { PMButton } from '../../form/PMButton/PMButton';

export default {
  title: 'Layout/PMPageSection',
  component: PMPageSection,
  parameters: {
    layout: 'centered',
  },
};

export const Plain = () => (
  <PMPageSection title="Section Plain">
    <div>Content of (plain) section</div>
  </PMPageSection>
);

export const Outline = () => (
  <PMPageSection
    title="Section Outline"
    variant="outline"
    cta={<PMButton variant="outline">Action</PMButton>}
  >
    <div>Content of (outline) section</div>
  </PMPageSection>
);
