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
} from './PMTimeline';
import { LuCheck, LuRocket, LuInfo, LuCircleAlert } from 'react-icons/lu';

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
    <div>
      <PMTimeline>
        <PMTimelineItem>
          <PMTimelineConnector>
            <PMTimelineSeparator />
            <PMTimelineIndicator />
          </PMTimelineConnector>
          <PMTimelineContent>
            <PMTimelineTitle>Project Kickoff</PMTimelineTitle>
            <PMTimelineDescription>
              Initial planning session and requirements gathering with the team
            </PMTimelineDescription>
          </PMTimelineContent>
        </PMTimelineItem>

        <PMTimelineItem>
          <PMTimelineConnector>
            <PMTimelineSeparator />
            <PMTimelineIndicator />
          </PMTimelineConnector>
          <PMTimelineContent>
            <PMTimelineTitle>Development Phase</PMTimelineTitle>
            <PMTimelineDescription>
              Core features implementation and testing
            </PMTimelineDescription>
          </PMTimelineContent>
        </PMTimelineItem>

        <PMTimelineItem>
          <PMTimelineConnector>
            <PMTimelineIndicator />
          </PMTimelineConnector>
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
    <div>
      <PMTimeline variant="outline">
        <PMTimelineItem>
          <PMTimelineConnector>
            <PMTimelineSeparator />
            <PMTimelineIndicator />
          </PMTimelineConnector>
          <PMTimelineContent>
            <PMTimelineTitle>Project Started</PMTimelineTitle>
            <PMTimelineDescription>
              Initial project setup and planning phase
            </PMTimelineDescription>
          </PMTimelineContent>
        </PMTimelineItem>

        <PMTimelineItem>
          <PMTimelineConnector>
            <PMTimelineSeparator />
            <PMTimelineIndicator />
          </PMTimelineConnector>
          <PMTimelineContent>
            <PMTimelineTitle>Development Phase</PMTimelineTitle>
            <PMTimelineDescription>
              Core features implementation
            </PMTimelineDescription>
          </PMTimelineContent>
        </PMTimelineItem>

        <PMTimelineItem>
          <PMTimelineConnector>
            <PMTimelineIndicator />
          </PMTimelineConnector>
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
    <div>
      <PMTimeline>
        <PMTimelineItem>
          <PMTimelineConnector>
            <PMTimelineSeparator />
            <PMTimelineIndicator />
          </PMTimelineConnector>
          <PMTimelineContent>
            <PMTimelineTitle>Event 1</PMTimelineTitle>
          </PMTimelineContent>
        </PMTimelineItem>

        <PMTimelineItem>
          <PMTimelineConnector>
            <PMTimelineSeparator />
            <PMTimelineIndicator />
          </PMTimelineConnector>
          <PMTimelineContent>
            <PMTimelineTitle>Event 2</PMTimelineTitle>
          </PMTimelineContent>
        </PMTimelineItem>

        <PMTimelineItem>
          <PMTimelineConnector>
            <PMTimelineIndicator />
          </PMTimelineConnector>
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
    <div>
      <PMTimeline>
        <PMTimelineItem>
          <PMTimelineConnector>
            <PMTimelineSeparator />
            <PMTimelineIndicator />
          </PMTimelineConnector>
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
          <PMTimelineConnector>
            <PMTimelineSeparator />
            <PMTimelineIndicator />
          </PMTimelineConnector>
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
          <PMTimelineConnector>
            <PMTimelineIndicator />
          </PMTimelineConnector>
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
    <div>
      <PMTimeline variant="subtle">
        <PMTimelineItem>
          <PMTimelineConnector>
            <PMTimelineSeparator />
            <PMTimelineIndicator />
          </PMTimelineConnector>
          <PMTimelineContent>
            <PMTimelineTitle>Registration</PMTimelineTitle>
            <PMTimelineDescription>User account created</PMTimelineDescription>
          </PMTimelineContent>
        </PMTimelineItem>

        <PMTimelineItem>
          <PMTimelineConnector>
            <PMTimelineSeparator />
            <PMTimelineIndicator />
          </PMTimelineConnector>
          <PMTimelineContent>
            <PMTimelineTitle>Email Verification</PMTimelineTitle>
            <PMTimelineDescription>
              Verification email sent
            </PMTimelineDescription>
          </PMTimelineContent>
        </PMTimelineItem>

        <PMTimelineItem>
          <PMTimelineConnector>
            <PMTimelineIndicator icon={<LuCheck />} />
          </PMTimelineConnector>
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
    <div>
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
            <PMTimelineConnector>
              <PMTimelineSeparator />
              <PMTimelineIndicator />
            </PMTimelineConnector>
            <PMTimelineContent>
              <PMTimelineTitle>Small Item 1</PMTimelineTitle>
              <PMTimelineDescription>
                Description for small item
              </PMTimelineDescription>
            </PMTimelineContent>
          </PMTimelineItem>
          <PMTimelineItem>
            <PMTimelineConnector>
              <PMTimelineIndicator />
            </PMTimelineConnector>
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
            <PMTimelineConnector>
              <PMTimelineSeparator />
              <PMTimelineIndicator />
            </PMTimelineConnector>
            <PMTimelineContent>
              <PMTimelineTitle>Large Item 1</PMTimelineTitle>
              <PMTimelineDescription>
                Description for large item
              </PMTimelineDescription>
            </PMTimelineContent>
          </PMTimelineItem>
          <PMTimelineItem>
            <PMTimelineConnector>
              <PMTimelineIndicator />
            </PMTimelineConnector>
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

export const WithIcons: Story = {
  render: () => (
    <div>
      <PMTimeline colorPalette="success">
        <PMTimelineItem>
          <PMTimelineConnector>
            <PMTimelineSeparator />
            <PMTimelineIndicator icon={<LuCheck />} />
          </PMTimelineConnector>
          <PMTimelineContent>
            <PMTimelineTitle>Task Completed</PMTimelineTitle>
            <PMTimelineDescription>
              Feature implementation finished and merged
            </PMTimelineDescription>
          </PMTimelineContent>
        </PMTimelineItem>

        <PMTimelineItem>
          <PMTimelineConnector>
            <PMTimelineSeparator />
            <PMTimelineIndicator icon={<LuInfo />} />
          </PMTimelineConnector>
          <PMTimelineContent>
            <PMTimelineTitle>Documentation Updated</PMTimelineTitle>
            <PMTimelineDescription>
              API documentation has been updated with new endpoints
            </PMTimelineDescription>
          </PMTimelineContent>
        </PMTimelineItem>

        <PMTimelineItem>
          <PMTimelineConnector>
            <PMTimelineSeparator />
            <PMTimelineIndicator icon={<LuCircleAlert />} />
          </PMTimelineConnector>
          <PMTimelineContent>
            <PMTimelineTitle>Action Required</PMTimelineTitle>
            <PMTimelineDescription>
              Dependencies need to be updated before next release
            </PMTimelineDescription>
          </PMTimelineContent>
        </PMTimelineItem>

        <PMTimelineItem>
          <PMTimelineConnector>
            <PMTimelineIndicator icon={<LuRocket />} />
          </PMTimelineConnector>
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

export const CompleteExample: Story = {
  render: () => (
    <div>
      <PMTimeline variant="outline" size="lg" colorPalette="primary">
        <PMTimelineItem>
          <PMTimelineConnector>
            <PMTimelineSeparator />
            <PMTimelineIndicator icon={<LuCheck />} />
          </PMTimelineConnector>
          <PMTimelineContent>
            <PMTimelineTitle>Release v2.0.0 Deployed</PMTimelineTitle>
            <PMTimelineDescription>
              Successfully deployed to production with zero downtime. All health
              checks passing.
            </PMTimelineDescription>
          </PMTimelineContent>
        </PMTimelineItem>

        <PMTimelineItem>
          <PMTimelineConnector>
            <PMTimelineSeparator />
            <PMTimelineIndicator icon={<LuInfo />} />
          </PMTimelineConnector>
          <PMTimelineContent>
            <PMTimelineTitle>Final Testing Completed</PMTimelineTitle>
            <PMTimelineDescription>
              QA team approved all test cases. Performance benchmarks exceeded
              expectations.
            </PMTimelineDescription>
          </PMTimelineContent>
        </PMTimelineItem>

        <PMTimelineItem>
          <PMTimelineConnector>
            <PMTimelineSeparator />
            <PMTimelineIndicator icon={<LuCircleAlert />} />
          </PMTimelineConnector>
          <PMTimelineContent>
            <PMTimelineTitle>Security Audit Note</PMTimelineTitle>
            <PMTimelineDescription>
              Minor security recommendations noted for post-release. No critical
              issues found.
            </PMTimelineDescription>
          </PMTimelineContent>
        </PMTimelineItem>

        <PMTimelineItem>
          <PMTimelineConnector>
            <PMTimelineIndicator icon={<LuRocket />} />
          </PMTimelineConnector>
          <PMTimelineContent>
            <PMTimelineTitle>Development Started</PMTimelineTitle>
            <PMTimelineDescription>
              Team kickoff meeting and sprint planning session completed
            </PMTimelineDescription>
          </PMTimelineContent>
        </PMTimelineItem>
      </PMTimeline>
    </div>
  ),
};
