import React from 'react';
import { PMHStack } from '../../layout/PMHStack/PMHStack';
import { PMText } from '../../typography/PMText';
import { PMLink } from '../../typography/PMLink';

interface IPMBreadcrumbProps {
  segments: React.ReactNode[];
}

export const PMBreadcrumb: React.FunctionComponent<IPMBreadcrumbProps> = ({
  segments,
}) => {
  return (
    <PMHStack gap={2}>
      {segments.map((segment, index) => (
        <React.Fragment key={index}>
          {index > 0 && <PMText color="faded">/</PMText>}
          <PMLink as="span" fontSize="sm">
            {segment}
          </PMLink>
        </React.Fragment>
      ))}
    </PMHStack>
  );
};
