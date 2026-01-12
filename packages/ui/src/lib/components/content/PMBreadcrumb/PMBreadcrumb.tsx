import React from 'react';
import { PMHStack } from '../../layout/PMHStack/PMHStack';
import { PMText } from '../../typography/PMText';
import { PMLink } from '../../typography/PMLink';

interface IPMBreadcrumbProps {
  segments: React.ReactNode[];
  interactive?: boolean;
}

export const PMBreadcrumb: React.FunctionComponent<IPMBreadcrumbProps> = ({
  segments,
  interactive = true,
}) => {
  return (
    <PMHStack gap={2}>
      {segments.map((segment, index) => (
        <React.Fragment key={index}>
          {index > 0 && <PMText color="faded">/</PMText>}
          {interactive ? (
            <PMLink as="span" fontSize="sm">
              {segment}
            </PMLink>
          ) : (
            <PMText fontSize="sm" cursor="default">
              {segment}
            </PMText>
          )}
        </React.Fragment>
      ))}
    </PMHStack>
  );
};
