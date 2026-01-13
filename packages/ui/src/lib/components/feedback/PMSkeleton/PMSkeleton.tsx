import { Skeleton, SkeletonProps } from '@chakra-ui/react';
import * as React from 'react';

export type PMSkeletonProps = SkeletonProps;

export const PMSkeleton = React.forwardRef<HTMLDivElement, PMSkeletonProps>(
  (props, ref) => <Skeleton ref={ref} {...props} />,
);

PMSkeleton.displayName = 'PMSkeleton';
