import { useState } from 'react';
import { PMHeading, PMBox, PMHStack, PMNativeSelect } from '@packmind/ui';
import { prototypes } from './prototypes';

export default function App() {
  const [activeIndex, setActiveIndex] = useState(0);
  const ActivePrototype = prototypes[activeIndex].component;

  const selectItems = prototypes.map((proto, index) => ({
    label: proto.name,
    value: String(index),
  }));

  return (
    <PMBox height="100vh" display="flex" flexDirection="column">
      <PMBox
        as="nav"
        paddingX="6"
        paddingY="3"
        borderBottomWidth="1px"
        borderColor="border.tertiary"
      >
        <PMHStack gap="4" align="center">
          <PMHeading size="md">Playground</PMHeading>
          <PMNativeSelect
            items={selectItems}
            value={String(activeIndex)}
            onChange={(e) => setActiveIndex(Number(e.target.value))}
            size="sm"
            width="200px"
          />
        </PMHStack>
      </PMBox>

      <PMBox flex="1" overflow="auto" padding="6">
        <ActivePrototype />
      </PMBox>
    </PMBox>
  );
}
