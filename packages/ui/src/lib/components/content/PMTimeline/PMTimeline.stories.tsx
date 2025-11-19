import type { Meta, StoryObj } from '@storybook/react';
import {
  PMTimeline,
  PMTimelineItem,
  PMTimelineContent,
  PMTimelineSeparator,
  PMTimelineIndicator,
  PMTimelineConnector,
  PMTimelineTitle,
  PMTimelineDescription,
  PMTimelineTimestamp,
} from './PMTimeline';
import {
  LuCheck,
  LuClock,
  LuRocket,
  LuInfo,
  LuCircleAlert,
} from 'react-icons/lu';

const meta: Meta<typeof PMTimeline> = {
  title: 'Content/PMTimeline',
  component: PMTimeline,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
};
export default meta;

type Story = StoryObj<typeof PMTimeline>;

export const Default: Story = {
  render: () => (
    <div style={{ width: '100%', maxWidth: '600px' }}>
      <PMTimeline>
        <PMTimelineItem>
          <PMTimelineSeparator>
            <PMTimelineIndicator />
            <PMTimelineConnector />
          </PMTimelineSeparator>
          <PMTimelineContent>
            <PMTimelineTitle>Project Kickoff</PMTimelineTitle>
            <PMTimelineDescription>
              Initial planning session and requirements gathering with the team
            </PMTimelineDescription>
          </PMTimelineContent>
        </PMTimelineItem>

        <PMTimelineItem>
          <PMTimelineSeparator>
            <PMTimelineIndicator />
            <PMTimelineConnector />
          </PMTimelineSeparator>
          <PMTimelineContent>
            <PMTimelineTitle>Development Phase</PMTimelineTitle>
            <PMTimelineDescription>
              Core features implementation and testing
            </PMTimelineDescription>
          </PMTimelineContent>
        </PMTimelineItem>

        <PMTimelineItem>
          <PMTimelineSeparator>
            <PMTimelineIndicator />
          </PMTimelineSeparator>
          <PMTimelineContent>
            <PMTimelineTitle>Product Launch</PMTimelineTitle>
            <PMTimelineDescription>
              Successfully deployed to production
            </PMTimelineDescription>
          </PMTimelineContent>
        </PMTimelineItem>
      </PMTimeline>
    </div>
  ),
};

export const OutlineVariant: Story = {
  render: () => (
    <div style={{ width: '100%', maxWidth: '600px' }}>
      <PMTimeline variant="outline">
        <PMTimelineItem>
          <PMTimelineSeparator>
            <PMTimelineIndicator />
            <PMTimelineConnector />
          </PMTimelineSeparator>
          <PMTimelineContent>
            <PMTimelineTitle>Project Started</PMTimelineTitle>
            <PMTimelineDescription>
              Initial project setup and planning phase
            </PMTimelineDescription>
          </PMTimelineContent>
        </PMTimelineItem>

        <PMTimelineItem>
          <PMTimelineSeparator>
            <PMTimelineIndicator />
            <PMTimelineConnector />
          </PMTimelineSeparator>
          <PMTimelineContent>
            <PMTimelineTitle>Development Phase</PMTimelineTitle>
            <PMTimelineDescription>
              Core features implementation
            </PMTimelineDescription>
          </PMTimelineContent>
        </PMTimelineItem>

        <PMTimelineItem>
          <PMTimelineSeparator>
            <PMTimelineIndicator />
          </PMTimelineSeparator>
          <PMTimelineContent>
            <PMTimelineTitle>Launch</PMTimelineTitle>
            <PMTimelineDescription>
              Product release and deployment
            </PMTimelineDescription>
          </PMTimelineContent>
        </PMTimelineItem>
      </PMTimeline>
    </div>
  ),
};

export const TitleOnly: Story = {
  render: () => (
    <div style={{ width: '100%', maxWidth: '600px' }}>
      <PMTimeline>
        <PMTimelineItem>
          <PMTimelineSeparator>
            <PMTimelineIndicator />
            <PMTimelineConnector />
          </PMTimelineSeparator>
          <PMTimelineContent>
            <PMTimelineTitle>Event 1</PMTimelineTitle>
          </PMTimelineContent>
        </PMTimelineItem>

        <PMTimelineItem>
          <PMTimelineSeparator>
            <PMTimelineIndicator />
            <PMTimelineConnector />
          </PMTimelineSeparator>
          <PMTimelineContent>
            <PMTimelineTitle>Event 2</PMTimelineTitle>
          </PMTimelineContent>
        </PMTimelineItem>

        <PMTimelineItem>
          <PMTimelineSeparator>
            <PMTimelineIndicator />
          </PMTimelineSeparator>
          <PMTimelineContent>
            <PMTimelineTitle>Event 3</PMTimelineTitle>
          </PMTimelineContent>
        </PMTimelineItem>
      </PMTimeline>
    </div>
  ),
};

export const WithCustomContent: Story = {
  render: () => (
    <div style={{ width: '100%', maxWidth: '600px' }}>
      <PMTimeline>
        <PMTimelineItem>
          <PMTimelineSeparator>
            <PMTimelineIndicator />
            <PMTimelineConnector />
          </PMTimelineSeparator>
          <PMTimelineContent>
            <PMTimelineTitle>Code Review</PMTimelineTitle>
            <PMTimelineDescription>
              Pull request #123 reviewed and approved
            </PMTimelineDescription>
            <div
              style={{
                marginTop: '8px',
                fontSize: '0.875rem',
                color: 'var(--pm-colors-text-tertiary)',
              }}
            >
              2 hours ago
            </div>
          </PMTimelineContent>
        </PMTimelineItem>

        <PMTimelineItem>
          <PMTimelineSeparator>
            <PMTimelineIndicator />
            <PMTimelineConnector />
          </PMTimelineSeparator>
          <PMTimelineContent>
            <PMTimelineTitle>Deployment</PMTimelineTitle>
            <PMTimelineDescription>
              Successfully deployed to production
            </PMTimelineDescription>
            <div
              style={{
                marginTop: '8px',
                fontSize: '0.875rem',
                color: 'var(--pm-colors-text-tertiary)',
              }}
            >
              1 day ago
            </div>
          </PMTimelineContent>
        </PMTimelineItem>

        <PMTimelineItem>
          <PMTimelineSeparator>
            <PMTimelineIndicator />
          </PMTimelineSeparator>
          <PMTimelineContent>
            <PMTimelineTitle>Release Notes</PMTimelineTitle>
            <PMTimelineDescription>
              Version 2.0.0 release notes published
            </PMTimelineDescription>
            <div
              style={{
                marginTop: '8px',
                fontSize: '0.875rem',
                color: 'var(--pm-colors-text-tertiary)',
              }}
            >
              3 days ago
            </div>
          </PMTimelineContent>
        </PMTimelineItem>
      </PMTimeline>
    </div>
  ),
};

export const SubtleVariant: Story = {
  render: () => (
    <div style={{ width: '100%', maxWidth: '600px' }}>
      <PMTimeline variant="subtle">
        <PMTimelineItem>
          <PMTimelineSeparator>
            <PMTimelineIndicator />
            <PMTimelineConnector />
          </PMTimelineSeparator>
          <PMTimelineContent>
            <PMTimelineTitle>Registration</PMTimelineTitle>
            <PMTimelineDescription>User account created</PMTimelineDescription>
          </PMTimelineContent>
        </PMTimelineItem>

        <PMTimelineItem>
          <PMTimelineSeparator>
            <PMTimelineIndicator />
            <PMTimelineConnector />
          </PMTimelineSeparator>
          <PMTimelineContent>
            <PMTimelineTitle>Email Verification</PMTimelineTitle>
            <PMTimelineDescription>
              Verification email sent
            </PMTimelineDescription>
          </PMTimelineContent>
        </PMTimelineItem>

        <PMTimelineItem>
          <PMTimelineSeparator>
            <PMTimelineIndicator />
          </PMTimelineSeparator>
          <PMTimelineContent>
            <PMTimelineTitle>Onboarding</PMTimelineTitle>
            <PMTimelineDescription>
              Welcome tour completed
            </PMTimelineDescription>
          </PMTimelineContent>
        </PMTimelineItem>
      </PMTimeline>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '32px',
        width: '100%',
        maxWidth: '600px',
      }}
    >
      <div>
        <h3
          style={{
            marginBottom: '16px',
            fontSize: '14px',
            color: 'var(--pm-colors-text-secondary)',
          }}
        >
          Small
        </h3>
        <PMTimeline size="sm">
          <PMTimelineItem>
            <PMTimelineSeparator>
              <PMTimelineIndicator />
              <PMTimelineConnector />
            </PMTimelineSeparator>
            <PMTimelineContent>
              <PMTimelineTitle>Small Item 1</PMTimelineTitle>
              <PMTimelineDescription>
                Description for small item
              </PMTimelineDescription>
            </PMTimelineContent>
          </PMTimelineItem>
          <PMTimelineItem>
            <PMTimelineSeparator>
              <PMTimelineIndicator />
            </PMTimelineSeparator>
            <PMTimelineContent>
              <PMTimelineTitle>Small Item 2</PMTimelineTitle>
              <PMTimelineDescription>
                Description for small item
              </PMTimelineDescription>
            </PMTimelineContent>
          </PMTimelineItem>
        </PMTimeline>
      </div>

      <div>
        <h3
          style={{
            marginBottom: '16px',
            fontSize: '14px',
            color: 'var(--pm-colors-text-secondary)',
          }}
        >
          Large
        </h3>
        <PMTimeline size="lg">
          <PMTimelineItem>
            <PMTimelineSeparator>
              <PMTimelineIndicator />
              <PMTimelineConnector />
            </PMTimelineSeparator>
            <PMTimelineContent>
              <PMTimelineTitle>Large Item 1</PMTimelineTitle>
              <PMTimelineDescription>
                Description for large item
              </PMTimelineDescription>
            </PMTimelineContent>
          </PMTimelineItem>
          <PMTimelineItem>
            <PMTimelineSeparator>
              <PMTimelineIndicator />
            </PMTimelineSeparator>
            <PMTimelineContent>
              <PMTimelineTitle>Large Item 2</PMTimelineTitle>
              <PMTimelineDescription>
                Description for large item
              </PMTimelineDescription>
            </PMTimelineContent>
          </PMTimelineItem>
        </PMTimeline>
      </div>
    </div>
  ),
};

export const WithStatusColors: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '32px',
        width: '100%',
        maxWidth: '600px',
      }}
    >
      <div>
        <h3
          style={{
            marginBottom: '16px',
            fontSize: '14px',
            fontWeight: '600',
            color: 'var(--pm-colors-text-primary)',
          }}
        >
          Success
        </h3>
        <PMTimeline colorPalette="success">
          <PMTimelineItem>
            <PMTimelineSeparator>
              <PMTimelineIndicator />
            </PMTimelineSeparator>
            <PMTimelineContent>
              <PMTimelineTitle>Tests Passed</PMTimelineTitle>
              <PMTimelineDescription>
                All unit tests and integration tests completed successfully
              </PMTimelineDescription>
            </PMTimelineContent>
          </PMTimelineItem>
        </PMTimeline>
      </div>

      <div>
        <h3
          style={{
            marginBottom: '16px',
            fontSize: '14px',
            fontWeight: '600',
            color: 'var(--pm-colors-text-primary)',
          }}
        >
          Info
        </h3>
        <PMTimeline colorPalette="info">
          <PMTimelineItem>
            <PMTimelineSeparator>
              <PMTimelineIndicator />
            </PMTimelineSeparator>
            <PMTimelineContent>
              <PMTimelineTitle>Code Review</PMTimelineTitle>
              <PMTimelineDescription>
                Pull request is awaiting review from team members
              </PMTimelineDescription>
            </PMTimelineContent>
          </PMTimelineItem>
        </PMTimeline>
      </div>

      <div>
        <h3
          style={{
            marginBottom: '16px',
            fontSize: '14px',
            fontWeight: '600',
            color: 'var(--pm-colors-text-primary)',
          }}
        >
          Warning
        </h3>
        <PMTimeline colorPalette="warning">
          <PMTimelineItem>
            <PMTimelineSeparator>
              <PMTimelineIndicator />
            </PMTimelineSeparator>
            <PMTimelineContent>
              <PMTimelineTitle>Performance Warning</PMTimelineTitle>
              <PMTimelineDescription>
                Build time increased by 15%, optimization recommended
              </PMTimelineDescription>
            </PMTimelineContent>
          </PMTimelineItem>
        </PMTimeline>
      </div>

      <div>
        <h3
          style={{
            marginBottom: '16px',
            fontSize: '14px',
            fontWeight: '600',
            color: 'var(--pm-colors-text-primary)',
          }}
        >
          Error
        </h3>
        <PMTimeline colorPalette="error">
          <PMTimelineItem>
            <PMTimelineSeparator>
              <PMTimelineIndicator />
            </PMTimelineSeparator>
            <PMTimelineContent>
              <PMTimelineTitle>Deployment Failed</PMTimelineTitle>
              <PMTimelineDescription>
                Production deployment failed due to missing environment
                variables
              </PMTimelineDescription>
            </PMTimelineContent>
          </PMTimelineItem>
        </PMTimeline>
      </div>

      <div>
        <h3
          style={{
            marginBottom: '16px',
            fontSize: '14px',
            fontWeight: '600',
            color: 'var(--pm-colors-text-primary)',
          }}
        >
          Neutral
        </h3>
        <PMTimeline colorPalette="neutral">
          <PMTimelineItem>
            <PMTimelineSeparator>
              <PMTimelineIndicator />
            </PMTimelineSeparator>
            <PMTimelineContent>
              <PMTimelineTitle>Log Entry</PMTimelineTitle>
              <PMTimelineDescription>
                System checkpoint saved at 14:30 UTC
              </PMTimelineDescription>
            </PMTimelineContent>
          </PMTimelineItem>
        </PMTimeline>
      </div>
    </div>
  ),
};

export const WithIcons: Story = {
  render: () => (
    <div style={{ width: '100%', maxWidth: '600px' }}>
      <PMTimeline colorPalette="success">
        <PMTimelineItem>
          <PMTimelineSeparator>
            <PMTimelineIndicator icon={<LuCheck />} />
            <PMTimelineConnector />
          </PMTimelineSeparator>
          <PMTimelineContent>
            <PMTimelineTitle>Task Completed</PMTimelineTitle>
            <PMTimelineDescription>
              Feature implementation finished and merged
            </PMTimelineDescription>
          </PMTimelineContent>
        </PMTimelineItem>

        <PMTimelineItem>
          <PMTimelineSeparator>
            <PMTimelineIndicator icon={<LuInfo />} />
            <PMTimelineConnector />
          </PMTimelineSeparator>
          <PMTimelineContent>
            <PMTimelineTitle>Documentation Updated</PMTimelineTitle>
            <PMTimelineDescription>
              API documentation has been updated with new endpoints
            </PMTimelineDescription>
          </PMTimelineContent>
        </PMTimelineItem>

        <PMTimelineItem>
          <PMTimelineSeparator>
            <PMTimelineIndicator icon={<LuCircleAlert />} />
            <PMTimelineConnector />
          </PMTimelineSeparator>
          <PMTimelineContent>
            <PMTimelineTitle>Action Required</PMTimelineTitle>
            <PMTimelineDescription>
              Dependencies need to be updated before next release
            </PMTimelineDescription>
          </PMTimelineContent>
        </PMTimelineItem>

        <PMTimelineItem>
          <PMTimelineSeparator>
            <PMTimelineIndicator icon={<LuRocket />} />
          </PMTimelineSeparator>
          <PMTimelineContent>
            <PMTimelineTitle>Deployment Scheduled</PMTimelineTitle>
            <PMTimelineDescription>
              Release v2.0.0 scheduled for tomorrow at 10:00 AM
            </PMTimelineDescription>
          </PMTimelineContent>
        </PMTimelineItem>
      </PMTimeline>
    </div>
  ),
};

export const WithTimestamps: Story = {
  render: () => (
    <div style={{ width: '100%', maxWidth: '600px' }}>
      <PMTimeline>
        <PMTimelineItem>
          <PMTimelineSeparator>
            <PMTimelineIndicator icon={<LuCheck />} />
            <PMTimelineConnector />
          </PMTimelineSeparator>
          <PMTimelineContent>
            <PMTimelineTitle>Issue Resolved</PMTimelineTitle>
            <PMTimelineDescription>
              Bug #4521 has been fixed and deployed
            </PMTimelineDescription>
            <PMTimelineTimestamp>2 hours ago</PMTimelineTimestamp>
          </PMTimelineContent>
        </PMTimelineItem>

        <PMTimelineItem>
          <PMTimelineSeparator>
            <PMTimelineIndicator icon={<LuClock />} />
            <PMTimelineConnector />
          </PMTimelineSeparator>
          <PMTimelineContent>
            <PMTimelineTitle>Sprint Planning</PMTimelineTitle>
            <PMTimelineDescription>
              Team meeting to plan upcoming sprint goals
            </PMTimelineDescription>
            <PMTimelineTimestamp>Yesterday at 2:30 PM</PMTimelineTimestamp>
          </PMTimelineContent>
        </PMTimelineItem>

        <PMTimelineItem>
          <PMTimelineSeparator>
            <PMTimelineIndicator />
          </PMTimelineSeparator>
          <PMTimelineContent>
            <PMTimelineTitle>Repository Created</PMTimelineTitle>
            <PMTimelineDescription>
              Initial project repository setup completed
            </PMTimelineDescription>
            <PMTimelineTimestamp>November 15, 2024</PMTimelineTimestamp>
          </PMTimelineContent>
        </PMTimelineItem>
      </PMTimeline>
    </div>
  ),
};

export const CompleteExample: Story = {
  render: () => (
    <div style={{ width: '100%', maxWidth: '600px' }}>
      <PMTimeline variant="outline" size="lg" colorPalette="primary">
        <PMTimelineItem>
          <PMTimelineSeparator>
            <PMTimelineIndicator icon={<LuCheck />} />
            <PMTimelineConnector />
          </PMTimelineSeparator>
          <PMTimelineContent>
            <PMTimelineTitle>Release v2.0.0 Deployed</PMTimelineTitle>
            <PMTimelineDescription>
              Successfully deployed to production with zero downtime. All health
              checks passing.
            </PMTimelineDescription>
            <PMTimelineTimestamp>Today at 3:45 PM</PMTimelineTimestamp>
          </PMTimelineContent>
        </PMTimelineItem>

        <PMTimelineItem>
          <PMTimelineSeparator>
            <PMTimelineIndicator icon={<LuInfo />} />
            <PMTimelineConnector />
          </PMTimelineSeparator>
          <PMTimelineContent>
            <PMTimelineTitle>Final Testing Completed</PMTimelineTitle>
            <PMTimelineDescription>
              QA team approved all test cases. Performance benchmarks exceeded
              expectations.
            </PMTimelineDescription>
            <PMTimelineTimestamp>Today at 1:20 PM</PMTimelineTimestamp>
          </PMTimelineContent>
        </PMTimelineItem>

        <PMTimelineItem>
          <PMTimelineSeparator>
            <PMTimelineIndicator icon={<LuCircleAlert />} />
            <PMTimelineConnector />
          </PMTimelineSeparator>
          <PMTimelineContent>
            <PMTimelineTitle>Security Audit Note</PMTimelineTitle>
            <PMTimelineDescription>
              Minor security recommendations noted for post-release. No critical
              issues found.
            </PMTimelineDescription>
            <PMTimelineTimestamp>Yesterday at 4:00 PM</PMTimelineTimestamp>
          </PMTimelineContent>
        </PMTimelineItem>

        <PMTimelineItem>
          <PMTimelineSeparator>
            <PMTimelineIndicator icon={<LuRocket />} />
          </PMTimelineSeparator>
          <PMTimelineContent>
            <PMTimelineTitle>Development Started</PMTimelineTitle>
            <PMTimelineDescription>
              Team kickoff meeting and sprint planning session completed
            </PMTimelineDescription>
            <PMTimelineTimestamp>November 1, 2024</PMTimelineTimestamp>
          </PMTimelineContent>
        </PMTimelineItem>
      </PMTimeline>
    </div>
  ),
};
