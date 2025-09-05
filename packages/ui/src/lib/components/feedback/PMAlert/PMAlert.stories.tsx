import { PMVStack } from '../../layout';
import { PMAlert } from './PMAlert';
export default {
  title: 'Content/PMAlert',
  component: PMAlert,
  parameters: {
    layout: 'centered',
  },
};

export const Default = () => (
  <PMVStack width={'lg'} gap={4}>
    <PMAlert.Root status="info" title="This is the alert title">
      <PMAlert.Indicator />
      <PMAlert.Title>This is the alert title</PMAlert.Title>
    </PMAlert.Root>
    <PMAlert.Root status="success" title="This is the alert title">
      <PMAlert.Indicator />
      <PMAlert.Title>This is the alert title</PMAlert.Title>
    </PMAlert.Root>
    <PMAlert.Root status="warning" title="This is the alert title">
      <PMAlert.Indicator />
      <PMAlert.Title>This is the alert title</PMAlert.Title>
    </PMAlert.Root>
    <PMAlert.Root status="error" title="This is the alert title">
      <PMAlert.Indicator />
      <PMAlert.Title>This is the alert title</PMAlert.Title>
    </PMAlert.Root>
    <PMAlert.Root status="neutral" title="This is the alert title">
      <PMAlert.Indicator />
      <PMAlert.Title>This is the alert title</PMAlert.Title>
    </PMAlert.Root>
  </PMVStack>
);
