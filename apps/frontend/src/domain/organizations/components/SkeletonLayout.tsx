import React from 'react';
import {
  PMVerticalNav,
  PMVerticalNavSection,
  PMSkeleton,
  PMHStack,
  PMBox,
} from '@packmind/ui';

export const SkeletonLayout = () => {
  return (
    <PMHStack
      h="100%"
      w="100%"
      alignItems={'stretch'}
      gap={0}
      overflow={'hidden'}
    >
      <PMVerticalNav
        headerNav={
          <PMBox px={4} py={4}>
            <PMSkeleton h={10} w="full" rounded="md" />
          </PMBox>
        }
        footerNav={
          <PMBox px={4} py={4}>
            <PMSkeleton h={12} w="full" rounded="md" />
          </PMBox>
        }
      >
        <PMVerticalNavSection
          navEntries={[
            <PMBox key="1" px={2} py={1}>
              <PMSkeleton h={8} w="full" rounded="sm" />
            </PMBox>,
          ]}
        />
        <PMBox px={4} py={2}>
          <PMSkeleton h={4} w={20} />
        </PMBox>
        <PMVerticalNavSection
          navEntries={[
            <PMBox key="2" px={2} py={1}>
              <PMSkeleton h={8} w="full" rounded="sm" />
            </PMBox>,
            <PMBox key="3" px={2} py={1}>
              <PMSkeleton h={8} w="full" rounded="sm" />
            </PMBox>,
            <PMBox key="4" px={2} py={1}>
              <PMSkeleton h={8} w="full" rounded="sm" />
            </PMBox>,
          ]}
        />
        <PMBox px={4} py={2}>
          <PMSkeleton h={4} w={20} />
        </PMBox>
        <PMVerticalNavSection
          navEntries={[
            <PMBox key="5" px={2} py={1}>
              <PMSkeleton h={8} w="full" rounded="sm" />
            </PMBox>,
            <PMBox key="6" px={2} py={1}>
              <PMSkeleton h={8} w="full" rounded="sm" />
            </PMBox>,
          ]}
        />
      </PMVerticalNav>
      <PMBox flex={'1'} h="100%" overflow={'auto'} p={8}>
        <PMBox maxW="5xl" mx="auto">
          <PMSkeleton h={12} w="40%" mb={8} />
          <PMSkeleton h={64} w="full" rounded="lg" />
        </PMBox>
      </PMBox>
    </PMHStack>
  );
};
